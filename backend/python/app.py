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
from pymodbus.exceptions import ModbusIOException

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


@app.post("/control/poll/{ip}")
async def poll_now(ip: str):
    """
    Re-reads one station on demand and returns its fresh reachability.

    The scheduled sweep runs every POLL_INTERVAL_SECONDS, so without this the
    admin list keeps showing the last swept state — a station restarted seconds
    ago still reads "En ligne" until the next sweep comes round.
    """
    site = await store.find_site_by_ip(ip)
    if site is None:
        raise HTTPException(status_code=404, detail=f"Station inconnue : {ip}")

    await poller.poll_now(site)

    fresh = await store.site_status(site["_id"])
    return {"success": True, **fresh}


@app.post("/control/reload/{ip}")
async def reload_controller(ip: str):
    """
    Pulses the restart coil on a controller.

    A controller normally reboots before it can acknowledge the write, so the
    write times out even though the command landed. That is reported as success.

    The two cases are told apart by where the failure happened, not by matching
    an error string as v1 did:

      * the connection itself failed  → the device is unreachable → 502;
      * connected, then no reply      → the reset took effect     → success.

    ModbusIOException is what pymodbus raises for the second case. It derives
    from ModbusException, *not* from IOError, so an `except IOError` never sees
    it — which is why every restart was reported as a failure.
    """
    try:
        await get_pool().write_coil(ip, config.MODBUS_RESET_COIL, True)
    except ConnectionError as exc:
        # Raised by the pool when the socket could not be established.
        log.warning("Restart failed for %s — device unreachable: %s", ip, exc)
        raise HTTPException(status_code=502, detail=f"Station injoignable : {ip}")
    except (ModbusIOException, asyncio.TimeoutError) as exc:
        log.info("Restart of %s was not acknowledged (%s) — reset assumed", ip, exc)
        return {
            "success": True,
            "message": (
                f"Contrôleur de charge redémarré ({ip}). "
                "Le module réseau reste actif — la station continue de répondre au ping."
            ),
        }
    except Exception as exc:
        log.exception("Restart failed for %s", ip)
        raise HTTPException(status_code=502, detail=str(exc))

    return {
        "success": True,
        "message": (
            f"Contrôleur de charge redémarré ({ip}). "
            "Le module réseau reste actif — la station continue de répondre au ping."
        ),
    }


@app.post("/control/refresh/{ip}")
async def refresh_controller(ip: str):
    """
    Re-applies the controller's network configuration.

    Two steps, because the device's own page cannot complete the second one:
    its NetworkSave() writes the settings and then resets via
    `MBJSCoilWrite(MBP, MBID, 255, …)`, which throws "Error writing coil" and
    aborts before reaching the EMC-1 reset. The settings were saved but the
    device never restarted, so the change never took effect.

    So the page is used only to write the settings, and the reset is issued
    over Modbus directly — the same coil the restart action uses.
    """
    try:
        dialogs = await browser.click_save_network(ip)
    except Exception as exc:
        log.warning("Refresh failed for %s: %s", ip, exc)
        raise HTTPException(status_code=502, detail=str(exc))

    # The page always fails its own reset step on this firmware: it writes coil
    # 4351 on unit 10, which the device answers with "illegal data address", and
    # the exception aborts NetworkSave() before the reboot. The settings are
    # written before that point, so the save itself is sound — only the restart
    # is missing, and network settings do not take effect without one.
    page_error = next((m for m in dialogs if "error" in m.lower()), None)
    if page_error:
        log.info(
            "%s saved its settings but could not self-reset (%s) — resetting over Modbus",
            ip, page_error.replace("\n", " ")[:80],
        )

    # So issue the reset ourselves, over the same coil the restart action uses.
    try:
        await get_pool().write_coil(ip, config.MODBUS_RESET_COIL, True)
    except ConnectionError as exc:
        log.warning("Settings saved on %s but the reset could not be sent: %s", ip, exc)
        raise HTTPException(
            status_code=502,
            detail=(
                f"Configuration enregistrée sur {ip}, mais le redémarrage a échoué. "
                "Redémarrez la station pour appliquer les changements."
            ),
        )
    except (ModbusIOException, asyncio.TimeoutError):
        pass  # The station reboots before acknowledging; that is the normal case.

    return {
        "success": True,
        "message": f"Configuration réseau enregistrée et station {ip} redémarrée",
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail},
    )
