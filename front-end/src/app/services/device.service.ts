import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Device } from '../models/device';

const BACKEND_URL = environment.apiUri;

/**
 * Shared client for the modem and panneau endpoints, which expose an identical
 * API. Both services previously duplicated this file verbatim.
 */
export abstract class DeviceService {
  protected constructor(
    protected http: HttpClient,
    private resource: 'modems' | 'panneaus'
  ) {}

  private url(suffix = ''): string {
    return `${BACKEND_URL}${this.resource}${suffix}`;
  }

  getAll(): Observable<Device[]> {
    return this.http.get<Device[]>(this.url());
  }

  getByProject(idProject: string): Observable<Device[]> {
    return this.http.get<Device[]>(this.url(`/projects/${idProject}`));
  }

  add(data: Partial<Device>) {
    return this.http.post<{ message: string }>(this.url(), data);
  }

  edit(id: string, data: Partial<Device>) {
    return this.http.put<{ message: string }>(this.url(`/${id}`), data);
  }

  delete(id: string) {
    return this.http.delete<{ message: string }>(this.url(`/${id}`));
  }

  addFromFile(file: File) {
    const payload = new FormData();
    payload.append('file', file);
    return this.http.post<{ message: string; imported: number; errors: string[] }>(
      this.url('/file'),
      payload
    );
  }

  exportToExcel() {
    return this.http.get(this.url('/export'), { responseType: 'blob' });
  }
}
