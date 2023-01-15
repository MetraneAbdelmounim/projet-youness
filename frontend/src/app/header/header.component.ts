import { Component, OnInit } from '@angular/core';
import {Subscription} from 'rxjs';
import {LoginService} from '../services/login.service';
import {Router} from '@angular/router';
import {MemberService} from "../services/member.service";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  // @ts-ignore
  private authListenerSub : Subscription;
  memberIsAuthenticated : boolean = false;
  // @ts-ignore
  nom:string


  constructor(private loginService:LoginService,private router :Router,private memberService:MemberService) { }

  ngOnInit(): void {

    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    this.authListenerSub = this.loginService.getAuthStatusListener()
      .subscribe((isAuthenticated)=> {
        this.memberIsAuthenticated = isAuthenticated;
        if(this.memberIsAuthenticated){
          this.memberService.getMemberFromToken(this.loginService.getToken())
          this.memberService.userFromTokenSubject.asObservable().subscribe((connectedMember:any)=>{

            this.nom= connectedMember.user.username;
          })
        }
      });

    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    if(this.memberIsAuthenticated) {
      this.memberService.getMemberFromToken(this.loginService.getToken())
      this.memberService.userFromTokenSubject.asObservable().subscribe((connectedMember:any)=>{
        this.nom= connectedMember.user.username;

      })
    }
  }

  onLogout() {
    this.loginService.logout()
  }

  isActive(services: string) {
    return this.router.url=='/'+services
  }

  isAdmin(admin: string) {
    return this.router.url.startsWith('/'+admin)
  }
}
