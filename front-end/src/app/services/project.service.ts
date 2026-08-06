import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Project } from '../models/project';

const BACKEND_URL = environment.apiUri;

@Injectable({ providedIn: 'root' })
export class ProjectService {
  constructor(private http: HttpClient) {}

  getAllProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${BACKEND_URL}projects`);
  }

  getprojectByID(idProject: string): Observable<Project> {
    return this.http.get<Project>(`${BACKEND_URL}projects/${idProject}`);
  }

  addProject(data: Partial<Project>) {
    return this.http.post<{ message: string }>(`${BACKEND_URL}projects`, data);
  }

  editProject(id: string, data: Partial<Project>) {
    return this.http.put<{ message: string }>(`${BACKEND_URL}projects/${id}`, data);
  }

  deleteProject(id: string) {
    return this.http.delete<{ message: string }>(`${BACKEND_URL}projects/${id}`);
  }
}
