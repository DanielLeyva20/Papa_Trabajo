import express, { Router } from 'express';
import { hoyEnPeru } from '../../shared/calendar.js';
import { idParam, mesSchema } from '../../shared/validation.js';
import { MAX_FOTO_BYTES, TIPOS_FOTO, agenteSchema, bajaSchema } from './agentes.schemas.js';
import { agentesService } from './agentes.service.js';

export const agentesRouter = Router()
  .get('/', async (req, res) => {
    const mes = mesSchema.catch(hoyEnPeru().mes).parse(req.query['mes']);
    res.json(await agentesService.listar(mes, req.query['todos'] === 'true'));
  })
  .post('/', async (req, res) => {
    res.status(201).json(await agentesService.crear(agenteSchema.parse(req.body)));
  })
  .put('/:id', async (req, res) => {
    res.json(await agentesService.actualizar(idParam.parse(req.params.id), agenteSchema.parse(req.body)));
  })
  /** Dar de baja: deja de aparecer desde el mes indicado, sin borrar su historial. */
  .post('/:id/baja', async (req, res) => {
    res.json(await agentesService.darDeBaja(idParam.parse(req.params.id), bajaSchema.parse(req.body).desde));
  })
  .post('/:id/reactivar', async (req, res) => {
    res.json(await agentesService.reactivar(idParam.parse(req.params.id)));
  })
  // ---------- Foto (la pantalla ya la envía recortada y comprimida) ----------
  .get('/:id/foto', async (req, res) => {
    const foto = await agentesService.foto(idParam.parse(req.params.id));
    // La URL lleva ?v=<versión>, así que puede guardarse en caché sin miedo.
    res.type(foto.tipo).setHeader('Cache-Control', 'private, max-age=31536000, immutable').send(foto.datos);
  })
  .put('/:id/foto', express.raw({ type: TIPOS_FOTO, limit: MAX_FOTO_BYTES }), async (req, res) => {
    res.json(await agentesService.guardarFoto(idParam.parse(req.params.id), req.body));
  })
  .delete('/:id/foto', async (req, res) => {
    res.json(await agentesService.quitarFoto(idParam.parse(req.params.id)));
  });
