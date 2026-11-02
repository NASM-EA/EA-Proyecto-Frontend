import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Book, BooksPage, CreateBook, UpdateBook } from '../models';

export interface BookResponse {
  book: Book;
}

@Injectable({ providedIn: 'root' })
export class BookService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/books`;

  /** GET /books */
  getBooks(page = 1, limit = 5, search = '', sort = '', order = 'asc'): Observable<BooksPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    const searchParams = search.trim() ? params.set('search', search.trim()) : params;
    // Si hay una columna para ordenar, mandamos también el sentido (asc o desc)
    const sortParams = sort ? searchParams.set('sort', sort).set('order', order) : searchParams;
    return this.http.get<BooksPage>(this.baseUrl, { params: sortParams });
  }

  /** GET /books/:id */
  getBook(id: string): Observable<BookResponse> {
    return this.http.get<BookResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /books */
  createBook(payload: CreateBook): Observable<BookResponse> {
    return this.http.post<BookResponse>(this.baseUrl, payload);
  }

  /** PUT /books/:id */
  updateBook(id: string, payload: UpdateBook): Observable<BookResponse> {
    return this.http.put<BookResponse>(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE /books/:id */
  deleteBook(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
