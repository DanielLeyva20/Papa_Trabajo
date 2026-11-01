import { z } from 'zod';
import { CARGOS } from './domain.js';

/**
 * Esquemas reutilizables. Todo lo que entra a la API se valida aquí antes de tocar la base de datos;
 * los mensajes están en español sencillo porque se muestran tal cual en pantalla.
 */

export const idParam = z.coerce.number({ message: 'debe ser un número' }).int().positive('debe ser un número válido');

const ANIO_MIN = 2020;
const ANIO_MAX = 2100;

export const mesSchema = z
  .string({ message: 'falta el mes' })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'use el formato AAAA-MM')
  .refine((m) => {
    const anio = Number(m.slice(0, 4));
    return anio >= ANIO_MIN && anio <= ANIO_MAX;
  }, `el año debe estar entre ${ANIO_MIN} y ${ANIO_MAX}`);

/** Fecha real del calendario (rechaza p. ej. 2026-02-30). */
export const fechaSchema = z
  .string({ message: 'falta la fecha' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'use el formato AAAA-MM-DD')
  .refine((f) => {
    const [y, m, d] = f.split('-').map(Number) as [number, number, number];
    const fecha = new Date(Date.UTC(y, m - 1, d));
    return fecha.getUTCFullYear() === y && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d;
  }, 'esa fecha no existe')
  .refine((f) => {
    const anio = Number(f.slice(0, 4));
    return anio >= ANIO_MIN && anio <= ANIO_MAX;
  }, `el año debe estar entre ${ANIO_MIN} y ${ANIO_MAX}`);

export const anioSchema = z.coerce.number().int().min(ANIO_MIN).max(ANIO_MAX);

export const cargoSchema = z.enum(CARGOS, { message: 'cargo no válido' });

export const codigoSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{1,3}$/, 'marca no válida');

export const patronSchema = z.array(codigoSchema.nullable()).length(7, 'el patrón debe tener 7 días');

/** Texto obligatorio, sin espacios sobrantes. */
export const textoRequerido = (max = 120) =>
  z
    .string({ message: 'es obligatorio' })
    .trim()
    .transform((v) => v.replace(/\s+/g, ' '))
    .pipe(z.string().min(1, 'no puede quedar vacío').max(max, `máximo ${max} caracteres`));

/** Apellidos y nombres: solo letras (con tildes y Ñ), espacios, apóstrofo, punto y guion. */
export const nombrePersonaSchema = textoRequerido(80)
  .pipe(z.string().min(3, 'escriba al menos 3 letras').regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/, 'use solo letras'))
  .transform((v) => v.toUpperCase());

const vacioANull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

/** DNI peruano: exactamente 8 dígitos (opcional). */
export const dniSchema = z.preprocess(
  vacioANull,
  z.string().trim().regex(/^\d{8}$/, 'el DNI debe tener 8 dígitos').nullable().default(null),
);

/** Teléfono: celular de 9 dígitos que empieza en 9, o fijo de 6 a 9 dígitos (opcional). */
export const telefonoSchema = z.preprocess(
  (v) => (typeof v === 'string' ? vacioANull(v.replace(/[\s-]/g, '')) : v),
  z.string().regex(/^\d{6,9}$/, 'el teléfono debe tener entre 6 y 9 dígitos').nullable().default(null),
);

/** PIN de acceso de 6 dígitos. */
export const pinSchema = z.string({ message: 'escriba el PIN' }).regex(/^\d{6}$/, 'el PIN tiene 6 dígitos');
