import { Injectable } from '@angular/core';
import {Subject} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
const BACKEND_URL = environment.apiUri
@Injectable({
  providedIn: 'root'
})
export class MemberService {
  userFromTokenSubject = new Subject<any>();
  userFromToken :any

  constructor(private http:HttpClient) { }

  getMemberFromToken(token : string){
    this.http.get(BACKEND_URL+'users/token/'+token).subscribe((result:any)=>{

      this.userFromToken=result
      this.emitSubjectUserFromToken()
    })
  }

  private emitSubjectUserFromToken() {
    this.userFromTokenSubject.next(this.userFromToken)
  }
  logout(_id:string){
    return this.http.post(BACKEND_URL+'users/'+_id+'/logout',null)
  }

  getAllMembers() {
    return this.http.get(BACKEND_URL+'users')
  }

  deleteMember(_id: string) {
    return this.http.delete(BACKEND_URL+'users/'+_id)
  }

  addMember(data: any) {
    return this.http.post(BACKEND_URL+'users',data)
  }

  editMember(idEditMember: string, data: any) {
    return this.http.put(BACKEND_URL+'users/'+idEditMember,data)
  }
}
