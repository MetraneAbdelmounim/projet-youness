import { Component, OnInit } from '@angular/core';
import { LoginService } from '../../services/login.service';
import { MemberService } from '../../services/member.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-aside',
  standalone: false,
  templateUrl: './aside.component.html',
  styleUrl: './aside.component.css'
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
   onLogout() {
    this.loginService.logout()
  }
  admin_member(){
    this.router.navigate(['/dashbord/members'])
    .then(() => {
      window.location.reload();
    });
  }
  admin_sites(){
    this.router.navigate(['/dashbord/sites'])
    .then(() => {
      window.location.reload();
    });
  }
}
