export class Member {
    _id : string
    username : string
    password:string
    actif : Boolean
    isAdmin : Boolean


  
  
    constructor(id: string, username: string, password: string, actif: Boolean, isAdmin:Boolean) {
      this._id = id;
      this.username = username;
      this.password = password;
      this.actif=actif;
      this.isAdmin=isAdmin     
    }
  
  }
  