export class Site {
  _id : string
  ip : string
  nom : string
  status:boolean
  Battery_Voltage:Number
  Charge_Current:Number
  Temperature_Ambient:Number
  Array_Voltage:Number
  Load_Current:Number
  Sweep_Pmax:Number
  Load_Voltage:Number


  constructor(id: string, ip: string, nom: string, status: boolean, Battery_Voltage: Number, Charge_Current: Number, Temperature_Ambient: Number, Array_Voltage: Number, Load_Current: Number, Sweep_Pmax: Number, Load_Voltage: Number) {
    this._id = id;
    this.ip = ip;
    this.nom = nom;
    this.status = status;
    this.Battery_Voltage = Battery_Voltage;
    this.Charge_Current = Charge_Current;
    this.Temperature_Ambient = Temperature_Ambient;
    this.Array_Voltage = Array_Voltage;
    this.Load_Current = Load_Current;
    this.Sweep_Pmax = Sweep_Pmax;
    this.Load_Voltage = Load_Voltage;
  }
}
