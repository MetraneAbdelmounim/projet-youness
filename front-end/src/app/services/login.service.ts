import { Injectable } from '@angular/core';
import {Subject} from 'rxjs';
import {Router} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';

import {config} from '../../Config/config';
import {MemberService} from './member.service';

import { ToastrService } from 'ngx-toastr';
const BACKEND_URL = environment.apiUri;
@Injectable({
  providedIn: 'root'
})
export class LoginService {

  // @ts-ignore
  token : string;
  private authStatusListener = new Subject<boolean>();
  private isAuthenticated = false;
  redirectUrl: string="";
  private tokenTimer: any;

  private memberRoleSub =new Subject<boolean>();

  constructor(private http : HttpClient, private router : Router,private message:ToastrService,private  memberService:MemberService) { }
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
    this.http.post<{token : string, expiresIn : number, memberId : string,role : string,message:string}>(
      BACKEND_URL+'auth/signin',authData).subscribe((result)=>{
      
        
      const token = result.token;
      this.token = token;

      if(token){
        const expiresInDuration = result.expiresIn;

        this.setAuthTimer(expiresInDuration);

        const now = new Date();
        if (this.redirectUrl) {
          
          this.router.navigate([this.redirectUrl.slice(1,this.redirectUrl.length)]);
          // @ts-ignore
          this.redirectUrl = null;
        
        }
        this.message.success(result.message)
        const expirationDate = new Date(now.getTime()+expiresInDuration*1000);

        this.saveAuthData(token,expirationDate,result.memberId);
        this.authStatusListener.next(true);
        this.isAuthenticated = true;
        this.router.navigate(['projects']);
      }

    },(error)=>{
      this.message.error(error.error.error)
    });

  }
  logout(){

    // @ts-ignore
    this.token = null;
    this.authStatusListener.next(false);
    this.isAuthenticated = false;
    clearTimeout(this.tokenTimer);
    
    this.memberService.logoutMember(localStorage.getItem("memberId")).subscribe(()=>{

      this.clearAuthData();
      this.router.navigate(['']);
    })
    
  }
  private saveAuthData(token: string, expirationDate: Date, memberId: string) {
    localStorage.setItem("token", token);
    localStorage.setItem("memberId", memberId);
    localStorage.setItem("expiration", expirationDate.toISOString());

  }
  private clearAuthData(){
    localStorage.removeItem("token");
    localStorage.removeItem("memberId");
    localStorage.removeItem("expiration");
  }
  private getAuthData() {
    const token = localStorage.getItem("token");
    const expirationDate = localStorage.getItem("expiration");
    const memberId = localStorage.getItem("memberId");
    if (!token || !expirationDate) {
      return;
    }

    return {
      token: token,
      expirationDate: new Date (expirationDate),
      memberId:memberId
    };
  }
  getMemberStatus(){
    this.memberService.getMemberFromToken(this.getToken())
    this.memberService.userFromTokenSubject.asObservable().subscribe((data:any)=>{
    
      
      this.memberRoleSub.next(data.member.isAdmin)
    })
    return this.memberRoleSub.asObservable()
  }
  
  getAuthorizedFromLocal(){
    return String(localStorage.getItem('memberId'))
  }
  getTokenFromLocal(){
    return localStorage.getItem('token')
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
  }
  private setAuthTimer(duration: number) {
   
    this.tokenTimer = setTimeout(() => {
      this.logout();
    }, duration * 1000);
  }
}
