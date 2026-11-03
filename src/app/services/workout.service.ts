import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { BulkDeleteResponse } from '../models/page.model';
import { Workout, WorkoutInput, WorkoutListParams, WorkoutsPage } from '../models';
import { buildListParams } from '../utils/list-params';

export interface WorkoutResponse {
  workout: Workout;
}

@Injectable({ providedIn: 'root' })
export class WorkoutService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/workouts`;

  /** GET /workouts */
  getWorkouts(params: WorkoutListParams = {}): Observable<WorkoutsPage> {
    return this.http.get<WorkoutsPage>(this.baseUrl, { params: buildListParams(params) });
  }

  /** GET /workouts/:id */
  getWorkout(id: string): Observable<WorkoutResponse> {
    return this.http.get<WorkoutResponse>(`${this.baseUrl}/${id}`);
  }

  /** POST /workouts */
  createWorkout(payload: WorkoutInput): Observable<WorkoutResponse> {
    return this.http.post<WorkoutResponse>(this.baseUrl, payload);
  }

  /** PUT /workouts/:id. La API reemplaza la rutina: hay que enviarla entera */
  updateWorkout(id: string, payload: WorkoutInput): Observable<WorkoutResponse> {
    return this.http.put<WorkoutResponse>(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE /workouts/:id. Borrado lógico: la API solo marca isDeleted */
  softDeleteWorkout(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** DELETE /workouts/:id/hard. Borrado definitivo de la base de datos (solo ADMIN) */
  hardDeleteWorkout(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/hard`);
  }

  /** DELETE /workouts con { ids }. Borrado lógico de varios a la vez (solo ADMIN) */
  softDeleteManyWorkouts(ids: string[]): Observable<BulkDeleteResponse> {
    return this.http.delete<BulkDeleteResponse>(this.baseUrl, { body: { ids } });
  }

  /** DELETE /workouts/hard con { ids }. Borrado definitivo de varios a la vez (solo ADMIN) */
  hardDeleteManyWorkouts(ids: string[]): Observable<BulkDeleteResponse> {
    return this.http.delete<BulkDeleteResponse>(`${this.baseUrl}/hard`, { body: { ids } });
  }
}
