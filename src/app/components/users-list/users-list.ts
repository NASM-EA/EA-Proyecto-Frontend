import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import { SortOrder, UserSummary } from '../../models';
import { UserService } from '../../services/user.service';
import { apiErrorMessage } from '../../utils/api-error';
import { DeleteModal } from '../delete-modal/delete-modal';
import { Pagination } from '../pagination/pagination';

const PAGE_SIZE = 10;

// GET /users solo devuelve el id y el nombre, así que el listado enseña solo el nombre.
// El email y el rol se ven al pulsar Editar (GET /users/:id, solo ADMIN)
@Component({
  selector: 'app-users-list',
  imports: [FormsModule, RouterLink, Pagination, DeleteModal],
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

  // Elemento que se está borrando (abre el modal con las dos opciones de borrado)
  userToDelete = signal<UserSummary | null>(null);
  deleting = signal(false);
  readonly hardNote = '';

  askDelete(user: UserSummary): void {
    this.userToDelete.set(user);
  }

  cancelDelete(): void {
    this.userToDelete.set(null);
  }

  /** Borrado lógico: DELETE /users/:id, la API solo marca isDeleted */
  softDelete(): void {
    this.runDelete((id) => this.userService.softDeleteUser(id));
  }

  /** Borrado definitivo: DELETE /users/:id/hard, se elimina de la base de datos */
  hardDelete(): void {
    this.runDelete((id) => this.userService.hardDeleteUser(id));
  }

  private runDelete(request: (id: string) => Observable<void>): void {
    const user = this.userToDelete();
    if (!user) {
      return;
    }

    this.deleting.set(true);
    this.error.set('');
    request(user._id).subscribe({
      next: () => {
        // Si era el último de la página, vuelvo a la anterior para no quedarme en una página vacía
        const wasLast = this.users().length === 1 && this.page() > 1;
        this.userToDelete.set(null);
        this.deleting.set(false);
        this.loadPage(wasLast ? this.page() - 1 : this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.userToDelete.set(null);
        this.deleting.set(false);
      },
    });
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
