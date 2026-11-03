import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { LoginResponse } from '../models';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const loginResponse: LoginResponse = {
    token: 'access-1',
    refreshToken: 'refresh-1',
    user: { _id: 'u1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN' },
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('starts without a session', () => {
    expect(service.user()).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.getToken()).toBeNull();
  });

  it('register() posts name, email and password and does not start a session', () => {
    service.register({ name: 'Ana', email: 'ana@example.com', password: 'seminari7' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'seminari7',
    });
    req.flush({ user: { ...loginResponse.user, role: 'USER' } });

    expect(service.isLoggedIn()).toBe(false);
  });

  it('login() stores both tokens and the user', () => {
    service.login({ email: 'admin@example.com', password: 'seminari7' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/admin/login`).flush(loginResponse);

    expect(service.getToken()).toBe('access-1');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-1');
    expect(service.user()).toEqual(loginResponse.user);
    expect(service.isAdmin()).toBe(true);
  });

  it('a failed login does not store anything', () => {
    service
      .login({ email: 'admin@example.com', password: 'mala12345' })
      .subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${environment.apiUrl}/auth/admin/login`)
      .flush(
        { message: 'Email o contraseña incorrectos' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(service.isLoggedIn()).toBe(false);
    expect(service.getToken()).toBeNull();
  });

  it('refresh() sends the refresh token and stores the new access token', () => {
    localStorage.setItem('refreshToken', 'refresh-1');
    let newToken = '';
    service.refresh().subscribe((token) => (newToken = token));

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush({ token: 'access-2' });

    expect(newToken).toBe('access-2');
    expect(service.getToken()).toBe('access-2');
  });

  it('refresh() fails without calling the API when there is no refresh token', () => {
    let failed = false;
    service.refresh().subscribe({ error: () => (failed = true) });

    httpMock.expectNone(`${environment.apiUrl}/auth/refresh`);
    expect(failed).toBe(true);
  });

  it('logout() clears the session and goes to the login page', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    service.login({ email: 'admin@example.com', password: 'seminari7' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/admin/login`).flush(loginResponse);

    service.logout();

    expect(service.user()).toBeNull();
    expect(service.getToken()).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
