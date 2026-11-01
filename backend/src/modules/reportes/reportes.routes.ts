import { Router, type Response } from 'express';
import { z } from 'zod';
import { mesSchema } from '../../shared/validation.js';
import { reportesService, type ArchivoGenerado } from './reportes.service.js';

const consultaSchema = z.object({
  mes: mesSchema,
  alcance: z.enum(['completo', 'hasta-hoy']).default('completo'),
});

function enviar(res: Response, archivo: ArchivoGenerado) {
  res
    .status(200)
    .type(archivo.tipo)
    .setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`)
    .send(archivo.contenido);
}

export const reportesRouter = Router()
  .get('/excel', async (req, res) => {
    const { mes, alcance } = consultaSchema.parse(req.query);
    enviar(res, await reportesService.excel(mes, alcance));
  })
  .get('/pdf', async (req, res) => {
    const { mes, alcance } = consultaSchema.parse(req.query);
    enviar(res, await reportesService.pdf(mes, alcance));
  });
