import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Member } from '../models/member';

const BACKEND_URL = environment.apiUri;

@Injectable({ providedIn: 'root' })
export class MemberService {
  constructor(private http: HttpClient) {}

  getAllMembers(): Observable<Member[]> {
    return this.http.get<Member[]>(`${BACKEND_URL}members`);
  }

  addMember(data: { username: string; isAdmin?: boolean; projects?: string[] }) {
    // `temporaryPassword` is returned once, on creation, and is the only time
    // the value exists outside a hash.
    return this.http.post<{ message: string; member: Member; temporaryPassword: string }>(
      `${BACKEND_URL}members`,
      data
    );
  }

  editMember(id: string, data: Partial<Member>) {
    return this.http.put<{ message: string }>(`${BACKEND_URL}members/${id}`, data);
  }

  deleteMember(id: string) {
    return this.http.delete<{ message: string }>(`${BACKEND_URL}members/${id}`);
  }

  editPassword(
    id: string,
    data: { currentPass?: string; newPass: string; confirmedPass: string }
  ) {
    return this.http.put<{ message: string }>(`${BACKEND_URL}members/password/${id}`, data);
  }

  changeNotification(id: string, notification: boolean) {
    return this.http.put<{ message: string }>(`${BACKEND_URL}members/notifications/${id}`, {
      notification,
    });
  }
}
