import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { WorkoutService } from './workout.service';

describe('WorkoutService', () => {
  let service: WorkoutService;
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/workouts`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WorkoutService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getWorkouts() sends the day filter and the sort', () => {
    service.getWorkouts({ dayOfWeek: 'MONDAY', sort: 'dayOfWeek', order: 'asc' }).subscribe();
    const req = httpMock.expectOne(`${url}?dayOfWeek=MONDAY&sort=dayOfWeek&order=asc`);
    expect(req.request.method).toBe('GET');
    req.flush({ workouts: [], pagination: {} });
  });

  it('createWorkout() posts the exercises as a list of ids', () => {
    service
      .createWorkout({ name: 'Día de pecho', dayOfWeek: 'MONDAY', exercises: ['e1', 'e2'] })
      .subscribe();
    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.exercises).toEqual(['e1', 'e2']);
    req.flush({ workout: {} });
  });

  it('updateWorkout() puts the payload to the id url', () => {
    service.updateWorkout('w1', { name: 'X', dayOfWeek: 'FRIDAY' }).subscribe();
    const req = httpMock.expectOne(`${url}/w1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ workout: {} });
  });
});
