import type { Exercise } from './exercise.model';
import type { ListParams, PageInfo } from './page.model';

// Los mismos valores que acepta el modelo Workout del backend
export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

// Al crear o editar, los ejercicios se envían como lista de ids
export interface WorkoutInput {
  name: string;
  dayOfWeek: DayOfWeek;
  description?: string;
  exercises?: string[];
}

// Al leer, la API devuelve los ejercicios enteros (populate). Solo la respuesta de
// crear devuelve ids sueltos, y el frontend no la usa para pintar nada
export interface Workout {
  _id: string;
  name: string;
  dayOfWeek: DayOfWeek;
  description?: string;
  exercises: Exercise[];
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkoutsPage {
  workouts: Workout[];
  pagination: PageInfo;
}

export interface WorkoutListParams extends ListParams {
  dayOfWeek?: DayOfWeek | '';
}
