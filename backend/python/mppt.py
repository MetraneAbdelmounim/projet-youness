"""Decoding of the MPPT controller's holding registers."""

from dataclasses import dataclass, asdict
from typing import Optional, Sequence

# Holding-register offsets, relative to address 0.
REGISTER_MAP = {
    "Charge_Current": 16,
    "Array_Voltage": 19,
    "Load_Voltage": 20,
    "Load_Current": 22,
    "Battery_Voltage": 24,
    "Temperature_Battery": 27,
    "Temperature_Ambient": 28,
    "Sweep_Pmax": 62,
}

HIGHEST_REGISTER = max(REGISTER_MAP.values())


def float_from_unsigned16(n: int) -> Optional[float]:
    """
    Decodes an IEEE-754 binary16 (half precision) value held in one register.

    Returns None for NaN and the infinities so a malformed register surfaces as
    "no value" rather than propagating into arithmetic downstream.
    """
    sign = n >> 15
    exponent = (n >> 10) & 0b11111
    fraction = n & 0x3FF

    if exponent == 0:
        if fraction == 0:
            return 0.0
        return (-1) ** sign * fraction / 2**10 * 2**-14  # subnormal
    if exponent == 0b11111:
        return None  # inf or NaN

    return (-1) ** sign * (1 + fraction / 2**10) * 2 ** (exponent - 15)


@dataclass
class MpptReading:
    """One decoded sample. Fields are None when the register was unreadable."""

    Battery_Voltage: Optional[float] = None
    Temperature_Ambient: Optional[float] = None
    Temperature_Battery: Optional[float] = None
    Charge_Current: Optional[float] = None
    Array_Voltage: Optional[float] = None
    Sweep_Pmax: Optional[float] = None
    Load_Voltage: Optional[float] = None
    Load_Current: Optional[float] = None

    @classmethod
    def from_registers(cls, registers: Sequence[int]) -> "MpptReading":
        if len(registers) <= HIGHEST_REGISTER:
            raise ValueError(
                f"Expected more than {HIGHEST_REGISTER} registers, got {len(registers)}"
            )
        return cls(
            **{
                name: float_from_unsigned16(registers[offset])
                for name, offset in REGISTER_MAP.items()
            }
        )

    def as_dict(self) -> dict:
        return asdict(self)
