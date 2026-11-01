import { z } from 'zod';
import { codigoSchema, fechaSchema, idParam, mesSchema } from '../../shared/validation.js';

const cambioSchema = z.object({
  agenteId: idParam,
  sedeId: idParam,
  fecha: fechaSchema,
  codigo: codigoSchema.nullable(),
});

/**
 * Lote de marcas del guardado automático. Si un mismo casillero llega dos veces,
 * vale el último cambio (el que el usuario hizo al final).
 */
export const marcasSchema = z.object({
  cambios: z
    .array(cambioSchema)
    .min(1, 'no hay cambios para guardar')
    .max(3000, 'demasiados cambios a la vez')
    .transform((cambios) => [
      ...new Map(cambios.map((c) => [`${c.agenteId}:${c.sedeId}:${c.fecha}`, c])).values(),
    ]),
});

export const mesConsultaSchema = z.object({ mes: mesSchema });

export const generarSchema = z.object({
  mes: mesSchema,
  sedeId: idParam.optional(),
  sobrescribir: z.boolean().default(false),
});

export const limpiarSchema = z.object({ mes: mesSchema, sedeId: idParam.optional() });
