import { Component, OnInit } from '@angular/core';
import {LoginService} from "../../services/login.service";
import {Router} from "@angular/router";
import {MemberService} from "../../services/member.service";

@Component({
  selector: 'app-aside',
  templateUrl: './aside.component.html',
  styleUrls: ['./aside.component.scss']
})
export class AsideComponent implements OnInit {
  // @ts-ignore
  private authListenerSub : Subscription;
  memberIsAuthenticated : boolean = false;
  // @ts-ignore
  memberConnected : any
// @ts-ignore
  isAdmin:boolean
  nom:string=""
  constructor(private loginService: LoginService, private router: Router,private memberService:MemberService) {
  }

  ngOnInit(): void {
    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    this.authListenerSub = this.loginService.getAuthStatusListener()
      .subscribe((isAuthenticated)=> {
        this.memberIsAuthenticated = isAuthenticated;
        if(this.memberIsAuthenticated){
          this.memberService.getMemberFromToken(this.loginService.getToken())
          this.memberService.userFromTokenSubject.asObservable().subscribe((connectedMember:any)=>{
            this.memberConnected=connectedMember
            this.isAdmin= connectedMember.user.isAdmin;
            this.nom=connectedMember.user.username
          })
        }
      });

    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    if(this.memberIsAuthenticated) {
      this.memberService.getMemberFromToken(this.loginService.getToken())
      this.memberService.userFromTokenSubject.asObservable().subscribe((connectedMember:any)=>{

        this.memberConnected=connectedMember
        this.isAdmin= connectedMember.user.isAdmin;
        this.nom=connectedMember.user.username

      })
    }
  }

}
