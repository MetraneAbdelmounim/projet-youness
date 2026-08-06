"""ICMP reachability via the system ping binary."""

import asyncio
import sys

import config


def _command(host: str) -> list:
    if sys.platform.startswith("win"):
        return ["ping", "-n", "1", "-w", str(config.PING_TIMEOUT_SECONDS * 1000), host]
    return ["ping", "-c", "1", "-W", str(config.PING_TIMEOUT_SECONDS), host]


async def is_alive(host: str) -> bool:
    """
    Sends a single echo request and reports whether it was answered.

    Shelling out avoids the raw-socket privileges an in-process ICMP library
    would need in a container, and the subprocess is killed on timeout so a
    black-holed address cannot stall the sweep.
    """
    try:
        process = await asyncio.create_subprocess_exec(
            *_command(host),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
    except (OSError, FileNotFoundError):
        return False

    try:
        await asyncio.wait_for(process.wait(), timeout=config.PING_TIMEOUT_SECONDS + 2)
    except asyncio.TimeoutError:
        try:
            process.kill()
        except ProcessLookupError:
            pass
        return False

    return process.returncode == 0
