import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  const url = `${environment.apiUrl}/users`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getUsers() requests a page of { _id, name }', () => {
    service.getUsers({ page: 1, limit: 10, sort: 'name', order: 'asc' }).subscribe();
    const req = httpMock.expectOne(`${url}?page=1&limit=10&sort=name&order=asc`);
    expect(req.request.method).toBe('GET');
    req.flush({ users: [{ _id: 'u1', name: 'Ana' }], pagination: {} });
  });

  it('createUser() posts the payload with the role', () => {
    service
      .createUser({ name: 'Ana', email: 'ana@example.com', password: 'seminari7', role: 'ADMIN' })
      .subscribe();
    const req = httpMock.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.role).toBe('ADMIN');
    req.flush({ user: {} });
  });

  it('softDeleteUser() sends DELETE to the id url', () => {
    service.softDeleteUser('u1').subscribe();
    const req = httpMock.expectOne(`${url}/u1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('hardDeleteUser() sends DELETE to the /hard url', () => {
    service.hardDeleteUser('u1').subscribe();
    const req = httpMock.expectOne(`${url}/u1/hard`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('updateUser() puts without password when it is not sent', () => {
    service.updateUser('u1', { name: 'Ana', email: 'ana@example.com', role: 'USER' }).subscribe();
    const req = httpMock.expectOne(`${url}/u1`);
    expect(req.request.method).toBe('PUT');
    expect('password' in req.request.body).toBe(false);
    req.flush({ user: {} });
  });
});
