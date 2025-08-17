import { Injectable } from '@angular/core';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from "@angular/router";
import {Observable} from "rxjs";
import {LoginService} from "./login.service";

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService {

  /*canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean>  | boolean  {
    if(!this.loginService.getAuthStatus()){

      return  this.router.navigateByUrl('/');

    }
    return   this.loginService.getAuthStatus();
  }
  constructor(private loginService : LoginService,private router : Router) { }*/
  constructor(private authService: LoginService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    let url: string = state.url;

    return this.checkLogin(url);
  }

  checkLogin(url: string): boolean {
    if (this.authService.getAuthStatus()) {
      return this.authService.getAuthStatus();
    }

    // Store the attempted URL for redirecting
    this.authService.redirectUrl = url;

    this.router.navigate(['/']);

    return false;
  }
}