"""Cached access to the open-meteo forecast."""

import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional, Tuple
from zoneinfo import ZoneInfo

import aiohttp

import config

log = logging.getLogger(__name__)


@dataclass
class Weather:
    avg_temperature: float
    avg_cloud_cover: float
    sunshine_hours: float
    remaining_sun_hours: float


_cache: Dict[Tuple[float, float], Tuple[float, Weather]] = {}
_locks: Dict[Tuple[float, float], asyncio.Lock] = {}


def _key(lat: float, lon: float) -> Tuple[float, float]:
    p = config.WEATHER_COORD_PRECISION
    return (round(lat, p), round(lon, p))


def _parse(payload: dict) -> Weather:
    tz = ZoneInfo(payload.get("timezone") or "UTC")
    now = datetime.now(tz)

    daily = payload.get("daily", {})
    sunshine_hours = (daily.get("sunshine_duration") or [0])[0] / 3600.0

    sunset_values = daily.get("sunset") or []
    # open-meteo returns local wall-clock times; attach the reported zone so the
    # comparison against `now` is offset-correct.
    sunset = (
        datetime.fromisoformat(sunset_values[0]).replace(tzinfo=tz)
        if sunset_values
        else now
    )

    hourly = payload.get("hourly", {})
    times = hourly.get("time") or []
    clouds = hourly.get("cloudcover") or []
    temps = hourly.get("temperature_2m") or []

    remaining_clouds, remaining_temps = [], []
    for time_str, cloud, temp in zip(times, clouds, temps):
        moment = datetime.fromisoformat(time_str).replace(tzinfo=tz)
        if now <= moment <= sunset:
            remaining_clouds.append(cloud)
            remaining_temps.append(temp)

    current_cloud = (payload.get("current") or {}).get("cloudcover", 0)
    current_temp = (payload.get("current") or {}).get("temperature_2m", 20.0)

    return Weather(
        avg_temperature=(
            sum(remaining_temps) / len(remaining_temps) if remaining_temps else current_temp
        ),
        avg_cloud_cover=(
            sum(remaining_clouds) / len(remaining_clouds) if remaining_clouds else current_cloud
        ),
        sunshine_hours=sunshine_hours,
        remaining_sun_hours=max(0.0, (sunset - now).total_seconds() / 3600.0),
    )


async def get(session: aiohttp.ClientSession, lat: float, lon: float) -> Optional[Weather]:
    """
    Returns the forecast for a location, cached for WEATHER_TTL_SECONDS.

    Coordinates are rounded into buckets first, so a project whose stations sit
    within a kilometre of each other costs one upstream request instead of one
    per station per viewer.
    """
    key = _key(lat, lon)

    cached = _cache.get(key)
    if cached and time.monotonic() - cached[0] < config.WEATHER_TTL_SECONDS:
        return cached[1]

    # One in-flight request per bucket; concurrent callers await the same fetch.
    lock = _locks.setdefault(key, asyncio.Lock())
    async with lock:
        cached = _cache.get(key)
        if cached and time.monotonic() - cached[0] < config.WEATHER_TTL_SECONDS:
            return cached[1]

        params = {
            "latitude": key[0],
            "longitude": key[1],
            "current": "cloudcover,temperature_2m",
            "daily": "sunshine_duration,sunset",
            "hourly": "cloudcover,temperature_2m",
            "timezone": "auto",
        }

        try:
            timeout = aiohttp.ClientTimeout(total=config.WEATHER_TIMEOUT_SECONDS)
            async with session.get(config.WEATHER_URL, params=params, timeout=timeout) as resp:
                resp.raise_for_status()
                weather = _parse(await resp.json())
        except Exception as exc:
            log.warning("Weather fetch failed for %s: %s", key, exc)
            # Serve a stale entry rather than losing the analysis entirely.
            return cached[1] if cached else None

        _cache[key] = (time.monotonic(), weather)
        return weather
