"""ICMP reachability via the system ping binary."""

import asyncio
import subprocess
import sys

import config

_IS_WINDOWS = sys.platform.startswith("win")

# Keeps a console window from flashing for every probe on Windows.
_NO_WINDOW = 0x08000000 if _IS_WINDOWS else 0


def _command(host: str) -> list:
    if _IS_WINDOWS:
        return ["ping", "-n", "1", "-w", str(config.PING_TIMEOUT_SECONDS * 1000), host]
    return ["ping", "-c", "1", "-W", str(config.PING_TIMEOUT_SECONDS), host]


def _probe(host: str) -> bool:
    """Blocking probe, run off the event loop by `is_alive`."""
    try:
        completed = subprocess.run(
            _command(host),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=config.PING_TIMEOUT_SECONDS + 2,
            creationflags=_NO_WINDOW,
        )
        return completed.returncode == 0
    except (subprocess.TimeoutExpired, OSError, ValueError):
        return False


async def is_alive(host: str) -> bool:
    """
    Reports whether a single echo request is answered.

    Runs the probe in a worker thread rather than through
    `asyncio.create_subprocess_exec`. That call raises NotImplementedError on
    Windows whenever the loop is a SelectorEventLoop — which is what uvicorn
    installs there — and NotImplementedError is not an OSError, so it escaped
    the handler and made every sweep fail silently: the log read
    "Sweep finished in 0.0s (26 stations)" while nothing had been polled.

    A thread sidesteps the event-loop policy entirely and behaves identically on
    Windows and Linux.
    """
    try:
        return await asyncio.to_thread(_probe, host)
    except Exception:
        return False
