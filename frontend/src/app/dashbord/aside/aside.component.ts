import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from 'src/app/services/login.service';
import { MemberService } from 'src/app/services/member.service';

@Component({
  selector: 'app-aside',
  templateUrl: './aside.component.html',
  styleUrls: ['./aside.component.scss']
})
export class AsideComponent implements OnInit {
   // @ts-ignore
    private authListenerSub : Subscription;
    memberIsAuthenticated : boolean = false;
    
    memberConnected : any
  // @ts-ignore
    isAdmin:boolean
  
    constructor(private loginService:LoginService,private memberService: MemberService,private router:Router) { }
  
    ngOnInit(): void {
  
      this.memberIsAuthenticated = this.loginService.getAuthStatus();
      this.authListenerSub = this.loginService.getAuthStatusListener()
        .subscribe((isAuthenticated:boolean)=> {
          this.memberIsAuthenticated = isAuthenticated;
          if(this.memberIsAuthenticated){
            this.memberService.getMemberFromToken(this.loginService.getToken())
            this.memberService.userFromTokenSubject.asObservable().subscribe((connectedMember:any)=>{

              this.isAdmin= connectedMember.member.isAdmin
            
            })
  
          }
  
  
        });
  
      this.memberIsAuthenticated = this.loginService.getAuthStatus();
      if(this.memberIsAuthenticated) {
        this.memberService.getMemberFromToken(this.loginService.getToken())
        this.memberService.userFromTokenSubject.asObservable().subscribe((connectedMember:any)=>{
  
        
          this.isAdmin= connectedMember.member.isAdmin

        })
      }
    }
    dashbord(){

    

      this.router.navigate(['/dashbord'])
      .then(() => {
        window.location.reload();
      });
    }
  

}
