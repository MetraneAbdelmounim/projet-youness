import {Component, NgZone, OnDestroy, OnInit} from '@angular/core';
import {NgForm} from "@angular/forms";
import {LoginService} from "../services/login.service";
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit,OnDestroy {
  name = 'Angular';
  // @ts-ignore
  private authListenerSub : Subscription;
  memberIsAuthenticated : boolean = false;
  constructor(private loginService:LoginService,private router:Router) { }

  ngOnInit(): void {
    document.body.className="body"
    //document.body.className="login-c"
    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    this.authListenerSub = this.loginService.getAuthStatusListener()
      .subscribe((isAuthenticated)=> {
        this.memberIsAuthenticated = isAuthenticated;
        if(this.memberIsAuthenticated){

          this.router.navigate(['home'])
        }
      });
    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    if(this.memberIsAuthenticated) {
      this.router.navigate(['home'])
    }
  }

  onSignIn(f: NgForm) {
    if(f.valid){
      this.loginService.signIn(f.value['username'],f.value['password'])
    }
  }

  ngOnDestroy(): void {
    document.body.className=""
  }

}
