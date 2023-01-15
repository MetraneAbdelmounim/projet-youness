export class Member {
  _id:string
  username:string
  password:string
  actif:boolean
  isAdmin:boolean

  constructor(id: string, username: string, password: string, actif: boolean, isAdmin: boolean) {
    this._id = id;
    this.username = username;
    this.password = password;
    this.actif = actif;
    this.isAdmin = isAdmin;
  }
}
