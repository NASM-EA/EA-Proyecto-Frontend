import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import { SortOrder, UserSummary } from '../../models';
import { UserService } from '../../services/user.service';
import { apiErrorMessage } from '../../utils/api-error';
import { Pagination } from '../pagination/pagination';

const PAGE_SIZE = 10;

// GET /users solo devuelve el id y el nombre, así que el listado enseña solo el nombre.
// El email y el rol se ven al pulsar Editar (GET /users/:id, solo ADMIN)
@Component({
  selector: 'app-users-list',
  imports: [FormsModule, RouterLink, Pagination],
  templateUrl: './users-list.html',
})
export class UsersList implements OnInit {
  private userService = inject(UserService);
  private pageRequests = new Subject<number>();

  users = signal<UserSummary[]>([]);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(true);
  error = signal('');

  search = signal('');
  order = signal<SortOrder>('asc');
  page = signal(1);

  constructor() {
    this.pageRequests
      .pipe(
        switchMap((page) => {
          this.loading.set(true);
          this.error.set('');
          return this.userService
            .getUsers({ page, limit: PAGE_SIZE, search: this.search(), sort: 'name', order: this.order() })
            .pipe(
              tap((response) => {
                this.users.set(response.users);
                this.total.set(response.pagination.total);
                this.totalPages.set(Math.max(response.pagination.totalPages, 1));
                this.page.set(response.pagination.page);
              }),
              catchError((err: HttpErrorResponse) => {
                this.error.set(apiErrorMessage(err));
                return EMPTY;
              }),
              finalize(() => this.loading.set(false)),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.page.set(page);
    this.pageRequests.next(page);
  }

  toggleOrder(): void {
    this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    this.loadPage(1);
  }
}
