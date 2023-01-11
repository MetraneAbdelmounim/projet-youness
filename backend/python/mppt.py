class mppt:


    def __init__(self: object, Battery_Voltage: int, Temperature_Ambient:int, Charge_Current:int,Array_Voltage:int,Sweep_Pmax:int,Load_Voltage:int,Load_Current:int):

        self.Battery_Voltage=self._float_from_unsigned16(Battery_Voltage)
        self.Temperature_Ambient = self._float_from_unsigned16(Temperature_Ambient)
        self.Charge_Current=self._float_from_unsigned16(Charge_Current)
        self.Array_Voltage=self._float_from_unsigned16(Array_Voltage)
        self.Sweep_Pmax=self._float_from_unsigned16(Sweep_Pmax)
        self.Load_Voltage=self._float_from_unsigned16(Load_Voltage)
        self.Load_Current=self._float_from_unsigned16(Load_Current)

    def _float_from_unsigned16(self,n):

        sign = n >> 15
        exp = (n >> 10) & 0b011111
        fraction = n & (2**10 - 1)
        if exp == 0:
            if fraction == 0:
                return -0.0 if sign else 0.0
            else:
                return (-1)**sign * fraction / 2**10 * 2**(-14)  # subnormal
        elif exp == 0b11111:
            if fraction == 0:
                return float('-inf') if sign else float('inf')
            else:
                return float('nan')
        return (-1)**sign * (1 + fraction / 2**10) * 2**(exp - 15)
