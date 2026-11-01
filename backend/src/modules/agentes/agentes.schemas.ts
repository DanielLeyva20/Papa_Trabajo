import { z } from 'zod';
import { cargoSchema, dniSchema, mesSchema, nombrePersonaSchema, telefonoSchema } from '../../shared/validation.js';

export const agenteSchema = z.object({
  nombres: nombrePersonaSchema,
  cargo: cargoSchema,
  dni: dniSchema,
  telefono: telefonoSchema,
});

export const bajaSchema = z.object({ desde: mesSchema });

export const MAX_FOTO_BYTES = 2 * 1024 * 1024;
export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
