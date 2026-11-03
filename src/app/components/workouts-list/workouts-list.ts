import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import { DAYS_OF_WEEK, DAY_LABELS, DayOfWeek, SortOrder, Workout } from '../../models';
import { BulkDeleteResponse } from '../../models/page.model';
import { TruncatePipe } from '../../pipes/truncate-pipe';
import { WorkoutService } from '../../services/workout.service';
import { apiErrorMessage } from '../../utils/api-error';
import { DeleteModal } from '../delete-modal/delete-modal';
import { Pagination } from '../pagination/pagination';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-workouts-list',
  imports: [FormsModule, RouterLink, TruncatePipe, Pagination, DeleteModal],
  templateUrl: './workouts-list.html',
})
export class WorkoutsList implements OnInit {
  private workoutService = inject(WorkoutService);
  private pageRequests = new Subject<number>();

  readonly days = DAYS_OF_WEEK;
  readonly dayLabels = DAY_LABELS;

  workouts = signal<Workout[]>([]);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(true);
  error = signal('');

  // El buscador de rutinas mira el nombre y la descripción
  search = signal('');
  dayOfWeek = signal<DayOfWeek | ''>('');
  sort = signal('name');
  order = signal<SortOrder>('asc');
  page = signal(1);

  constructor() {
    this.pageRequests
      .pipe(
        switchMap((page) => {
          this.loading.set(true);
          this.error.set('');
          return this.workoutService
            .getWorkouts({
              page,
              limit: PAGE_SIZE,
              search: this.search(),
              dayOfWeek: this.dayOfWeek(),
              sort: this.sort(),
              order: this.order(),
            })
            .pipe(
              tap((response) => {
                this.workouts.set(response.workouts);
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
  workoutToDelete = signal<Workout | null>(null);
  deleting = signal(false);

  // Selección para el borrado múltiple: ids de las filas marcadas en la página actual
  selected = signal<Set<string>>(new Set());
  selectedCount = computed(() => this.selected().size);
  allSelected = computed(
    () => this.workouts().length > 0 && this.workouts().every((item) => this.selected().has(item._id)),
  );
  // Modal de borrado abierto para las filas seleccionadas (en vez de para una sola)
  bulkOpen = signal(false);
  modalName = computed(() =>
    this.bulkOpen() ? `${this.selectedCount()} rutinas seleccionados` : (this.workoutToDelete()?.name ?? ''),
  );
  modalCount = computed(() => (this.bulkOpen() ? this.selectedCount() : 1));
  modalAllowSoft = computed(() => {
    if (this.bulkOpen()) {
      // Si todos los marcados ya estaban borrados lógicamente, solo queda el borrado definitivo
      return this.workouts().some((item) => this.selected().has(item._id) && !item.isDeleted);
    }
    return !this.workoutToDelete()?.isDeleted;
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
      this.allSelected() ? new Set() : new Set(this.workouts().map((item) => item._id)),
    );
  }

  askBulkDelete(): void {
    if (this.selectedCount() > 0) {
      this.bulkOpen.set(true);
    }
  }
  readonly hardNote = 'Sus ejercicios no se borran.';

  askDelete(workout: Workout): void {
    this.workoutToDelete.set(workout);
  }

  cancelDelete(): void {
    this.workoutToDelete.set(null);
    this.bulkOpen.set(false);
  }

  /** Borrado lógico: DELETE /workouts/:id, la API solo marca isDeleted */
  softDelete(): void {
    if (this.bulkOpen()) {
      this.runBulkDelete((ids) => this.workoutService.softDeleteManyWorkouts(ids));
      return;
    }
    this.runDelete((id) => this.workoutService.softDeleteWorkout(id));
  }

  /** Borrado definitivo: DELETE /workouts/:id/hard, se elimina de la base de datos */
  hardDelete(): void {
    if (this.bulkOpen()) {
      this.runBulkDelete((ids) => this.workoutService.hardDeleteManyWorkouts(ids));
      return;
    }
    this.runDelete((id) => this.workoutService.hardDeleteWorkout(id));
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
        const wasAll = ids.length >= this.workouts().length && this.page() > 1;
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
    const workout = this.workoutToDelete();
    if (!workout) {
      return;
    }

    this.deleting.set(true);
    this.error.set('');
    request(workout._id).subscribe({
      next: () => {
        // Si era el último de la página, vuelvo a la anterior para no quedarme en una página vacía
        const wasLast = this.workouts().length === 1 && this.page() > 1;
        this.workoutToDelete.set(null);
        this.deleting.set(false);
        this.loadPage(wasLast ? this.page() - 1 : this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.workoutToDelete.set(null);
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

  /** Pulsar una cabecera ordena por esa columna; pulsarla otra vez invierte el sentido */
  sortBy(column: string): void {
    if (this.sort() === column) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(column);
      this.order.set('asc');
    }
    this.loadPage(1);
  }

  /** Flecha que se pinta junto a la cabecera de la columna activa */
  arrow(column: string): string {
    if (this.sort() !== column) {
      return '';
    }
    return this.order() === 'asc' ? '▲' : '▼';
  }
}
