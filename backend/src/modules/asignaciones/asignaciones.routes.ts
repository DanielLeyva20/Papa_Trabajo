import { Router } from 'express';
import { idParam } from '../../shared/validation.js';
import { consultaSchema, crearSchema, ordenSchema, patronCambioSchema, retirarSchema } from './asignaciones.schemas.js';
import { asignacionesService } from './asignaciones.service.js';

export const asignacionesRouter = Router()
  .get('/', async (req, res) => {
    const { mes, agenteId, sedeId } = consultaSchema.parse(req.query);
    res.json(
      agenteId !== undefined
        ? await asignacionesService.delAgente(agenteId, mes)
        : await asignacionesService.deSede(sedeId!, mes),
    );
  })
  .post('/', async (req, res) => {
    res.status(201).json(await asignacionesService.crear(crearSchema.parse(req.body)));
  })
  .put('/orden', async (req, res) => {
    await asignacionesService.ordenar(ordenSchema.parse(req.body).ids);
    res.status(204).end();
  })
  .put('/:id/patron', async (req, res) => {
    const { patron } = patronCambioSchema.parse(req.body);
    res.json(await asignacionesService.cambiarPatron(idParam.parse(req.params.id), patron));
  })
  /** Quita al agente de la sede desde el mes indicado; los meses anteriores no cambian. */
  .post('/:id/retirar', async (req, res) => {
    await asignacionesService.retirar(idParam.parse(req.params.id), retirarSchema.parse(req.body).desde);
    res.status(204).end();
  });
