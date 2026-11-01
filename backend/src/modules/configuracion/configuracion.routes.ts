import { Router } from 'express';
import { z } from 'zod';
import { textoRequerido } from '../../shared/validation.js';
import { configuracionService } from './configuracion.service.js';

const actualizarSchema = z
  .object({ titulo: textoRequerido(80), entidad: textoRequerido(80), supervisor: textoRequerido(80) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'no hay cambios para guardar');

export const configuracionRouter = Router()
  .get('/', async (_req, res) => {
    res.json(await configuracionService.obtener());
  })
  .put('/', async (req, res) => {
    res.json(await configuracionService.actualizar(actualizarSchema.parse(req.body)));
  });
