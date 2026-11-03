import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { ExercisesList } from './exercises-list';

const emptyPage = (page: number, total: number, totalPages: number) => ({
  exercises: [],
  pagination: {
    page,
    limit: 10,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  },
});

describe('ExercisesList', () => {
  let component: ExercisesList;
  let fixture: ComponentFixture<ExercisesList>;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/exercises`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExercisesList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ExercisesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(`${base}?page=1&limit=10&sort=name&order=asc`).flush(emptyPage(1, 25, 3));
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  it('shows the pagination metadata of the API', () => {
    expect(component.total()).toBe(25);
    expect(component.totalPages()).toBe(3);
  });

  it('requests the selected page', () => {
    component.loadPage(2);
    httpMock.expectOne(`${base}?page=2&limit=10&sort=name&order=asc`).flush(emptyPage(2, 25, 3));
    expect(component.page()).toBe(2);
  });

  it('filters by category from the first page', () => {
    component.category.set('LEGS');
    component.loadPage(1);
    httpMock
      .expectOne(`${base}?page=1&limit=10&category=LEGS&sort=name&order=asc`)
      .flush(emptyPage(1, 0, 0));
    expect(component.totalPages()).toBe(1);
  });

  it('soft delete and hard delete send different requests, then reload the list', () => {
    const exercise = { _id: 'e1', name: 'Plancha', category: 'CORE' as const, sets: 3, reps: 30 };

    component.askDelete(exercise);
    component.softDelete();
    const soft = httpMock.expectOne(`${base}/e1`);
    expect(soft.request.method).toBe('DELETE');
    soft.flush(null);
    httpMock.expectOne(`${base}?page=1&limit=10&sort=name&order=asc`).flush(emptyPage(1, 0, 0));

    component.askDelete(exercise);
    component.hardDelete();
    const hard = httpMock.expectOne(`${base}/e1/hard`);
    expect(hard.request.method).toBe('DELETE');
    hard.flush(null);
    httpMock.expectOne(`${base}?page=1&limit=10&sort=name&order=asc`).flush(emptyPage(1, 0, 0));

    expect(component.exerciseToDelete()).toBeNull();
  });

  it('sorting by the same column twice flips the order', () => {
    component.sortBy('reps');
    httpMock.expectOne(`${base}?page=1&limit=10&sort=reps&order=asc`).flush(emptyPage(1, 0, 0));
    component.sortBy('reps');
    httpMock.expectOne(`${base}?page=1&limit=10&sort=reps&order=desc`).flush(emptyPage(1, 0, 0));
    expect(component.order()).toBe('desc');
  });
});
