import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Exercise, ExerciseInput, ExerciseListParams, ExercisesPage } from '../models';
import { buildListParams } from '../utils/list-params';

export interface ExerciseResponse {
  exercise: Exercise;
}

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/exercises`;

  /** GET /exercises */
  getExercises(params: ExerciseListParams = {}): Observable<ExercisesPage> {
    return this.http.get<ExercisesPage>(this.baseUrl, { params: buildListParams(params) });
  }

  /** GET /exercises/:id */
  getExercise(id: string): Observable<ExerciseResponse> {
    return this.http.get<ExerciseResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /exercises */
  createExercise(payload: ExerciseInput): Observable<ExerciseResponse> {
    return this.http.post<ExerciseResponse>(this.baseUrl, payload);
  }

  /** PUT /exercises/:id. La API reemplaza el ejercicio: hay que enviarlo entero */
  updateExercise(id: string, payload: ExerciseInput): Observable<ExerciseResponse> {
    return this.http.put<ExerciseResponse>(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE /exercises/:id. Borrado lógico: la API solo marca isDeleted */
  softDeleteExercise(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** DELETE /exercises/:id/hard. Borrado definitivo de la base de datos (solo ADMIN) */
  hardDeleteExercise(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/hard`);
  }
}
