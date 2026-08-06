"""Environment-driven configuration for the polling service."""

import os


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


IS_PRODUCTION = os.environ.get("NODE_ENV") == "production"

MONGO_URL = os.environ.get(
    "MONGO_URL",
    "mongodb://mongo:27017/mppt" if IS_PRODUCTION else "mongodb://127.0.0.1:27017/mppt",
)
MONGO_DB = os.environ.get("MONGO_DB", "mppt")

# --- Polling ---------------------------------------------------------------
# How often the full device inventory is swept.
POLL_INTERVAL_SECONDS = _int("POLL_INTERVAL_SECONDS", 300)
# Devices read concurrently. Bounded so a large site list cannot open hundreds
# of sockets at once, while still keeping one slow device from stalling a sweep.
POLL_CONCURRENCY = _int("POLL_CONCURRENCY", 16)

# --- Modbus ----------------------------------------------------------------
MODBUS_PORT = _int("MODBUS_PORT", 502)
MODBUS_TIMEOUT = _float("MODBUS_TIMEOUT", 3.0)
MODBUS_UNIT_ID = _int("MODBUS_UNIT_ID", 1)
MODBUS_REGISTER_COUNT = _int("MODBUS_REGISTER_COUNT", 82)
# Coil that triggers a controller restart.
MODBUS_RESET_COIL = _int("MODBUS_RESET_COIL", 255)
# Drop a pooled connection after this long without use.
MODBUS_IDLE_TIMEOUT = _float("MODBUS_IDLE_TIMEOUT", 900.0)

# --- Ping ------------------------------------------------------------------
PING_TIMEOUT_SECONDS = _int("PING_TIMEOUT_SECONDS", 3)

# --- Weather ---------------------------------------------------------------
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
WEATHER_TTL_SECONDS = _int("WEATHER_TTL_SECONDS", 1800)
# Coordinates are rounded to this many decimals before being used as a cache
# key, so stations in the same area share one upstream call (~1 km at 2 dp).
WEATHER_COORD_PRECISION = _int("WEATHER_COORD_PRECISION", 2)
WEATHER_TIMEOUT_SECONDS = _float("WEATHER_TIMEOUT_SECONDS", 10.0)
DEFAULT_LAT = _float("DEFAULT_LAT", 45.58109)
DEFAULT_LON = _float("DEFAULT_LON", -73.48695)

# --- Device web UI ---------------------------------------------------------
EMC_HTTP_PORT = _int("EMC_HTTP_PORT", 4444)
REFRESH_TIMEOUT_MS = _int("REFRESH_TIMEOUT_MS", 15000)
