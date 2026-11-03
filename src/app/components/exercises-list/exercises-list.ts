import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import {
  EXERCISE_CATEGORIES,
  EXERCISE_CATEGORY_LABELS,
  Exercise,
  ExerciseCategory,
  SortOrder,
} from '../../models';
import { BulkDeleteResponse } from '../../models/page.model';
import { ExerciseService } from '../../services/exercise.service';
import { apiErrorMessage } from '../../utils/api-error';
import { DeleteModal } from '../delete-modal/delete-modal';
import { Pagination } from '../pagination/pagination';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-exercises-list',
  imports: [FormsModule, RouterLink, Pagination, DeleteModal],
  templateUrl: './exercises-list.html',
})
export class ExercisesList implements OnInit {
  private exerciseService = inject(ExerciseService);
  private pageRequests = new Subject<number>();

  readonly categories = EXERCISE_CATEGORIES;
  readonly categoryLabels = EXERCISE_CATEGORY_LABELS;

  exercises = signal<Exercise[]>([]);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(true);
  error = signal('');

  // Buscador, filtro y orden. Cualquier cambio vuelve a pedir la página 1
  search = signal('');
  category = signal<ExerciseCategory | ''>('');
  sort = signal('name');
  order = signal<SortOrder>('asc');
  page = signal(1);

  constructor() {
    this.pageRequests
      .pipe(
        switchMap((page) => {
          this.loading.set(true);
          this.error.set('');
          return this.exerciseService
            .getExercises({
              page,
              limit: PAGE_SIZE,
              search: this.search(),
              category: this.category(),
              sort: this.sort(),
              order: this.order(),
            })
            .pipe(
              tap((response) => {
                this.exercises.set(response.exercises);
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
  exerciseToDelete = signal<Exercise | null>(null);
  deleting = signal(false);

  // Selección para el borrado múltiple: ids de las filas marcadas en la página actual
  selected = signal<Set<string>>(new Set());
  selectedCount = computed(() => this.selected().size);
  allSelected = computed(
    () => this.exercises().length > 0 && this.exercises().every((item) => this.selected().has(item._id)),
  );
  // Modal de borrado abierto para las filas seleccionadas (en vez de para una sola)
  bulkOpen = signal(false);
  modalName = computed(() =>
    this.bulkOpen() ? `${this.selectedCount()} ejercicios seleccionados` : (this.exerciseToDelete()?.name ?? ''),
  );
  modalCount = computed(() => (this.bulkOpen() ? this.selectedCount() : 1));
  modalAllowSoft = computed(() => {
    if (this.bulkOpen()) {
      // Si todos los marcados ya estaban borrados lógicamente, solo queda el borrado definitivo
      return this.exercises().some((item) => this.selected().has(item._id) && !item.isDeleted);
    }
    return !this.exerciseToDelete()?.isDeleted;
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
      this.allSelected() ? new Set() : new Set(this.exercises().map((item) => item._id)),
    );
  }

  askBulkDelete(): void {
    if (this.selectedCount() > 0) {
      this.bulkOpen.set(true);
    }
  }
  readonly hardNote = 'También se quita de las rutinas que lo usaban.';

  askDelete(exercise: Exercise): void {
    this.exerciseToDelete.set(exercise);
  }

  cancelDelete(): void {
    this.exerciseToDelete.set(null);
    this.bulkOpen.set(false);
  }

  /** Borrado lógico: DELETE /exercises/:id, la API solo marca isDeleted */
  softDelete(): void {
    if (this.bulkOpen()) {
      this.runBulkDelete((ids) => this.exerciseService.softDeleteManyExercises(ids));
      return;
    }
    this.runDelete((id) => this.exerciseService.softDeleteExercise(id));
  }

  /** Borrado definitivo: DELETE /exercises/:id/hard, se elimina de la base de datos */
  hardDelete(): void {
    if (this.bulkOpen()) {
      this.runBulkDelete((ids) => this.exerciseService.hardDeleteManyExercises(ids));
      return;
    }
    this.runDelete((id) => this.exerciseService.hardDeleteExercise(id));
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
        const wasAll = ids.length >= this.exercises().length && this.page() > 1;
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
    const exercise = this.exerciseToDelete();
    if (!exercise) {
      return;
    }

    this.deleting.set(true);
    this.error.set('');
    request(exercise._id).subscribe({
      next: () => {
        // Si era el último de la página, vuelvo a la anterior para no quedarme en una página vacía
        const wasLast = this.exercises().length === 1 && this.page() > 1;
        this.exerciseToDelete.set(null);
        this.deleting.set(false);
        this.loadPage(wasLast ? this.page() - 1 : this.page());
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.exerciseToDelete.set(null);
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
