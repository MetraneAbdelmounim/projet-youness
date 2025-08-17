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
    this.http.get(BACKEND_URL+'auth/members/tokens/'+token).subscribe((result:any)=>{

      this.userFromToken=result
      this.emitSubjectUserFromToken()
    })
  }

  private emitSubjectUserFromToken() {
    this.userFromTokenSubject.next(this.userFromToken)
  }
  getAllMembers(){
    return this.http.get(BACKEND_URL+'members')
  }
  deleteMember(_id: string) {
    return this.http.delete(BACKEND_URL+'members/'+_id);
  }
  addMember(value: any) {
    return this.http.post(BACKEND_URL+'members',value);
  }
  editMember(idEditMemeber: any, value: any) {
    return this.http.put(BACKEND_URL+'members/'+idEditMemeber,value)
  }
  logoutMember(idEditMemeber: any) {
    return this.http.put(BACKEND_URL+'auth/members/logout/'+idEditMemeber,{})
  }
  editPassword(idEditMemeber: any, value: any) {
    return this.http.put(BACKEND_URL+'members/password/'+idEditMemeber,value)
  }
  changeNotification(idEditMemeber: any, value: any) {
    return this.http.put(BACKEND_URL+'members/notifications/'+idEditMemeber,value)
  }
}
