import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { catchError, filter, take, switchMap } from "rxjs/operators";
import { Observable, throwError } from 'rxjs';
import {LoginService} from './login.service';
import {config} from '../../Config/config';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class AuthInterceptorService implements HttpInterceptor {
  constructor(private loginService:LoginService,private message:ToastrService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler) {
   // @ts-ignore
    const token: string = this.loginService.getTokenFromLocal()
    const authorized : string = this.loginService.getAuthorizedFromLocal()
    req = req.clone({ headers: req.headers.set('Authorization', 'Bearer ' + token+ ' '+authorized)});


    return next.handle(req)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error && error.status === 401) {
            this.message.error(error.error.error)
          }
          const err = error.error.message || error.statusText;
          return throwError(error);
        })
      );
    }
}
