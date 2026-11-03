import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import { SortOrder, UserSummary } from '../../models';
import { BulkDeleteResponse } from '../../models/page.model';
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
                this.selected.set(new Set());
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

  // Selección para el borrado múltiple: ids de las filas marcadas en la página actual
  selected = signal<Set<string>>(new Set());
  selectedCount = computed(() => this.selected().size);
  allSelected = computed(
    () => this.users().length > 0 && this.users().every((item) => this.selected().has(item._id)),
  );
  // Modal de borrado abierto para las filas seleccionadas (en vez de para una sola)
  bulkOpen = signal(false);
  modalName = computed(() =>
    this.bulkOpen() ? `${this.selectedCount()} usuarios seleccionados` : (this.userToDelete()?.name ?? ''),
  );
  modalCount = computed(() => (this.bulkOpen() ? this.selectedCount() : 1));
  modalAllowSoft = computed(() => {
    if (this.bulkOpen()) {
      // Si todos los marcados ya estaban borrados lógicamente, solo queda el borrado definitivo
      return this.users().some((item) => this.selected().has(item._id) && !item.isDeleted);
    }
    return !this.userToDelete()?.isDeleted;
  });

  toggleSelect(id: string): void {
    const next = new Set(this.selected());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selected.set(next);
  }

  /** Marca o desmarca todas las filas de la página */
  toggleAll(): void {
    this.selected.set(
      this.allSelected() ? new Set() : new Set(this.users().map((item) => item._id)),
    );
  }

  askBulkDelete(): void {
    if (this.selectedCount() > 0) {
      this.bulkOpen.set(true);
    }
  }
  readonly hardNote = '';

  askDelete(user: UserSummary): void {
    this.userToDelete.set(user);
  }

  cancelDelete(): void {
    this.userToDelete.set(null);
    this.bulkOpen.set(false);
  }

  /** Borrado lógico: DELETE /users/:id, la API solo marca isDeleted */
  softDelete(): void {
    if (this.bulkOpen()) {
      this.runBulkDelete((ids) => this.userService.softDeleteManyUsers(ids));
      return;
    }
    this.runDelete((id) => this.userService.softDeleteUser(id));
  }

  /** Borrado definitivo: DELETE /users/:id/hard, se elimina de la base de datos */
  hardDelete(): void {
    if (this.bulkOpen()) {
      this.runBulkDelete((ids) => this.userService.hardDeleteManyUsers(ids));
      return;
    }
    this.runDelete((id) => this.userService.hardDeleteUser(id));
  }

  private runBulkDelete(request: (ids: string[]) => Observable<BulkDeleteResponse>): void {
    const ids = [...this.selected()];
    if (ids.length === 0) {
      return;
    }

    this.deleting.set(true);
    this.error.set('');
    request(ids).subscribe({
      next: () => {
        // Si se han quitado todas las filas de la página, vuelvo a la anterior
        const wasAll = ids.length >= this.users().length && this.page() > 1;
        this.bulkOpen.set(false);
        this.deleting.set(false);
        this.selected.set(new Set());
        this.loadPage(wasAll ? this.page() - 1 : this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.bulkOpen.set(false);
        this.deleting.set(false);
      },
    });
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
