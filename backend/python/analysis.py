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


# Resting terminal voltage per 12 V block, at rest and around 25 °C.
# "full" is the settled open-circuit voltage at 100% state of charge, not the
# absorption setpoint the controller drives to while charging; "floor" is the
# practical bottom of the usable range.
RESTING_BOUNDS_PER_12V = {
    # Lead-acid / AGM: 2.13 V per cell full, ~1.97 V per cell empty.
    "AGM": (11.8, 12.8),
    # LiFePO4, 4 cells per 12 V block: ~3.40 V full, ~3.10 V near empty.
    "LITHIUM": (12.4, 13.6),
}

# Nominal system voltages, matched against a measured reading.
NOMINAL_BANDS = ((9.0, 17.0, 1), (18.0, 34.0, 2), (36.0, 68.0, 4))


def battery_bounds(voltage: float, battery_type: str) -> tuple:
    """
    Resting voltage range for the bank this reading came from.

    The nominal system voltage is inferred from the measurement rather than
    configured, so a 12 V or 48 V site is handled without extra setup.
    """
    blocks = next((b for low, high, b in NOMINAL_BANDS if low <= voltage <= high), 2)
    floor, full = RESTING_BOUNDS_PER_12V.get(
        (battery_type or "AGM").upper(), RESTING_BOUNDS_PER_12V["AGM"]
    )
    return floor * blocks, full * blocks


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


def predicted_resting_voltage(
    voltage: Optional[float], charge_ratio: float, temp_loss: int, battery_type: str
) -> Optional[float]:
    """
    End-of-day resting voltage, interpolated toward the bank's full or empty
    resting level according to the net energy balance.

    The previous formula multiplied the measured voltage by the charge ratio
    (`V × (1 + ratio)`), which multiplies volts by an energy-efficiency figure —
    the result is not a voltage and has no ceiling. It predicted 41–53 V on 24 V
    banks whose readings have never left 25.1–26.8 V.

    Interpolating instead keeps the answer inside the chemistry's real range by
    construction, and behaves correctly at both ends: a bank sitting above its
    resting-full level is being actively charged, so it is predicted to settle
    *down* toward that level once the sun goes.

    This is still a heuristic, not a state-of-charge model — a physical one
    needs the bank's amp-hour capacity and the load profile, neither of which is
    recorded. With history now accumulating, it can be fitted against measured
    outcomes instead.
    """
    if voltage is None:
        return None

    floor, full = battery_bounds(voltage, battery_type)

    # Net balance in -1..+1: positive means net charge over the rest of the day.
    balance = max(-1.0, min(1.0, charge_ratio * (1 - temp_loss / 100.0)))

    target = full if balance >= 0 else floor
    predicted = voltage + abs(balance) * (target - voltage)

    return round(min(max(predicted, floor), full), 2)


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
    elif performance_value < 0.75:
        performance = "DOWN"
    elif performance_value <= 1.25:
        performance = "MEDIUM"
    else:
        performance = "UP"

    predicted = predicted_resting_voltage(voltage, charge_ratio, temp_loss, battery_type)

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
