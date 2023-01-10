import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { catchError, filter, take, switchMap } from "rxjs/operators";
import { Observable, throwError } from 'rxjs';
import {LoginService} from './login.service';
import {NzMessageService} from 'ng-zorro-antd/message';
import {config} from '../../Config/config';

@Injectable({
  providedIn: 'root'
})
export class AuthInterceptorService implements HttpInterceptor {
  constructor(private loginService:LoginService,private message:NzMessageService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler) {

    const token: string = this.loginService.getToken();
    req = req.clone({ headers: req.headers.set('Authorization', 'Bearer ' + token) });

    return next.handle(req)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error && error.status === 401) {
            this.message.error("ERROR 401 UNAUTHORIZED",{nzDuration:config.durationMessage})
          }
          const err = error.error.message || error.statusText;
          return throwError(error);
        })
      );
  }
}
