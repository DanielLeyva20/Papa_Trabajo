import { z } from 'zod';
import { idParam, mesSchema, patronSchema } from '../../shared/validation.js';

export const crearSchema = z.object({
  agenteId: idParam,
  sedeId: idParam,
  desde: mesSchema,
  patron: patronSchema,
});

export const consultaSchema = z
  .object({
    mes: mesSchema,
    agenteId: idParam.optional(),
    sedeId: idParam.optional(),
  })
  .refine((q) => q.agenteId !== undefined || q.sedeId !== undefined, 'indique el agente o la sede');

export const patronCambioSchema = z.object({ patron: patronSchema });

export const ordenSchema = z.object({
  ids: z.array(idParam).min(1, 'la lista está vacía'),
});

export const retirarSchema = z.object({ desde: mesSchema });
