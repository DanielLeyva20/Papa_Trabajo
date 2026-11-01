import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Avisos } from '../services/avisos';
import { Sesion } from '../services/sesion';

export const MENSAJE_SIN_CONEXION =
  'No hay conexión con el sistema. Revise el internet y vuelva a intentar en unos segundos.';

/** Sin respuesta de la API (sin internet, servidor reiniciándose o despertando). */
export function esFallaDeConexion(error: HttpErrorResponse): boolean {
  const traeMensaje = typeof error.error?.mensaje === 'string';
  return error.status === 0 || (error.status >= 500 && !traeMensaje);
}

/**
 * Manejo central de errores de la API:
 * - sesión vencida → vuelve a pedir el PIN (sin avisos de error);
 * - el resto → muestra el mensaje del servidor, que ya viene en español sencillo.
 * Las pantallas no repiten este manejo; solo deciden qué hacer después.
 */
export const erroresInterceptor: HttpInterceptorFn = (req, next) => {
  const avisos = inject(Avisos);
  const sesion = inject(Sesion);
  const esAcceso = req.url.includes('/api/auth/');

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401 && !esAcceso) {
          sesion.expirada();
        } else if (!esAcceso) {
          avisos.error(
            esFallaDeConexion(error)
              ? MENSAJE_SIN_CONEXION
              : (error.error?.mensaje ?? 'Ocurrió un error inesperado. Intente de nuevo.'),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};
