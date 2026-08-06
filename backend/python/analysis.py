"""
Weather-adjusted end-of-day forecast for a battery.

The model is unchanged in intent from the original so results stay comparable,
but it is documented and the edge cases are pinned down: the charge term is
clamped, and a missing reading yields UNKNOWN instead of a prediction derived
from a zero voltage.
"""

from datetime import datetime, timezone
from typing import Optional

from mppt import MpptReading
from weather import Weather

# Battery capacity lost to cold, as a percentage, by ambient temperature (°C).
TEMPERATURE_LOSS = ((-15, 50), (-10, 30), (-5, 25), (0, 20))

# Recharge lost to cloud cover, as a percentage.
CLOUD_LOSS = ((80, 65), (40, 35))

# Recharge efficiency by available sun hours, per chemistry.
SUN_EFFICIENCY = {
    "LITHIUM": ((4, 100), (2, 65), (1, 35)),
    "AGM": ((6, 100), (3, 65), (1, 35)),
}


def _stepwise(table, value: float) -> int:
    """Returns the first table value whose threshold `value` meets or exceeds."""
    for threshold, result in table:
        if value >= threshold:
            return result
    return 0


def battery_capacity_loss(temperature: float) -> int:
    for threshold, loss in TEMPERATURE_LOSS:
        if temperature <= threshold:
            return loss
    return 0


def cloud_recharge_loss(cloud_cover: float) -> int:
    return _stepwise(CLOUD_LOSS, cloud_cover)


def sun_recharge_efficiency(sun_hours: float, battery_type: str) -> int:
    table = SUN_EFFICIENCY.get((battery_type or "AGM").upper(), SUN_EFFICIENCY["AGM"])
    return _stepwise(table, sun_hours)


def compute(reading: MpptReading, weather: Weather, battery_type: str) -> dict:
    voltage = reading.Battery_Voltage

    temp_loss = battery_capacity_loss(weather.avg_temperature)
    cloud_loss = cloud_recharge_loss(weather.avg_cloud_cover)

    # Only sunlight still to come can contribute to today's recharge.
    usable_sun_hours = min(weather.remaining_sun_hours, weather.sunshine_hours)
    solar_efficiency = sun_recharge_efficiency(usable_sun_hours, battery_type)

    # Net charge contribution, floored at -100% so the factor cannot go negative.
    charge_ratio = max((solar_efficiency - cloud_loss) / 100.0, -1.0)
    performance_value = (1 + charge_ratio) * (1 - temp_loss / 100.0)

    if voltage is None:
        performance = "UNKNOWN"
        predicted = None
    elif performance_value < 0.75:
        performance = "DOWN"
        predicted = round(voltage * performance_value, 2)
    elif performance_value <= 1.25:
        performance = "MEDIUM"
        predicted = round(voltage * performance_value, 2)
    else:
        performance = "UP"
        predicted = round(voltage * performance_value, 2)

    return {
        "temperature_ext": round(weather.avg_temperature, 2),
        "avg_remaining_cloud": round(weather.avg_cloud_cover, 2),
        "sun_hours": round(weather.sunshine_hours, 2),
        "remaining_sun_hours": round(weather.remaining_sun_hours, 2),
        "battery_type": (battery_type or "AGM").lower(),
        "battery_capacity_loss": temp_loss,
        "solar_charge_loss_clouds": cloud_loss,
        "solar_charge_efficiency": solar_efficiency,
        "predicted_end_day_voltage": predicted,
        "current_battery_voltage": voltage,
        "performance": performance,
        "computedAt": datetime.now(timezone.utc),
    }


def unknown(battery_type: str, voltage: Optional[float] = None) -> dict:
    """Placeholder used when a device or the forecast could not be read."""
    return {
        "battery_type": (battery_type or "AGM").lower(),
        "current_battery_voltage": voltage,
        "predicted_end_day_voltage": None,
        "performance": "UNKNOWN",
        "computedAt": datetime.now(timezone.utc),
    }
