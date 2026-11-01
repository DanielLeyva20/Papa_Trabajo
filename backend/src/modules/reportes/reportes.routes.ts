import { Router, type Response } from 'express';
import { z } from 'zod';
import { mesSchema } from '../../shared/validation.js';
import { VISTAS } from './datos/vistas.js';
import { reportesService } from './reportes.service.js';
import { ALCANCES, FORMATOS, type ArchivoGenerado } from './reportes.types.js';

const formatoSchema = z.enum(FORMATOS, { message: 'formato no válido (excel o pdf)' });

const consultaSchema = z.object({
  mes: mesSchema,
  alcance: z.enum(ALCANCES).default('completo'),
  vista: z.enum(VISTAS).default('juntos'),
});

function enviar(res: Response, archivo: ArchivoGenerado) {
  res
    .status(200)
    .type(archivo.tipo)
    .setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`)
    .send(archivo.contenido);
}

/**
 * GET /api/reportes/rol/:formato        → rol oficial (vista: juntos | separados | dia | noche)
 * GET /api/reportes/general/:formato    → promedios por sede, diurnos y nocturnos
 * GET /api/reportes/ausencias/:formato  → faltas, descansos médicos, permisos y vacaciones
 * Todos aceptan ?mes=AAAA-MM&alcance=completo|hasta-hoy
 */
export const reportesRouter = Router()
  .get('/rol/:formato', async (req, res) => {
    const { mes, alcance, vista } = consultaSchema.parse(req.query);
    enviar(res, await reportesService.rol(formatoSchema.parse(req.params.formato), mes, alcance, vista));
  })
  .get('/general/:formato', async (req, res) => {
    const { mes, alcance } = consultaSchema.parse(req.query);
    enviar(res, await reportesService.general(formatoSchema.parse(req.params.formato), mes, alcance));
  })
  .get('/ausencias/:formato', async (req, res) => {
    const { mes, alcance } = consultaSchema.parse(req.query);
    enviar(res, await reportesService.ausencias(formatoSchema.parse(req.params.formato), mes, alcance));
  })
  // Direcciones anteriores (por compatibilidad con enlaces ya guardados)
  .get(['/excel', '/pdf'], async (req, res) => {
    const { mes, alcance, vista } = consultaSchema.parse(req.query);
    enviar(res, await reportesService.rol(formatoSchema.parse(req.path.slice(1)), mes, alcance, vista));
  });
