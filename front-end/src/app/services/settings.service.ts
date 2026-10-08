import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const BACKEND_URL = environment.apiUri;

/**
 * Effective settings. `smtp.pass` is never returned — the API sends
 * `smtp.pass.isSet` instead so the form can say whether one is stored without
 * ever putting the credential in a browser cache.
 */
export interface AppSettings {
  'smtp.host': string;
  'smtp.port': number;
  'smtp.secure': boolean;
  'smtp.user': string;
  'smtp.pass.isSet': boolean;
  'mail.from': string;
  'schedule.alert': string;
  'schedule.nightly': string;
  'schedule.timezone': string;
  'alert.reminderIntervalMs': number;
  reloadMidnight: boolean;
}

export interface SettingsResponse {
  values: AppSettings;
  /** What the .env file specifies, shown as the "reset to" target. */
  defaults: AppSettings;
}

export interface MailTestResult {
  ok: boolean;
  stage: string;
  message: string;
  to: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private http: HttpClient) {}

  get(): Observable<SettingsResponse> {
    return this.http.get<SettingsResponse>(`${BACKEND_URL}settings`);
  }

  /** A null value reverts that key to its .env default. */
  update(patch: Record<string, unknown>): Observable<{ values: AppSettings }> {
    return this.http.put<{ values: AppSettings }>(`${BACKEND_URL}settings`, patch);
  }

  testMail(payload: Record<string, unknown>): Observable<MailTestResult> {
    return this.http.post<MailTestResult>(`${BACKEND_URL}settings/test-mail`, payload);
  }
}
