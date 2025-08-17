import { Project } from "./project"

export class Member {
    _id : string
    username : string
    password:string
    actif : Boolean
    isAdmin : Boolean
    notification : Boolean
    projects:Array<Project>



  
  
    constructor(id: string, username: string, password: string, actif: Boolean, isAdmin:Boolean,notification:Boolean,projects:Array<Project>) {
      this._id = id;
      this.username = username;
      this.password = password;
      this.actif=actif;
      this.isAdmin=isAdmin     
      this.notification=notification
      this.projects=projects
    }
  
  }
  