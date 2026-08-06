import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { LoginService } from './login.service';

@Injectable({ providedIn: 'root' })
export class AuthInterceptorService implements HttpInterceptor {
  constructor(
    private loginService: LoginService,
    private message: ToastrService
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.loginService.getToken();

    // Only the bearer token is sent. The member id used to be appended as a
    // third header segment and checked server-side, which proved nothing —
    // both halves came from the same client. Identity is the token's job.
    const authorised = token
      ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
      : req;

    return next.handle(authorised).pipe(
      catchError((error: HttpErrorResponse) => {
        const detail = error?.error?.error;

        if (error.status === 401) {
          // The session is gone or was never valid — drop it rather than
          // leaving a dead token in storage.
          this.message.error(detail ?? 'Session expirée, veuillez vous reconnecter');
          this.loginService.logout();
        } else if (error.status === 403) {
          this.message.error(detail ?? "Vous n'êtes pas autorisé à effectuer cette action");
        } else if (error.status === 402) {
          this.message.error(detail ?? 'Votre licence a expiré');
        }

        return throwError(() => error);
      })
    );
  }
}
