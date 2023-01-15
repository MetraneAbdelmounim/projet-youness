import { Injectable } from '@angular/core';
import {Subject} from 'rxjs';
import {Router} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';

import {config} from '../../Config/config';
import {MemberService} from './member.service';
import {NzMessageService} from "ng-zorro-antd/message";
const BACKEND_URL = environment.apiUri;
@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private userId :string = ""
  private token! : string;
  private authStatusListener = new Subject<boolean>();
  private isAuthenticated = false;

  private tokenTimer: any;

  private memberRoleSub =new Subject<boolean>();
  redirectUrl: string="";

  constructor(private http : HttpClient, private router : Router,private message:NzMessageService,private  memberService:MemberService) { }

  getToken(){
    return this.token;
  }
  getAuthStatusListener() {
    return this.authStatusListener.asObservable();
  }
  getAuthStatus(){
    return this.isAuthenticated;
  }
  signIn(username : String, password : String) {
    const authData = {username : username, password : password};
    this.http.post<{token : string, expiresIn : number, userId : string,message:string,isAdmin:boolean}>(
      BACKEND_URL+'login',authData).subscribe((result)=>{

      this.userId = result.userId
      const token = result.token;
      this.token = token;

      if(token){
        const expiresInDuration = result.expiresIn;

        this.setAuthTimer(expiresInDuration);

        const now = new Date();

        const expirationDate = new Date(now.getTime()+expiresInDuration*1000);

        this.saveAuthData(token,expirationDate,this.userId);

        this.authStatusListener.next(true);
        this.isAuthenticated = true;
        if (this.redirectUrl) {
          this.router.navigate([this.redirectUrl.slice(1,this.redirectUrl.length)]);
          // @ts-ignore
          this.redirectUrl = null;
        }
        else{
          this.router.navigate(['/home'])
        }
        this.message.success(result.message,{nzDuration:config.durationMessage})

      }

    },(error)=>{

      this.message.error(error.error.error,{nzDuration:config.durationMessage})

    });

  }
  logout(){

    let userId= this.getAuthorizedFromLocal()
    this.memberService.logout(userId).subscribe((res)=>{

      // @ts-ignore
      this.token= null;
      this.authStatusListener.next(false);
      this.isAuthenticated = false;
      clearTimeout(this.tokenTimer);
      this.clearAuthData();
      this.router.navigate(['']);

    })


  }
  private saveAuthData(token: string, expirationDate: Date,userId:string) {
    localStorage.setItem("token", token);
    localStorage.setItem("expiration", expirationDate.toISOString());
    localStorage.setItem("authorized", userId);
  }
  private clearAuthData(){

    localStorage.removeItem("token");
    localStorage.removeItem("expiration");
    //localStorage.removeItem("authorized");
  }
  private getAuthData() {
    const token = localStorage.getItem("token");
    const expirationDate = localStorage.getItem("expiration");
    const user = localStorage.getItem("authorized");
    if (!token || !expirationDate || !user) {
      this.logout()
      return;
    }

    return {
      token: token,
      expirationDate: new Date (expirationDate),
      authorized:user
    };
  }
  getMemberStatus(){
    this.memberService.getMemberFromToken(this.getToken())
    this.memberService.userFromTokenSubject.asObservable().subscribe((res:any)=>{
      this.memberRoleSub.next(res.user.isAdmin)
    })
    return this.memberRoleSub.asObservable()
  }


  getTokenFromLocal(){
    return String(localStorage.getItem('token'))
  }
  getAuthorizedFromLocal(){
    return String(localStorage.getItem('authorized'))
  }
  autoAuthUser() {
    const authInfo = this.getAuthData();

    if (!authInfo) {
      return;
    }

    // @ts-ignore
    const now = new Date();
    const expiresIn = authInfo.expirationDate.getTime() - now.getTime();

    if (expiresIn > 0) {

      this.token = authInfo.token;
      this.isAuthenticated = true;
      this.setAuthTimer(expiresIn / 1000);
      this.authStatusListener.next(true);
    }
    else{

      this.logout()
    }
  }
  private setAuthTimer(duration: number) {
    this.tokenTimer = setTimeout(() => {

      this.logout();
    }, duration * 1000);
  }
}
