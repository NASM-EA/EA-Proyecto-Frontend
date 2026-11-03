import type { ListParams, PageInfo } from './page.model';

// Los mismos valores que acepta el modelo Exercise del backend
export const EXERCISE_CATEGORIES = [
  'CHEST',
  'BACK',
  'LEGS',
  'SHOULDERS',
  'ARMS',
  'CORE',
  'CARDIO',
] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  CHEST: 'Pecho',
  BACK: 'Espalda',
  LEGS: 'Piernas',
  SHOULDERS: 'Hombros',
  ARMS: 'Brazos',
  CORE: 'Core',
  CARDIO: 'Cardio',
};

export interface ExerciseInput {
  name: string;
  category: ExerciseCategory;
  sets?: number;
  reps?: number;
}

export interface Exercise extends ExerciseInput {
  _id: string;
  sets: number;
  reps: number;
  // Los ADMIN reciben también los borrados lógicamente (isDeleted: true)
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExercisesPage {
  exercises: Exercise[];
  pagination: PageInfo;
}

export interface ExerciseListParams extends ListParams {
  category?: ExerciseCategory | '';
}
