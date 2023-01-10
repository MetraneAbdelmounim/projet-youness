import { Injectable } from '@angular/core';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {LoginService} from './login.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuardService {

  // @ts-ignore
  canActivate(route: ActivatedRouteSnapshot,
              state: RouterStateSnapshot):
    Observable<boolean> | Promise<boolean>  | boolean  {
    if(this.loginService.getAuthStatus() && this.loginService.getMemberStatus){
      return   this.loginService.getMemberStatus();
    }
    else {
      this.router.navigate(['']);
      return false
    }
  }
  constructor(private loginService : LoginService,private router : Router) { }
}
