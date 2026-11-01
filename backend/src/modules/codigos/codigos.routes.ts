import { Router } from 'express';
import { codigosService } from './codigos.service.js';

export const codigosRouter = Router().get('/', async (_req, res) => {
  res.json(await codigosService.listar());
});
