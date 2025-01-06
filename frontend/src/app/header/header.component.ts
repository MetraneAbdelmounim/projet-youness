import { Component, OnInit } from '@angular/core';
import {Subscription} from 'rxjs';
import {LoginService} from '../services/login.service';
import {Router} from '@angular/router';
import { MemberService } from '../services/member.service';

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
  private userId : string;
  // @ts-ignore
  username: string;
  // @ts-ignore
  
  memberConnected : any
// @ts-ignore
  role:string

  constructor(private loginService:LoginService,private router :Router,private memberService: MemberService) { }

  ngOnInit(): void {

    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    this.authListenerSub = this.loginService.getAuthStatusListener()
      .subscribe((isAuthenticated)=> {
        this.memberIsAuthenticated = isAuthenticated;
        if(this.memberIsAuthenticated){
          this.memberService.getMemberFromToken(this.loginService.getToken())
          this.memberService.userFromTokenSubject.asObservable().subscribe((connectedMember:any)=>{

            this.memberConnected=connectedMember
            this.role= connectedMember.member.isAdmin?'Admin':'User';
            this.username = connectedMember.member.username;
            
            this.userId = connectedMember.member.userId;
          })

        }


      });

    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    if(this.memberIsAuthenticated) {
      this.memberService.getMemberFromToken(this.loginService.getToken())
      this.memberService.userFromTokenSubject.asObservable().subscribe((connectedMember:any)=>{

        
        this.memberConnected=connectedMember
        this.role= connectedMember.member.isAdmin?'Admin':'User';
        this.username = connectedMember.member.username;
        
        this.userId = connectedMember.member.userId;
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
  dashbord(){

    

    this.router.navigate(['/dashbord'])
    .then(() => {
      window.location.reload();
    });
  }
}
