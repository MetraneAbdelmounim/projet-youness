export class Site {
  _id : string
  ip : string
  nom : string
  status:boolean
  Battery_Voltage:Number
  Charge_Current:Number
  Temperature_Ambient:Number


  constructor(id: string, ip: string, nom: string,status:boolean,Charge_Current:Number,Battery_Voltage:Number,Temperature_Ambient:Number) {
    this._id = id;
    this.ip = ip;
    this.nom = nom;
    this.status=status
    this.Battery_Voltage=Battery_Voltage
    this.Charge_Current=Charge_Current
    this.Temperature_Ambient=Temperature_Ambient

  }
}
