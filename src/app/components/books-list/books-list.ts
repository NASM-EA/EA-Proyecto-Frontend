import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, finalize, switchMap, tap } from 'rxjs';

import { Book } from '../../models';
import { LanguageNamePipe } from '../../pipes/language-name-pipe';
import { TruncatePipe } from '../../pipes/truncate-pipe';
import { BookService } from '../../services/book.service';
import { apiErrorMessage } from '../../utils/api-error';
import { Pagination } from '../pagination/pagination';
import { ConfirmModal } from '../confirm-modal/confirm-modal';
import { ViewMode, ViewToggle, savedViewMode } from '../view-toggle/view-toggle';

// Se conserva el tamaño actual de página de la interfaz.
const PAGE_SIZE = 4;

@Component({
  selector: 'app-books-list',
  imports: [FormsModule, RouterLink, CurrencyPipe, LanguageNamePipe, TruncatePipe, Pagination, ConfirmModal, ViewToggle],
  templateUrl: './books-list.html',
  styleUrl: './books-list.css',
})
export class BooksList implements OnInit {
  private bookService = inject(BookService);
  private pageRequests = new Subject<{ page: number; search: string; sort: string; order: string }>();

  books = signal<Book[]>([]);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(true);
  error = signal('');

  search = signal('');
  page = signal(1);

  // Columna por la que se ordena (vacío = sin ordenar) y sentido: 'asc' o 'desc'
  sortField = signal('');
  sortOrder = signal('asc');

  // Igual que en autores: tabla o tarjetas, y lo guardo en el navegador
  viewMode = signal<ViewMode>(savedViewMode('books-view'));
  private saveViewMode = effect(() => localStorage.setItem('books-view', this.viewMode()));

  bookToDelete = signal<Book | null>(null);
  
  deleteBook(book: Book): void {
  this.bookToDelete.set(book);
}

  deleteMessage = computed(() => {
    const book = this.bookToDelete();
    return book
      ? `¿Borrar el libro "${book.title}"?`
      : '';
  });
  pageBooks = computed(() => this.books());

  constructor() {
    this.pageRequests
      .pipe(
        switchMap(({ page, search, sort, order }) => {
          this.loading.set(true);
          this.error.set('');
          return this.bookService.getBooks(page, PAGE_SIZE, search, sort, order).pipe(
            tap((response) => {
              this.books.set(response.books);
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

  confirmDelete(): void {
    const book = this.bookToDelete();
    if (!book) {
      return;
    }

    this.error.set('');
    this.bookService.deleteBook(book._id).subscribe({
      next: () => {
        this.total.update((total) => Math.max(0, total - 1));
        const totalPages = Math.max(1, Math.ceil(this.total() / PAGE_SIZE));
        this.totalPages.set(totalPages);
        this.bookToDelete.set(null);
        this.loadPage(Math.min(this.page(), totalPages));
      },
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
    });
  }

  cancelDelete(): void {
    this.bookToDelete.set(null);
  }
}
