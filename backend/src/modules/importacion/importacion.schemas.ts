import { z } from 'zod';
import { cargoSchema, codigoSchema, idParam, mesSchema, nombrePersonaSchema } from '../../shared/validation.js';

export const MAX_EXCEL_BYTES = 10 * 1024 * 1024;
export const TIPOS_EXCEL = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
];

const filaSchema = z.object({
  nombres: nombrePersonaSchema,
  cargo: cargoSchema,
  agenteId: idParam.nullable(),
  marcas: z.array(codigoSchema.nullable()).max(31),
});

/** Plan confirmado en la vista previa: qué sede es cada tabla y qué filas se importan. */
export const planSchema = z.object({
  mes: mesSchema,
  reemplazar: z.boolean().default(true),
  bloques: z
    .array(z.object({ sedeId: idParam, filas: z.array(filaSchema).max(200) }))
    .min(1, 'elija al menos una tabla para importar')
    .max(60)
    .refine((b) => new Set(b.map((x) => x.sedeId)).size === b.length, 'dos tablas no pueden ir a la misma sede'),
});
