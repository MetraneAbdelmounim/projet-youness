import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, tap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';
import { Member } from '../models/member';

const BACKEND_URL = environment.apiUri;

const TOKEN_KEY = 'token';
const MEMBER_KEY = 'memberId';
const EXPIRY_KEY = 'expiration';

interface SignInResponse {
  token: string;
  expiresIn: number;
  memberId: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class LoginService {
  /**
   * Authentication state, seeded from storage on construction.
   *
   * A BehaviorSubject means late subscribers — route guards in particular — get
   * the current value immediately. The previous plain Subject only emitted on
   * change, so a guard that subscribed after login never received anything.
   */
  private readonly authenticated$ = new BehaviorSubject<boolean>(false);
  private readonly currentMember$ = new BehaviorSubject<Member | null>(null);

  redirectUrl = '';
  private tokenTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private http: HttpClient,
    private router: Router,
    private message: ToastrService
  ) {}

  getAuthStatusListener(): Observable<boolean> {
    return this.authenticated$.asObservable();
  }

  getAuthStatus(): boolean {
    return this.authenticated$.value;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getMemberId(): string | null {
    return localStorage.getItem(MEMBER_KEY);
  }

  getCurrentMember(): Observable<Member | null> {
    return this.currentMember$.asObservable();
  }

  /**
   * Resolves the caller's admin flag, asking the API only when it is not
   * already known.
   *
   * The old implementation opened a fresh subscription to a never-completing
   * Subject on every call, so each admin-guard evaluation leaked one more
   * subscriber and the guard's observable never settled.
   */
  isAdmin(): Observable<boolean> {
    const cached = this.currentMember$.value;
    if (cached) return of(cached.isAdmin);

    return this.loadCurrentMember().pipe(map((member) => member?.isAdmin ?? false));
  }

  loadCurrentMember(): Observable<Member | null> {
    return this.http.get<{ member: Member }>(`${BACKEND_URL}auth/me`).pipe(
      map((response) => response.member),
      tap((member) => this.currentMember$.next(member)),
      catchError(() => {
        this.currentMember$.next(null);
        return of(null);
      })
    );
  }

  signIn(username: string, password: string): void {
    this.http
      .post<SignInResponse>(`${BACKEND_URL}auth/signin`, { username, password })
      .subscribe({
        next: (result) => {
          this.saveAuthData(result.token, result.memberId, result.expiresIn);
          this.setAuthTimer(result.expiresIn);
          this.authenticated$.next(true);
          this.message.success(result.message);

          this.loadCurrentMember().subscribe(() => {
            const target = this.redirectUrl || '/projects';
            this.redirectUrl = '';
            void this.router.navigateByUrl(target);
          });
        },
        error: (error) => {
          this.message.error(error?.error?.error ?? 'Connexion impossible');
        },
      });
  }

  logout(): void {
    // Clear locally first so a failing request cannot strand the session.
    const finish = () => {
      this.clearAuthData();
      this.authenticated$.next(false);
      this.currentMember$.next(null);
      clearTimeout(this.tokenTimer);
      void this.router.navigate(['']);
    };

    if (!this.getToken()) return finish();

    this.http
      .put(`${BACKEND_URL}auth/logout`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(finish);
  }

  /** Restores the session on page load, if the stored token has not expired. */
  autoAuthUser(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (!token || !expiry) return;

    const remainingMs = new Date(expiry).getTime() - Date.now();
    if (remainingMs <= 0) {
      this.clearAuthData();
      return;
    }

    this.authenticated$.next(true);
    this.setAuthTimer(remainingMs / 1000);
    this.loadCurrentMember().subscribe();
  }

  private saveAuthData(token: string, memberId: string, expiresInSeconds: number): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(MEMBER_KEY, memberId);
    localStorage.setItem(
      EXPIRY_KEY,
      new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    );
  }

  private clearAuthData(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MEMBER_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  }

  private setAuthTimer(durationSeconds: number): void {
    clearTimeout(this.tokenTimer);
    // setTimeout saturates above ~24.8 days; the token life is far shorter now,
    // but clamp anyway so an out-of-range value cannot fire immediately.
    const ms = Math.min(durationSeconds * 1000, 2 ** 31 - 1);
    this.tokenTimer = setTimeout(() => this.logout(), ms);
  }
}
