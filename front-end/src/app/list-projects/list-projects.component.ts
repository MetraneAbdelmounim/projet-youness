import { Component } from '@angular/core';
import { LoginService } from '../services/login.service';
import { Router } from '@angular/router';
import { MemberService } from '../services/member.service';
import { Project } from '../models/project';

@Component({
  selector: 'app-list-projects',
  standalone: false,
  templateUrl: './list-projects.component.html',
  styleUrl: './list-projects.component.css'
})
export class ListProjectsComponent {

// @ts-ignore
  private authListenerSub : Subscription;
  memberIsAuthenticated : boolean = false;
  // @ts-ignore

  
  memberConnected : any
  spinnerSite: boolean=false;
// @ts-ignore
  role:string
  projects : Array<Project> = []
  constructor(private loginService:LoginService,private router :Router,private memberService: MemberService) { }

  ngOnInit(): void {
    this.spinnerSite=true
    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    this.authListenerSub = this.loginService.getAuthStatusListener()
      .subscribe((isAuthenticated)=> {
        this.memberIsAuthenticated = isAuthenticated;
        if(this.memberIsAuthenticated){
          this.memberService.getMemberFromToken(this.loginService.getToken())
          this.memberService.userFromTokenSubject.asObservable().subscribe((connectedMember:any)=>{

            this.memberConnected=connectedMember
            
          })

        }


      });

    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    if(this.memberIsAuthenticated) {
      this.memberService.getMemberFromToken(this.loginService.getToken())
      this.memberService.userFromTokenSubject.asObservable().subscribe((connectedMember:any)=>{
        this.projects=connectedMember.member.projects
        this.spinnerSite=false
        
      })
    }
  }
  dahsbord(arg0: string) {

    this.router.navigate(['/project', arg0, 'dashbord'])
    .then(()=>{
      window.location.reload()
    })

  }



}
