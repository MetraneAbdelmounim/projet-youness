import { Project } from "./project"

export class Site {
    _id : string
    ip : string
    nom : string
    Battery_Type:string
    status:boolean
    latitude:Number
    longitude:Number
    Battery_Voltage:Number
    Charge_Current:Number
    Temperature_Ambient:Number
    Temperature_Battery:Number
    Array_Voltage:Number
    Load_Current:Number
    Sweep_Pmax:Number
    Load_Voltage:Number
    project : Project
  
  
    constructor(id: string, ip: string, nom: string,Battery_Type: string, status: boolean,latitude:Number, longitude:Number,project:Project, Battery_Voltage: Number, Charge_Current: Number, Temperature_Ambient: Number,Temperature_Battery: Number, Array_Voltage: Number, Load_Current: Number, Sweep_Pmax: Number, Load_Voltage: Number) {
      this._id = id;
      this.ip = ip;
      this.nom = nom;
      this.status = status;
      this.latitude=latitude,
      this.longitude=longitude
      this.Battery_Type=Battery_Type
      this.Battery_Voltage = Battery_Voltage;
      this.Charge_Current = Charge_Current;
      this.Temperature_Ambient = Temperature_Ambient;
      this.Temperature_Battery = Temperature_Battery;
      this.Array_Voltage = Array_Voltage;
      this.Load_Current = Load_Current;
      this.Sweep_Pmax = Sweep_Pmax;
      this.Load_Voltage = Load_Voltage;
      this.project=project
    }
    
  
  }
  