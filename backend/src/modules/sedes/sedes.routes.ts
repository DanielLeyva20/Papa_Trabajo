import { Router } from 'express';
import { idParam } from '../../shared/validation.js';
import { ordenSchema, sedeSchema } from './sedes.schemas.js';
import { sedesService } from './sedes.service.js';

export const sedesRouter = Router()
  .get('/', async (req, res) => {
    res.json(await sedesService.listar(req.query['todas'] !== 'true'));
  })
  .post('/', async (req, res) => {
    res.status(201).json(await sedesService.crear(sedeSchema.parse(req.body)));
  })
  .put('/orden', async (req, res) => {
    res.json(await sedesService.ordenar(ordenSchema.parse(req.body).ids));
  })
  .put('/:id', async (req, res) => {
    res.json(await sedesService.actualizar(idParam.parse(req.params.id), sedeSchema.parse(req.body)));
  });
