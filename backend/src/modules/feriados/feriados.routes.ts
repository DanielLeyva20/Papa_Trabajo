import { Router } from 'express';
import { z } from 'zod';
import { hoyEnPeru } from '../../shared/calendar.js';
import { anioSchema, fechaSchema, textoRequerido } from '../../shared/validation.js';
import { feriadosService } from './feriados.service.js';

const nuevoSchema = z.object({
  fecha: fechaSchema,
  nombre: textoRequerido(80).pipe(z.string().min(3, 'escriba al menos 3 letras')),
});

export const feriadosRouter = Router()
  .get('/', async (req, res) => {
    const anio = anioSchema.catch(Number(hoyEnPeru().fecha.slice(0, 4))).parse(req.query['anio']);
    res.json(await feriadosService.delAnio(anio));
  })
  .post('/', async (req, res) => {
    const { fecha, nombre } = nuevoSchema.parse(req.body);
    res.status(201).json(await feriadosService.agregar(fecha, nombre));
  })
  .delete('/:fecha', async (req, res) => {
    res.json(await feriadosService.quitar(fechaSchema.parse(req.params.fecha)));
  });
