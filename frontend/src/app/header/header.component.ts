import { Component, OnInit } from '@angular/core';
import {Subscription} from 'rxjs';
import {LoginService} from '../services/login.service';
import {Router} from '@angular/router';

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
  role:string

  constructor(private loginService:LoginService,private router :Router) { }

  ngOnInit(): void {

    this.memberIsAuthenticated = this.loginService.getAuthStatus();
    this.authListenerSub = this.loginService.getAuthStatusListener()
      .subscribe((isAuthenticated) => {

        this.memberIsAuthenticated = isAuthenticated;
      });
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
