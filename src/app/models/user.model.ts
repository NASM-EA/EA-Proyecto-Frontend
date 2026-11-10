import type { ListParams, PageInfo } from './page.model';

// Los mismos valores que acepta el modelo User del backend
export const USER_ROLES = ['ADMIN', 'USER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// El usuario tal como lo devuelve la API (nunca trae la contraseña)
export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// GET /users solo devuelve el id y el nombre
export interface UserSummary {
  _id: string;
  name: string;
  // Solo lo manda la API a los ADMIN (GET /users)
  isDeleted?: boolean;
}

export interface UsersPage {
  users: UserSummary[];
  pagination: PageInfo;
}

export type UserListParams = ListParams;

// POST /users y PUT /users/:id. Al editar la contraseña es opcional
export interface UserInput {
  name: string;
  email: string;
  password?: string;
  role?: UserRole;
}

// POST /auth/register
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
}

// POST /auth/login
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// POST /auth/refresh
export interface RefreshResponse {
  token: string;
}
