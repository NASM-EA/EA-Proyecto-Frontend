// Datos de paginación que acompañan a cada listado de la API
export interface PageInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type SortOrder = 'asc' | 'desc';

// Parámetros comunes a todos los listados (?page=&limit=&search=&sort=&order=)
export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: SortOrder;
}

// Respuesta del borrado múltiple: cuántos elementos se han borrado de verdad
export interface BulkDeleteResponse {
  deleted: number;
}
