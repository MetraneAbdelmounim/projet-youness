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
    this.http.get(BACKEND_URL+'members/tokens/'+token).subscribe((result:any)=>{

      this.userFromToken=result
      this.emitSubjectUserFromToken()
    })
  }

  private emitSubjectUserFromToken() {
    this.userFromTokenSubject.next(this.userFromToken)
  }
}
