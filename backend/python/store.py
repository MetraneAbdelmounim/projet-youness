"""MongoDB access for the polling service."""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorClient

import config

log = logging.getLogger(__name__)

_client: Optional[AsyncIOMotorClient] = None
_db = None

READINGS = "readings"


async def connect() -> None:
    global _client, _db
    _client = AsyncIOMotorClient(config.MONGO_URL, serverSelectionTimeoutMS=5000)
    _db = _client[config.MONGO_DB]
    await _db.command("ping")
    await _ensure_timeseries()
    log.info("Connected to MongoDB at %s", config.MONGO_URL)


async def close() -> None:
    if _client is not None:
        _client.close()


async def _ensure_timeseries() -> None:
    """
    Creates `readings` as a time-series collection if it does not exist yet.

    Whichever service touches it first must create it with the right options —
    a plain collection created by accident cannot be converted in place.
    """
    names = await _db.list_collection_names()
    if READINGS in names:
        return

    retention_days = int(getattr(config, "READING_RETENTION_DAYS", 90))
    await _db.create_collection(
        READINGS,
        timeseries={"timeField": "ts", "metaField": "meta", "granularity": "minutes"},
        expireAfterSeconds=retention_days * 24 * 60 * 60,
    )
    log.info("Created time-series collection '%s'", READINGS)


async def list_sites() -> List[dict]:
    return await _db.sites.find(
        {}, {"ip": 1, "nom": 1, "project": 1, "latitude": 1, "longitude": 1, "Battery_Type": 1}
    ).to_list(length=None)


async def list_simple_devices(collection: str) -> List[dict]:
    return await _db[collection].find({}, {"ip": 1}).to_list(length=None)


async def save_site_poll(
    site_id,
    project_id,
    reachable: bool,
    reading: Optional[dict],
    analysis: Optional[dict],
    error: Optional[str],
) -> None:
    """
    Records one sweep of a station: the denormalised latest value on the site
    document, plus an immutable point in the time series when the read worked.

    A failed read is stored with `reachable: false` and null measurements rather
    than zeros — a zero used to be indistinguishable from a real reading of 0 V
    and would trip the low-voltage alert.
    """
    now = datetime.now(timezone.utc)

    last_reading = {
        **{k: None for k in (
            "Battery_Voltage", "Charge_Current", "Temperature_Ambient",
            "Temperature_Battery", "Array_Voltage", "Sweep_Pmax",
            "Load_Voltage", "Load_Current",
        )},
        **(reading or {}),
        "measuredAt": now if reading else None,
        "reachable": bool(reading),
        "error": error,
    }

    update = {"status": reachable, "lastReading": last_reading}
    if reachable:
        update["lastSeenAt"] = now
    if analysis is not None:
        update["lastAnalysis"] = analysis

    await _db.sites.update_one({"_id": site_id}, {"$set": update})

    if reading:
        await _db[READINGS].insert_one(
            {"ts": now, "meta": {"site": site_id, "project": project_id}, **reading}
        )


async def save_device_status(collection: str, device_id, reachable: bool) -> None:
    update = {"status": reachable}
    if reachable:
        update["lastSeenAt"] = datetime.now(timezone.utc)
    await _db[collection].update_one({"_id": device_id}, {"$set": update})


def is_connected() -> bool:
    return _db is not None
