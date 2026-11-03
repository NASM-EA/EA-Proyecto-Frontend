import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { adminGuard, authGuard, guestGuard } from './auth.guard';

describe('auth guards', () => {
  // Un guard funcional usa inject(), así que hay que llamarlo dentro de un contexto de inyección
  function run(guard: CanActivateFn, url = '/books'): boolean | UrlTree {
    return TestBed.runInInjectionContext(
      () =>
        guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot) as boolean | UrlTree,
    );
  }

  function loginAs(role: 'USER' | 'ADMIN'): void {
    localStorage.setItem('user', JSON.stringify({ _id: 'u1', name: 'X', email: 'x@y.z', role }));
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  function setup(): void {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
  }

  it('authGuard sends a visitor without a session to the login, remembering the url', () => {
    setup();
    const result = run(authGuard, '/books');
    expect(result.toString()).toBe('/login?returnUrl=%2Fbooks');
  });

  it('authGuard lets a user with a session in', () => {
    loginAs('USER');
    setup();
    expect(run(authGuard)).toBe(true);
  });

  it('adminGuard sends a user back to the home page', () => {
    loginAs('USER');
    setup();
    expect(run(adminGuard).toString()).toBe('/');
  });

  it('adminGuard lets an admin in', () => {
    loginAs('ADMIN');
    setup();
    expect(run(adminGuard)).toBe(true);
  });

  it('guestGuard sends a user with a session to the home page', () => {
    loginAs('USER');
    setup();
    expect(run(guestGuard).toString()).toBe('/');
  });

  it('guestGuard lets a visitor without a session in', () => {
    setup();
    expect(run(guestGuard)).toBe(true);
  });
});
