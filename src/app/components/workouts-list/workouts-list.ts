import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import { DAYS_OF_WEEK, DAY_LABELS, DayOfWeek, SortOrder, Workout } from '../../models';
import { TruncatePipe } from '../../pipes/truncate-pipe';
import { WorkoutService } from '../../services/workout.service';
import { apiErrorMessage } from '../../utils/api-error';
import { Pagination } from '../pagination/pagination';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-workouts-list',
  imports: [FormsModule, RouterLink, TruncatePipe, Pagination],
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
