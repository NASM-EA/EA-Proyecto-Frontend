import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import {
  EXERCISE_CATEGORIES,
  EXERCISE_CATEGORY_LABELS,
  Exercise,
  ExerciseCategory,
  SortOrder,
} from '../../models';
import { ExerciseService } from '../../services/exercise.service';
import { apiErrorMessage } from '../../utils/api-error';
import { Pagination } from '../pagination/pagination';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-exercises-list',
  imports: [FormsModule, RouterLink, Pagination],
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
