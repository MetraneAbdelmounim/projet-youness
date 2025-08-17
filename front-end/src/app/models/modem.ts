import { Project } from "./project";

export class Modem {
    _id : string
    ip : string
    nom : string
    project : Project
   
  
  
    constructor(id: string, ip: string, nom: string, project:Project) {
      this._id = id;
      this.ip = ip;
      this.nom = nom;
      this.project=project
 
    }
    
}
