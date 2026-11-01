import express, { Router } from 'express';
import { MAX_EXCEL_BYTES, TIPOS_EXCEL, planSchema } from './importacion.schemas.js';
import { importacionService } from './importacion.service.js';

/**
 * Importar un Excel en dos pasos, para que nada se guarde sin revisar:
 * 1) POST /analizar  (el archivo .xlsx) → vista previa con sedes y agentes reconocidos;
 * 2) POST /aplicar   (el plan confirmado) → guarda todo de una vez.
 */
export const importacionRouter = Router()
  .post('/analizar', express.raw({ type: TIPOS_EXCEL, limit: MAX_EXCEL_BYTES }), async (req, res) => {
    res.json(await importacionService.analizar(req.body));
  })
  .post('/aplicar', express.json({ limit: '4mb' }), async (req, res) => {
    res.json(await importacionService.aplicar(planSchema.parse(req.body)));
  });
