import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Author, AuthorsPage, CreateAuthor, UpdateAuthor } from '../models';

export interface AuthorResponse {
  author: Author;
}

@Injectable({ providedIn: 'root' })
export class AuthorService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/authors`;

  /** GET /authors */
  getAuthors(page = 1, limit = 5, search = '', sort = '', order = 'asc'): Observable<AuthorsPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    const searchParams = search.trim() ? params.set('search', search.trim()) : params;
    // Si hay una columna para ordenar, mandamos también el sentido (asc o desc)
    const sortParams = sort ? searchParams.set('sort', sort).set('order', order) : searchParams;
    return this.http.get<AuthorsPage>(this.baseUrl, { params: sortParams });
  }

  /** GET /authors/:id */
  getAuthor(id: string): Observable<AuthorResponse> {
    return this.http.get<AuthorResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /authors */
  createAuthor(payload: CreateAuthor): Observable<AuthorResponse> {
    return this.http.post<AuthorResponse>(this.baseUrl, payload);
  }

  /** PUT /authors/:id */
  updateAuthor(id: string, payload: UpdateAuthor): Observable<AuthorResponse> {
    return this.http.put<AuthorResponse>(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE /authors/:id */
  deleteAuthor(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
