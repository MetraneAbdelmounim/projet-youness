"""ICMP reachability via the system ping binary."""

import asyncio
import ipaddress
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


def _is_echo_reply(output: str, host: str) -> bool:
    """
    Whether the output contains a genuine echo reply *from the target*.

    The exit code alone cannot be trusted. Windows `ping` exits 0 whenever any
    ICMP message comes back, including one from an intermediate router:

        Reply from 81.192.249.106: TTL expired in transit.   -> exit 0

    That is a routing failure, not a reachable station, and taking the exit
    code at face value reported unreachable stations as online.

    Only a real echo reply carries the remaining TTL as "TTL=<n>" (Windows) or
    "ttl=<n>" (Linux); the error replies spell it "TTL expired" or omit it. The
    line must also name the host we asked for, so a router answering on its own
    behalf cannot pass.
    """
    try:
        # Hostnames resolve to an address that will not appear verbatim in the
        # reply, so only an address literal can be matched against the output.
        ipaddress.ip_address(host)
        match_host = True
    except ValueError:
        match_host = False

    needle = host.lower()
    for line in output.lower().splitlines():
        if "ttl=" not in line.replace("ttl =", "ttl="):
            continue
        if not match_host or needle in line:
            return True
    return False


def _probe(host: str) -> bool:
    """Blocking probe, run off the event loop by `is_alive`."""
    try:
        completed = subprocess.run(
            _command(host),
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=config.PING_TIMEOUT_SECONDS + 2,
            creationflags=_NO_WINDOW,
        )
    except (subprocess.TimeoutExpired, OSError, ValueError):
        return False

    if completed.returncode != 0:
        return False

    # The console encoding varies by locale; only ASCII patterns are matched,
    # so undecodable accented words are harmless.
    output = (completed.stdout or b"").decode("utf-8", errors="replace")
    return _is_echo_reply(output, host)


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
