import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  const exercisesUrl = `${environment.apiUrl}/exercises`;
  const refreshUrl = `${environment.apiUrl}/auth/refresh`;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'access-1');
    localStorage.setItem('refreshToken', 'refresh-1');
    localStorage.setItem(
      'user',
      JSON.stringify({ _id: 'u1', name: 'Admin', email: 'a@b.c', role: 'ADMIN' }),
    );

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('adds the Authorization header with the stored token', () => {
    http.get(exercisesUrl).subscribe();

    const req = httpMock.expectOne(exercisesUrl);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    req.flush({});
  });

  it('does not add the header to the /auth routes', () => {
    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('renews an expired token and repeats the request with the new one', () => {
    let response: unknown;
    http.get(exercisesUrl).subscribe((res) => (response = res));

    httpMock
      .expectOne(exercisesUrl)
      .flush({ message: 'El token ha caducado' }, { status: 401, statusText: 'Unauthorized' });

    const refresh = httpMock.expectOne(refreshUrl);
    expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
    refresh.flush({ token: 'access-2' });

    const retry = httpMock.expectOne(exercisesUrl);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({ exercises: [] });

    expect(response).toEqual({ exercises: [] });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('logs out when the token cannot be renewed', () => {
    let failed = false;
    http.get(exercisesUrl).subscribe({ error: () => (failed = true) });

    httpMock
      .expectOne(exercisesUrl)
      .flush({ message: 'El token ha caducado' }, { status: 401, statusText: 'Unauthorized' });
    httpMock
      .expectOne(refreshUrl)
      .flush({ message: 'El token ha caducado' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(localStorage.getItem('token')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('logs out on any other 401 without trying to renew', () => {
    http.get(exercisesUrl).subscribe({ error: () => undefined });

    httpMock
      .expectOne(exercisesUrl)
      .flush({ message: 'Token no válido' }, { status: 401, statusText: 'Unauthorized' });

    httpMock.expectNone(refreshUrl);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('lets other errors through without touching the session', () => {
    let status = 0;
    http.get(exercisesUrl).subscribe({ error: (err) => (status = err.status) });

    httpMock
      .expectOne(exercisesUrl)
      .flush({ message: 'Necesitas el rol admin' }, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
    expect(localStorage.getItem('token')).toBe('access-1');
    expect(navigate).not.toHaveBeenCalled();
  });
});
