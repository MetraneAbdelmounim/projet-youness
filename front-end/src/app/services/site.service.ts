import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HistoryPoint, Site } from '../models/site';

const BACKEND_URL = environment.apiUri;

@Injectable({ providedIn: 'root' })
export class SiteService {
  constructor(private http: HttpClient) {}

  /**
   * Every station of a project, with telemetry, analysis and reachability
   * already attached.
   *
   * This replaces the previous pattern where the list endpoint returned bare
   * stations and each rendered card then fetched its own data, status and
   * analysis — three extra requests per station, each triggering live device
   * I/O. One call now covers the whole page.
   */
  getSitesByProject(idProject: string): Observable<Site[]> {
    return this.http.get<Site[]>(`${BACKEND_URL}stations/projects/${idProject}`);
  }

  getAllSites(): Observable<Site[]> {
    return this.http.get<Site[]>(`${BACKEND_URL}stations/ping`);
  }

  getSiteById(id: string): Observable<Site> {
    return this.http.get<Site>(`${BACKEND_URL}stations/${id}`);
  }

  /** Historical readings for charting, from the time-series collection. */
  getHistory(id: string, hours = 24): Observable<HistoryPoint[]> {
    return this.http.get<HistoryPoint[]>(`${BACKEND_URL}stations/history/${id}?hours=${hours}`);
  }

  addSite(data: Partial<Site>) {
    return this.http.post<{ message: string }>(`${BACKEND_URL}stations`, data);
  }

  editSite(id: string, data: Partial<Site>) {
    return this.http.put<{ message: string }>(`${BACKEND_URL}stations/${id}`, data);
  }

  deleteSite(id: string) {
    return this.http.delete<{ message: string }>(`${BACKEND_URL}stations/${id}`);
  }

  addSiteFromFile(file: File) {
    const payload = new FormData();
    payload.append('file', file);
    return this.http.post<{ message: string; imported: number; errors: string[] }>(
      `${BACKEND_URL}stations/file`,
      payload
    );
  }

  exportToExcel() {
    return this.http.get(`${BACKEND_URL}stations/export`, { responseType: 'blob' });
  }

  /**
   * Forces an immediate re-read of one station instead of waiting for the next
   * scheduled sweep. Returns its fresh reachability.
   */
  pollSite(id: string): Observable<{ _id: string; status: boolean; lastSeenAt: string | null }> {
    return this.http.post<{ _id: string; status: boolean; lastSeenAt: string | null }>(
      `${BACKEND_URL}stations/poll/${id}`,
      {}
    );
  }

  reloadSite(id: string) {
    return this.http.post<{ message: string }>(`${BACKEND_URL}stations/reload/${id}`, {});
  }

  refreshSite(id: string) {
    return this.http.post<{ message: string }>(`${BACKEND_URL}stations/refresh/${id}`, {});
  }

  getMidnightReload(): Observable<boolean> {
    return this.http.get<boolean>(`${BACKEND_URL}stations/midnightReload`);
  }

  changeMidnightReload(enabled: boolean) {
    return this.http.put<{ message: string }>(`${BACKEND_URL}stations/midnightReload`, {
      reload_midnight: enabled,
    });
  }
}
