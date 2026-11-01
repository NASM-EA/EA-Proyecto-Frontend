import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { Exercise } from '../models';
import { ExerciseService } from './exercise.service';

describe('ExerciseService', () => {
  let service: ExerciseService;
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/exercises`;

  const exercise: Exercise = {
    _id: 'e1',
    name: 'Press de banca',
    category: 'CHEST',
    sets: 4,
    reps: 10,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExerciseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getExercises() sends page, search and sort, and skips empty values', () => {
    service
      .getExercises({
        page: 2,
        limit: 10,
        search: ' press ',
        category: '',
        sort: 'reps',
        order: 'desc',
      })
      .subscribe();

    const req = httpMock.expectOne(`${url}?page=2&limit=10&search=press&sort=reps&order=desc`);
    expect(req.request.method).toBe('GET');
    req.flush({ exercises: [], pagination: { page: 2, limit: 10, total: 0, totalPages: 0 } });
  });

  it('getExercises() sends the category filter', () => {
    service.getExercises({ category: 'LEGS' }).subscribe();
    httpMock.expectOne(`${url}?category=LEGS`).flush({ exercises: [], pagination: {} });
  });

  it('getExercise() returns the raw { exercise } response', () => {
    let response: Exercise | undefined;
    service.getExercise('e1').subscribe((res) => (response = res.exercise));
    httpMock.expectOne(`${url}/e1`).flush({ exercise });

    expect(response).toEqual(exercise);
  });

  it('createExercise() posts the payload', () => {
    service.createExercise({ name: 'Plancha', category: 'CORE' }).subscribe();
    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Plancha', category: 'CORE' });
    req.flush({ exercise });
  });

  it('softDeleteExercise() sends DELETE to the id url', () => {
    service.softDeleteExercise('e1').subscribe();
    const req = httpMock.expectOne(`${url}/e1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('hardDeleteExercise() sends DELETE to the /hard url', () => {
    service.hardDeleteExercise('e1').subscribe();
    const req = httpMock.expectOne(`${url}/e1/hard`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('updateExercise() puts the whole exercise to the id url', () => {
    service.updateExercise('e1', { name: 'Press', category: 'CHEST', sets: 3, reps: 8 }).subscribe();
    const req = httpMock.expectOne(`${url}/e1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.sets).toBe(3);
    req.flush({ exercise });
  });
});
