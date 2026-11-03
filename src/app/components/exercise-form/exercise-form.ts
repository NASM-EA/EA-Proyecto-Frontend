import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  EXERCISE_CATEGORIES,
  EXERCISE_CATEGORY_LABELS,
  Exercise,
  ExerciseCategory,
  ExerciseInput,
} from '../../models';
import { ExerciseService } from '../../services/exercise.service';
import { apiErrorMessage } from '../../utils/api-error';
import { ConfirmModal } from '../confirm-modal/confirm-modal';

@Component({
  selector: 'app-exercise-form',
  imports: [ReactiveFormsModule, RouterLink, ConfirmModal],
  templateUrl: './exercise-form.html',
  styles: `
    :host {
      display: block;
      max-width: 560px;
    }
  `,
})
export class ExerciseForm implements OnInit {
  private fb = inject(NonNullableFormBuilder);
  private exerciseService = inject(ExerciseService);
  private router = inject(Router);

  // Viene del :id de la ruta. En exercises/new no hay id y el formulario sirve para crear
  id = input<string>();

  readonly categories = EXERCISE_CATEGORIES;
  readonly categoryLabels = EXERCISE_CATEGORY_LABELS;

  loading = signal(false);
  loadFailed = signal(false);
  saving = signal(false);
  // Aviso de confirmación que se enseña antes de enviar el formulario
  confirmOpen = signal(false);
  error = signal('');

  form = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    category: ['CHEST' as ExerciseCategory, Validators.required],
    sets: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    reps: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) {
      return;
    }

    this.loading.set(true);
    this.exerciseService.getExercise(id).subscribe({
      next: (response) => {
        this.fillForm(response.exercise);
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
    // La API reemplaza el ejercicio entero al editar, así que se envían todos los campos
    const exercise: ExerciseInput = this.form.getRawValue();
    const request = id
      ? this.exerciseService.updateExercise(id, exercise)
      : this.exerciseService.createExercise(exercise);

    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: () => this.router.navigate(['/exercises'], { replaceUrl: true }),
      error: (err: HttpErrorResponse) => {
        this.error.set(apiErrorMessage(err));
        this.saving.set(false);
      },
    });
  }

  private fillForm(exercise: Exercise): void {
    this.form.patchValue({
      name: exercise.name,
      category: exercise.category,
      sets: exercise.sets,
      reps: exercise.reps,
    });
  }
}
