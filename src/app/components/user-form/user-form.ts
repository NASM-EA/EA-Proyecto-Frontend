import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { USER_ROLES, User, UserInput, UserRole } from '../../models';
import { UserService } from '../../services/user.service';
import { apiErrorMessage } from '../../utils/api-error';
import { ConfirmModal } from '../confirm-modal/confirm-modal';

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, RouterLink, ConfirmModal],
  templateUrl: './user-form.html',
  styles: `
    :host {
      display: block;
      max-width: 560px;
    }
  `,
})
export class UserForm implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private userService = inject(UserService);
  private router = inject(Router);

  // Viene del :id de la ruta. En users/new no hay id y el formulario sirve para crear
  id = input<string>();

  readonly roles = USER_ROLES;

  loading = signal(false);
  loadFailed = signal(false);
  saving = signal(false);
  // Aviso de confirmación que se enseña antes de enviar el formulario
  confirmOpen = signal(false);
  error = signal('');

  form = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    // Al crear es obligatoria; al editar es opcional (ver ngOnInit)
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['USER' as UserRole],
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) {
      return;
    }

    // Al editar, dejar la contraseña vacía conserva la que ya tenía
    this.form.controls.password.setValidators([Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();

    this.loading.set(true);
    this.userService.getUser(id).subscribe({
      next: (response) => {
        this.fillForm(response.user);
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

    // No se guarda hasta que el usuario confirma en el aviso
    this.confirmOpen.set(true);
  }

  cancelSave(): void {
    this.confirmOpen.set(false);
  }

  confirmSave(): void {
    this.confirmOpen.set(false);

    const id = this.id();
    const { password, ...rest } = this.form.getRawValue();
    // La API rechaza (422) una contraseña vacía: si no se escribe, no se envía
    const user: UserInput = password ? { ...rest, password } : rest;
    const request = id
      ? this.userService.updateUser(id, user)
      : this.userService.createUser(user);

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: () => this.router.navigate(['/users'], { replaceUrl: true }),
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.saving.set(false);
      },
    });
  }

  private fillForm(user: User): void {
    this.form.patchValue({ name: user.name, email: user.email, role: user.role });
  }
}
