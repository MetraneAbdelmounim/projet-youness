"""Background sweep that keeps the datastore current."""

import asyncio
import logging
from typing import Optional

import aiohttp

import analysis as analysis_mod
import config
import ping
import store
import weather
from modbus_pool import get_pool
from mppt import MpptReading

log = logging.getLogger(__name__)


class Poller:
    """
    Periodically reads every device and writes the result to MongoDB.

    This inverts the previous design, where the browser triggered a live Modbus
    read through Node on every render. Device I/O now happens on a fixed
    schedule regardless of how many people are watching, so read latency is
    decoupled from page load, one unreachable device no longer blocks the rest,
    and history accumulates instead of being overwritten.
    """

    def __init__(self) -> None:
        self._task: Optional[asyncio.Task] = None
        self._session: Optional[aiohttp.ClientSession] = None
        self._stopping = asyncio.Event()
        self.last_sweep_duration: Optional[float] = None
        self.last_sweep_sites: int = 0

    async def start(self) -> None:
        self._session = aiohttp.ClientSession()
        self._task = asyncio.create_task(self._run(), name="poller")

    async def stop(self) -> None:
        self._stopping.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._session:
            await self._session.close()
        await get_pool().close()

    async def _run(self) -> None:
        while not self._stopping.is_set():
            started = asyncio.get_running_loop().time()
            try:
                await self.sweep()
            except Exception:
                # A failed sweep must never end the loop.
                log.exception("Poll sweep failed")

            self.last_sweep_duration = asyncio.get_running_loop().time() - started
            log.info(
                "Sweep finished in %.1fs (%d stations)",
                self.last_sweep_duration,
                self.last_sweep_sites,
            )

            await get_pool().prune_idle()

            # Sleep for the remainder of the interval so a slow sweep does not
            # compound into an ever-later schedule.
            delay = max(0.0, config.POLL_INTERVAL_SECONDS - self.last_sweep_duration)
            try:
                await asyncio.wait_for(self._stopping.wait(), timeout=delay)
            except asyncio.TimeoutError:
                pass

    async def sweep(self) -> None:
        sites = await store.list_sites()
        self.last_sweep_sites = len(sites)

        semaphore = asyncio.Semaphore(config.POLL_CONCURRENCY)

        async def guarded(coro_factory):
            async with semaphore:
                return await coro_factory()

        tasks = [guarded(lambda s=site: self._poll_site(s)) for site in sites]

        for collection in ("modems", "panneaus"):
            devices = await store.list_simple_devices(collection)
            tasks += [
                guarded(lambda d=device, c=collection: self._poll_simple(c, d))
                for device in devices
            ]

        # return_exceptions keeps one failing device from cancelling the sweep.
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _poll_site(self, site: dict) -> None:
        ip = site.get("ip")
        if not ip:
            return

        reachable = await ping.is_alive(ip)
        reading_dict = None
        analysis_result = None
        error = None

        if reachable:
            try:
                registers = await get_pool().read_holding_registers(
                    ip, config.MODBUS_REGISTER_COUNT
                )
                reading = MpptReading.from_registers(registers)
                reading_dict = reading.as_dict()
                analysis_result = await self._analyse(site, reading)
            except Exception as exc:
                error = str(exc)
                log.warning("Modbus read failed for %s (%s): %s", site.get("nom"), ip, exc)
        else:
            error = "Host unreachable"

        if analysis_result is None:
            analysis_result = analysis_mod.unknown(
                site.get("Battery_Type"),
                (reading_dict or {}).get("Battery_Voltage"),
            )

        await store.save_site_poll(
            site_id=site["_id"],
            project_id=site.get("project"),
            reachable=reachable,
            reading=reading_dict,
            analysis=analysis_result,
            error=error,
        )

    async def _analyse(self, site: dict, reading: MpptReading) -> Optional[dict]:
        lat = site.get("latitude") or config.DEFAULT_LAT
        lon = site.get("longitude") or config.DEFAULT_LON

        forecast = await weather.get(self._session, lat, lon)
        if forecast is None:
            return None

        return analysis_mod.compute(reading, forecast, site.get("Battery_Type"))

    async def _poll_simple(self, collection: str, device: dict) -> None:
        ip = device.get("ip")
        if not ip:
            return
        await store.save_device_status(collection, device["_id"], await ping.is_alive(ip))


poller = Poller()
