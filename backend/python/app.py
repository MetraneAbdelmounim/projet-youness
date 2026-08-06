"""
Device-facing service.

Responsibilities:
  * run the background poller that keeps MongoDB current;
  * expose the two control actions an operator waits on (restart, refresh).

Read endpoints are deliberately absent — telemetry is served by the Node API
straight from MongoDB, so a page render no longer reaches a device at all.
"""

import asyncio
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

import browser
import config
import store
from modbus_pool import get_pool
from poller import poller

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
)
log = logging.getLogger("mppt-service")

if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


@asynccontextmanager
async def lifespan(_: FastAPI):
    await store.connect()
    await poller.start()
    log.info(
        "Poller started — sweeping every %ss with %s concurrent devices",
        config.POLL_INTERVAL_SECONDS,
        config.POLL_CONCURRENCY,
    )
    try:
        yield
    finally:
        await poller.stop()
        await browser.close()
        await store.close()
        log.info("Shutdown complete")


app = FastAPI(title="MPPT polling service", version="2.0.0", lifespan=lifespan)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "db": store.is_connected(),
        "lastSweepSeconds": poller.last_sweep_duration,
        "stations": poller.last_sweep_sites,
    }


@app.post("/control/reload/{ip}")
async def reload_controller(ip: str):
    """
    Pulses the restart coil on a controller.

    A device commonly resets before it can acknowledge the write, so a timeout
    after the request has gone out is reported as success — but only for
    timeouts, rather than the previous check against an error string.
    """
    try:
        await get_pool().write_coil(ip, config.MODBUS_RESET_COIL, True)
    except (asyncio.TimeoutError, IOError, ConnectionError) as exc:
        log.info("Restart of %s did not acknowledge (%s) — treating as sent", ip, exc)
        return {
            "success": True,
            "message": f"Commande de redémarrage envoyée à {ip}",
        }
    except Exception as exc:
        log.exception("Restart failed for %s", ip)
        raise HTTPException(status_code=502, detail=str(exc))

    return {"success": True, "message": f"Commande de redémarrage envoyée à {ip}"}


@app.post("/control/refresh/{ip}")
async def refresh_controller(ip: str):
    """Presses Save on the controller's network page."""
    try:
        await browser.click_save_network(ip)
    except Exception as exc:
        log.warning("Refresh failed for %s: %s", ip, exc)
        raise HTTPException(status_code=502, detail=str(exc))

    return {"success": True, "message": f"Configuration réseau enregistrée sur {ip}"}


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail},
    )
