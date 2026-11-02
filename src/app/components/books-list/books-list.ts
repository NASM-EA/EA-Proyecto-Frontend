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
  private pageRequests = new Subject<{ page: number; search: string }>();

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
  // Libros de la página, ordenados en el navegador (provisional: solo afecta a la página visible)
  pageBooks = computed(() => {
    const field = this.sortField();
    // Sin columna elegida se deja el orden que manda la API
    if (!field) {
      return this.books();
    }
    // Copiamos el array para no cambiar el original
    const sortedBooks = [...this.books()];
    sortedBooks.sort((bookA, bookB) => {
      const valueA = this.getBookValue(bookA, field);
      const valueB = this.getBookValue(bookB, field);
      let result = 0;
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        result = valueA - valueB;
      } else {
        result = String(valueA).localeCompare(String(valueB));
      }
      // Si el orden es descendente damos la vuelta al resultado
      return this.sortOrder() === 'asc' ? result : -result;
    });
    return sortedBooks;
  });

  // Devuelve el valor de un libro en la columna indicada, para poder compararlo al ordenar
  getBookValue(book: Book, field: string): string | number {
    if (field === 'title') {
      return book.title;
    }
    if (field === 'authors') {
      // Se ordena por el nombre del primer autor (si no tiene autores, texto vacío)
      return book.authors.length > 0 ? book.authors[0].name : '';
    }
    if (field === 'language') {
      return book.language ?? '';
    }
    if (field === 'publishedYear') {
      return book.publishedYear ?? 0;
    }
    return book.price ?? 0;
  }

  constructor() {
    this.pageRequests
      .pipe(
        switchMap(({ page, search }) => {
          this.loading.set(true);
          this.error.set('');
          return this.bookService.getBooks(page, PAGE_SIZE, search).pipe(
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
    this.pageRequests.next({ page, search: this.search().trim() });
  }

  // Ordena por la columna pulsada: la primera vez ascendente, si se vuelve a pulsar descendente.
  // Si se pulsa otra columna, empieza otra vez en ascendente.
  // Solo cambia las señales: la lista de la página se reordena sola en el navegador.
  sortBy(field: string): void {
    if (this.sortField() === field && this.sortOrder() === 'asc') {
      this.sortOrder.set('desc');
    } else {
      this.sortField.set(field);
      this.sortOrder.set('asc');
    }
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
