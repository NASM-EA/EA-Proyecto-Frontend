import { HttpParams } from '@angular/common/http';

// Construye ?page=&limit=&... con los parámetros que tienen valor. Los vacíos se omiten,
// porque la API (Joi) rechaza con 422 un filtro vacío como category=
export function buildListParams(params: object): HttpParams {
  let httpParams = new HttpParams();

  for (const [key, value] of Object.entries(params)) {
    const text = typeof value === 'string' ? value.trim() : value;
    if (text !== undefined && text !== null && text !== '') {
      httpParams = httpParams.set(key, String(text));
    }
  }

  return httpParams;
}
