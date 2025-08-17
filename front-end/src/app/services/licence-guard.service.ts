import { Injectable } from '@angular/core';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {config} from '../../Config/config';
@Injectable({
  providedIn: 'root'
})

export class LicenceGuardService {


  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean>  | boolean {
    const date= new Date()

    
    if(config.DATE_Licence.getTime()-date.getTime()<0){
      return this.router.navigateByUrl('license-expired');

    }
    return  true;
  }
  constructor(private router : Router) { }
}