import { z } from 'zod';
import { idParam, textoRequerido } from '../../shared/validation.js';

export const sedeSchema = z.object({
  nombre: textoRequerido(100).pipe(z.string().min(3, 'escriba al menos 3 letras')),
  nombreCorto: textoRequerido(24),
  activa: z.boolean().default(true),
  minimoDia: z.number({ message: 'debe ser un número' }).int().min(0).max(50, 'máximo 50').default(1),
});

export const ordenSchema = z.object({
  ids: z.array(idParam).min(1, 'la lista está vacía'),
});
