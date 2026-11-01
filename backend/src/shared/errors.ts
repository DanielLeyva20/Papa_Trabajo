import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

/** Error con un mensaje pensado para mostrarse tal cual al usuario. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, `${what} no existe o fue eliminado.`);
export const conflicto = (mensaje: string) => new HttpError(409, mensaje);
export const solicitudInvalida = (mensaje: string) => new HttpError(400, mensaje);

/** Nombres legibles de los campos para los mensajes de validación. */
const CAMPOS: Record<string, string> = {
  nombres: 'Apellidos y nombres',
  cargo: 'Cargo',
  dni: 'DNI',
  telefono: 'Teléfono',
  nombre: 'Nombre',
  nombreCorto: 'Nombre corto',
  minimoDia: 'Mínimo de día',
  mes: 'Mes',
  fecha: 'Fecha',
  desde: 'Desde',
  patron: 'Semana habitual',
  pin: 'PIN',
  entidad: 'Entidad',
  supervisor: 'Supervisor',
  bloques: 'Importación',
  cambios: 'Marcas',
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ mensaje: error.message });
    return;
  }
  if (error instanceof ZodError) {
    const detalle = error.issues[0];
    // El último nombre de la ruta es el campo concreto (p. ej. cambios.0.fecha → fecha).
    const clave = detalle?.path.findLast((p) => typeof p === 'string') as string | undefined;
    const campo = (clave && CAMPOS[clave]) ?? 'Dato';
    res.status(400).json({ mensaje: `${campo}: ${detalle?.message ?? 'valor no válido'}.`, campo: clave });
    return;
  }
  // Cuerpo JSON mal formado o demasiado grande
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ mensaje: 'La información enviada no es válida.' });
    return;
  }
  if (error?.type === 'entity.too.large') {
    res.status(413).json({ mensaje: 'El archivo es demasiado grande.' });
    return;
  }
  if (error instanceof Error && /UNIQUE constraint failed/.test(error.message)) {
    res.status(409).json({ mensaje: 'Ya existe un registro con ese nombre.' });
    return;
  }
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error);
  res.status(500).json({ mensaje: 'Ocurrió un error inesperado. Intente de nuevo.' });
};
