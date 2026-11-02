import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Author, BOOK_LANGUAGES, BOOK_TAGS, Book, BookLanguage, CreateBook } from '../../models';
import { LanguageNamePipe } from '../../pipes/language-name-pipe';
import { AuthorService } from '../../services/author.service';
import { BookService } from '../../services/book.service';
import { apiErrorMessage } from '../../utils/api-error';
import { removeEmpty } from '../../utils/remove-empty';
import { ConfirmModal } from '../confirm-modal/confirm-modal';

@Component({
  selector: 'app-book-form',
  imports: [ReactiveFormsModule, RouterLink, ConfirmModal, LanguageNamePipe],
  templateUrl: './book-form.html',
  styleUrl: './book-form.css',
})
export class BookForm implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private bookService = inject(BookService);
  private authorService = inject(AuthorService);
  private router = inject(Router);

  // Igual que en el formulario de autores: en books/:id/edit llega el id, en books/new no
  id = input<string>();

  // Opciones de los select
  authors = signal<Author[]>([]);
  readonly languages = BOOK_LANGUAGES;
  readonly tags = BOOK_TAGS;

  loading = signal(false);
  loadFailed = signal(false);
  saving = signal(false);
  // Controla si se muestra el modal de "¿Seguro que quieres guardar?"
  confirmSave = signal(false);
  error = signal('');

  form = this.fb.group({
    title: ['', [Validators.required, Validators.pattern(/\S/)]],
    isbn: ['', [Validators.required, Validators.pattern(/\S/)]],
    authors: [[] as string[], Validators.required],
    description:[``],
    publishedYear: this.fb.control<number | null>(null, [
      Validators.min(1450),
      Validators.max(2100),
    ]),
    pages: this.fb.control<number | null>(null, Validators.min(1)),
    language: ['es' as BookLanguage],
    tags: [[] as string[]],
    price: this.fb.control<number | null>(null, Validators.min(0)),
  });

  ngOnInit(): void {
    // Los autores hacen falta siempre, son las opciones para elegir los autores del libro
    this.authorService.getAuthors(1, 100).subscribe({
      next: (response) => this.authors.set(response.authors),
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err)),
    });

    const id = this.id();
    if (!id) {
      return;
    }

    this.loading.set(true);
    this.bookService.getBook(id).subscribe({
      next: (response) => {
        this.fillForm(response.book);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.loadFailed.set(true);
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Antes de guardar se pide confirmación: solo se abre el modal
    this.confirmSave.set(true);
  }

  // Si el usuario cancela, se cierra el modal y el formulario se queda como está
  cancelSave(): void {
    this.confirmSave.set(false);
  }

  // Si el usuario acepta, se cierra el modal y se guarda como antes
  doSave(): void {
    this.confirmSave.set(false);

    const id = this.id();
    const book = removeEmpty(this.form.getRawValue()) as CreateBook;
    const request = id ? this.bookService.updateBook(id, book) : this.bookService.createBook(book);

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: () => this.router.navigate(['/books'], { replaceUrl: true }),
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.saving.set(false);
      },
    });
  }

  private fillForm(book: Book): void {
    this.form.patchValue({
      title: book.title,
      isbn: book.isbn,
      // La API manda los autores enteros (populate), pero el select trabaja con sus ids
      authors: book.authors.map((author) => author._id),
      description:book.description ?? ``,
      publishedYear: book.publishedYear ?? null,
      pages: book.pages ?? null,
      language: book.language ?? 'es',
      tags: book.tags ?? [],
      price: book.price ?? null,
    });
  }
}
