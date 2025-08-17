import { Component } from '@angular/core';
import { LoginService } from '../../services/login.service';
import { MemberService } from '../../services/member.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-change-password',
  standalone: false,
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css'
})
export class ChangePasswordComponent {


  // @ts-ignore
  private authListenerSub : Subscription;
  memberIsAuthenticated : boolean = false;
  
  memberConnected : any
// @ts-ignore
  idMember:string

  constructor(private loginService:LoginService,private memberService: MemberService,private router:Router,private toaster:ToastrService) { }

  ngOnInit(): void {

    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    this.authListenerSub = this.loginService.getAuthStatusListener()
      .subscribe((isAuthenticated:boolean)=> {
        this.memberIsAuthenticated = isAuthenticated;
        if(this.memberIsAuthenticated){
          this.memberService.getMemberFromToken(this.loginService.getToken())
          this.memberService.userFromTokenSubject.asObservable().subscribe((connectedMember:any)=>{

            this.idMember= connectedMember.member._id
    
          
          })

        }


      });

    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    if(this.memberIsAuthenticated) {
      this.memberService.getMemberFromToken(this.loginService.getToken())
      this.memberService.userFromTokenSubject.asObservable().subscribe((connectedMember:any)=>{

      
        this.idMember= connectedMember.member._id
        

      })
    }
  }
  onChangePassword(f: NgForm,idMem: string) {
    if(f.valid){
      this.memberService.editPassword(idMem,f.value).subscribe((result:any)=>{
        this.toaster.success(result.message)
        f.resetForm()
        this.ngOnInit()
        this.loginService.logout()

      },err=>{
        this.toaster.error(err.error)

        
      })
    }
  }

}
