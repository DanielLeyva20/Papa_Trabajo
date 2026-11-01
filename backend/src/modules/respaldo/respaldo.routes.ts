import { Router } from 'express';
import { respaldoService } from './respaldo.service.js';

export const respaldoRouter = Router()
  .get('/', (_req, res) => {
    res.json(respaldoService.info());
  })
  .get('/descargar', async (_req, res) => {
    const { nombre, contenido } = await respaldoService.exportar();
    res
      .type('application/json')
      .setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(nombre)}`)
      .setHeader('Cache-Control', 'no-store')
      .send(contenido);
  });
