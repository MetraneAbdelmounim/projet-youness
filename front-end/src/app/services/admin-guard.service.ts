import { Injectable } from '@angular/core';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {LoginService} from './login.service';

@Injectable({
  providedIn: 'root'
})

export class AdminGuardService {


  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean>  | boolean {
    
    if(!(this.loginService.getAuthStatus() && this.loginService.getMemberStatus)){
      return this.router.navigateByUrl('/');

    }
    
    
    return   this.loginService.getMemberStatus();
  }
  constructor(private loginService : LoginService,private router : Router) { }
}