import {Component, HostListener, OnInit} from '@angular/core';
import {LoginService} from "./services/login.service";

import {Subscription} from "rxjs";
import {NavigationEnd, Router} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent{

  memberIsAuthenticated : boolean=false;

  // @ts-ignore
  private authListenerSub:Subscription;
  constructor(private router: Router,private loginService:LoginService) {

  }

  ngOnInit(): void {
    
    this.loginService.autoAuthUser();
    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    this.authListenerSub = this.loginService.getAuthStatusListener().subscribe((isAuthenticated) => {
      
      this.memberIsAuthenticated = isAuthenticated;
    })
    this.router.events.subscribe(e => {
      if (!(e instanceof NavigationEnd)) {
        return;
      }
      window.scroll({
        top: 0,
        left: 0,
        behavior: 'smooth',

      });

    })
  }
  
}