import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const BACKEND_URL = environment.apiUri;

export interface LicenceStatus {
  installed: boolean;
  valid: boolean;
  reason: string | null;
  signingKeyPresent?: boolean;
  /**
   * Who issued the licence — the software vendor. Distinct from `customer`,
   * which is the party the licence was issued *to*. Null until VENDOR_NAME is
   * configured on the server.
   */
  vendor?: string | null;
  customer?: string;
  licenceId?: string;
  issuedAt?: string;
  expiresAt?: string;
  maxStations?: number | null;
  daysRemaining?: number;
  installedAt?: string;
}

const UNKNOWN: LicenceStatus = { installed: false, valid: false, reason: null };

@Injectable({ providedIn: 'root' })
export class LicenceService {
  private readonly state$ = new BehaviorSubject<LicenceStatus>(UNKNOWN);

  constructor(private http: HttpClient) {}

  get status(): LicenceStatus {
    return this.state$.value;
  }

  watch(): Observable<LicenceStatus> {
    return this.state$.asObservable();
  }

  /**
   * Fetches licence state. Unauthenticated by design — the first-run screen has
   * to render before any account exists.
   */
  refresh(): Observable<LicenceStatus> {
    return this.http.get<LicenceStatus>(`${BACKEND_URL}licence/status`).pipe(
      tap((status) => this.state$.next(status)),
      catchError(() => {
        // A server that cannot be reached is not a licence failure; treat it as
        // unknown so the app does not falsely claim the licence is missing.
        this.state$.next(UNKNOWN);
        return of(UNKNOWN);
      })
    );
  }

  install(file: File): Observable<LicenceStatus> {
    const payload = new FormData();
    payload.append('licence', file);

    return this.http
      .post<{ message: string; licence: LicenceStatus }>(`${BACKEND_URL}licence`, payload)
      .pipe(
        map((response) => response.licence),
        tap((status) => this.state$.next(status))
      );
  }

  /** Warn the operator before a licence lapses rather than at the moment it does. */
  get expiringSoon(): boolean {
    const { valid, daysRemaining } = this.state$.value;
    return valid && daysRemaining !== undefined && daysRemaining <= 30;
  }
}
