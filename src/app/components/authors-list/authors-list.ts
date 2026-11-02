import { DatePipe, NgStyle, UpperCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import { Author } from '../../models';
import { AuthorService } from '../../services/author.service';
import { apiErrorMessage } from '../../utils/api-error';
import { AuthorCard } from '../author-card/author-card';
import { Pagination } from '../pagination/pagination';
import { ConfirmModal } from '../confirm-modal/confirm-modal';
import { ViewMode, ViewToggle, savedViewMode } from '../view-toggle/view-toggle';

// Se conserva el tamaño actual de página de la interfaz.
const PAGE_SIZE = 4;

@Component({
  selector: 'app-authors-list',
  imports: [FormsModule, RouterLink, DatePipe, UpperCasePipe, NgStyle, AuthorCard, Pagination, ConfirmModal, ViewToggle],
  templateUrl: './authors-list.html',
  styleUrl: './authors-list.css',
})
export class AuthorsList implements OnInit {
  private authorService = inject(AuthorService);
  private router = inject(Router);
  private pageRequests = new Subject<{ page: number; search: string; sort: string; order: string }>();

  // Antes: authors: Author[] = [];
  authors = signal<Author[]>([]);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(true);
  error = signal('');

  // Texto del buscador (va con [(ngModel)]) y página en la que estoy
  search = signal('');
  page = signal(1);

  // Columna por la que se ordena (vacío = sin ordenar) y sentido: 'asc' o 'desc'
  sortField = signal('');
  sortOrder = signal('asc');

  // Tabla o tarjetas. Cada vez que cambia lo guardo, así al volver sigue igual
  viewMode = signal<ViewMode>(savedViewMode('authors-view'));
  private saveViewMode = effect(() => localStorage.setItem('authors-view', this.viewMode()));

  authorToDelete = signal<Author | null>(null);

  deleteMessage = computed(() => {
    const author = this.authorToDelete();
    return author
      ? `¿Borrar a ${author.name}? Sus libros no se borran y seguirán mostrándolo como autor.`
      : '';
  });

  pageAuthors = computed(() => this.authors());

  constructor() {
    this.pageRequests
      .pipe(
        switchMap(({ page, search, sort, order }) => {
          this.loading.set(true);
          this.error.set('');
          return this.authorService.getAuthors(page, PAGE_SIZE, search, sort, order).pipe(
            tap((response) => {
              this.authors.set(response.authors);
              this.total.set(response.total);
              this.totalPages.set(Math.max(response.pages, 1));
              this.page.set(response.page);
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
    this.pageRequests.next({
      page,
      search: this.search().trim(),
      sort: this.sortField(),
      order: this.sortOrder(),
    });
  }

  // Ordena por la columna pulsada: la primera vez ascendente, si se vuelve a pulsar descendente.
  // Si se pulsa otra columna, empieza otra vez en ascendente. Siempre vuelve a la página 1.
  sortBy(field: string): void {
    if (this.sortField() === field && this.sortOrder() === 'asc') {
      this.sortOrder.set('desc');
    } else {
      this.sortField.set(field);
      this.sortOrder.set('asc');
    }
    this.loadPage(1);
  }

  // Devuelve la flecha (▲ / ▼) de la columna que está ordenando y nada en las demás
  sortArrow(field: string): string {
    if (this.sortField() !== field) {
      return '';
    }
    return this.sortOrder() === 'asc' ? '▲' : '▼';
  }

  edit(author: Author): void {
    // Además del :id en la URL, le paso el autor entero en el state de la navegación.
    // Así el formulario no tiene que volver a pedirlo a la API
    this.router.navigate(['/authors', author._id, 'edit'], { state: { author } });
  }

    deleteAuthor(author: Author): void {
    this.authorToDelete.set(author);
  }

  confirmDelete(): void {
    const author = this.authorToDelete();
    if (!author) {
      return;
    }

    this.error.set('');
    this.authorService.deleteAuthor(author._id).subscribe({
      // Recarga la página para mantenerla completa y ajustar la última tras un borrado.
      next: () => {
        this.total.update((total) => Math.max(0, total - 1));
        const totalPages = Math.max(1, Math.ceil(this.total() / PAGE_SIZE));
        this.totalPages.set(totalPages);
        this.authorToDelete.set(null);
        this.loadPage(Math.min(this.page(), totalPages));
      },
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
    });
  }

  cancelDelete(): void {
    this.authorToDelete.set(null);
  }
}
