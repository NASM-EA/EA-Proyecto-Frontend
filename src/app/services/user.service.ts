import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { User, UserInput, UserListParams, UsersPage } from '../models';
import { buildListParams } from '../utils/list-params';

export interface UserResponse {
  user: User;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/users`;

  /** GET /users. Solo trae _id y name de cada usuario */
  getUsers(params: UserListParams = {}): Observable<UsersPage> {
    return this.http.get<UsersPage>(this.baseUrl, { params: buildListParams(params) });
  }

  /** GET /users/:id (solo ADMIN). Aquí sí vienen el email y el rol */
  getUser(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /users (solo ADMIN) */
  createUser(payload: UserInput): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.baseUrl, payload);
  }

  /** PUT /users/:id (solo ADMIN). Sin password se queda la que tenía */
  updateUser(id: string, payload: UserInput): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE /users/:id (solo ADMIN). Borrado lógico: la API solo marca isDeleted */
  softDeleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** DELETE /users/:id/hard (solo ADMIN). Borrado definitivo de la base de datos */
  hardDeleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/hard`);
  }
}
