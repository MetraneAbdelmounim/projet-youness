"""Pooled Modbus TCP connections, one per device address."""

import asyncio
import logging
import time
from typing import Dict, List, Optional

from pymodbus.client import AsyncModbusTcpClient

import config

log = logging.getLogger(__name__)


class _Entry:
    __slots__ = ("client", "lock", "last_used")

    def __init__(self, client: AsyncModbusTcpClient):
        self.client = client
        self.lock = asyncio.Lock()
        self.last_used = time.monotonic()


class ModbusPool:
    """
    Keeps one long-lived client per host and serialises access to it.

    Every request used to build a fresh client, call ``connect()`` and never
    close it, which leaked a socket per read. Reusing a connection also removes
    the TCP handshake from each poll — the dominant cost when reading a handful
    of registers over a slow link.
    """

    def __init__(self) -> None:
        self._entries: Dict[str, _Entry] = {}
        self._guard = asyncio.Lock()

    async def _entry(self, host: str) -> _Entry:
        async with self._guard:
            entry = self._entries.get(host)
            if entry is None:
                entry = _Entry(
                    AsyncModbusTcpClient(
                        host=host,
                        port=config.MODBUS_PORT,
                        timeout=config.MODBUS_TIMEOUT,
                        retries=1,
                    )
                )
                self._entries[host] = entry
            return entry

    async def _ensure_connected(self, entry: _Entry) -> None:
        if not entry.client.connected:
            await entry.client.connect()
            if not entry.client.connected:
                raise ConnectionError("Modbus connection refused or timed out")

    async def read_holding_registers(self, host: str, count: int) -> List[int]:
        entry = await self._entry(host)
        async with entry.lock:
            entry.last_used = time.monotonic()
            try:
                await self._ensure_connected(entry)
                result = await entry.client.read_holding_registers(
                    address=0, count=count, slave=config.MODBUS_UNIT_ID
                )
            except Exception:
                # Drop the connection so the next attempt starts clean rather
                # than reusing a half-open socket.
                entry.client.close()
                raise

            if result is None or result.isError() or not hasattr(result, "registers"):
                entry.client.close()
                raise IOError(f"Modbus read failed: {result}")

            return list(result.registers)

    async def write_coil(self, host: str, address: int, value: bool) -> None:
        entry = await self._entry(host)
        async with entry.lock:
            entry.last_used = time.monotonic()
            try:
                await self._ensure_connected(entry)
                await entry.client.write_coil(
                    address=address, value=value, slave=config.MODBUS_UNIT_ID
                )
            except Exception:
                entry.client.close()
                raise

    async def prune_idle(self) -> None:
        """Closes connections unused for longer than the idle timeout."""
        now = time.monotonic()
        async with self._guard:
            for host, entry in list(self._entries.items()):
                if now - entry.last_used <= config.MODBUS_IDLE_TIMEOUT:
                    continue
                if entry.lock.locked():
                    continue
                entry.client.close()
                del self._entries[host]
                log.debug("Closed idle Modbus connection to %s", host)

    async def close(self) -> None:
        async with self._guard:
            for entry in self._entries.values():
                entry.client.close()
            self._entries.clear()


pool: Optional[ModbusPool] = None


def get_pool() -> ModbusPool:
    global pool
    if pool is None:
        pool = ModbusPool()
    return pool
