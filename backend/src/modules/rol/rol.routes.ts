import { Router } from 'express';
import { generarSchema, limpiarSchema, marcasSchema, mesConsultaSchema } from './rol.schemas.js';
import { rolService } from './rol.service.js';

export const rolRouter = Router()
  .get('/', async (req, res) => {
    res.json(await rolService.obtener(mesConsultaSchema.parse(req.query).mes));
  })
  .get('/resumen', async (req, res) => {
    const rol = await rolService.obtener(mesConsultaSchema.parse(req.query).mes);
    const [agentes, distribucionDia, distribucionNoche] = await Promise.all([
      rolService.resumen(rol),
      rolService.distribucion(rol, 'DIA'),
      rolService.distribucion(rol, 'NOCHE'),
    ]);
    res.json({ agentes, distribucionDia, distribucionNoche });
  })
  .put('/marcas', async (req, res) => {
    await rolService.guardarMarcas(marcasSchema.parse(req.body).cambios);
    res.status(204).end();
  })
  .post('/generar', async (req, res) => {
    const { mes, sedeId, sobrescribir } = generarSchema.parse(req.body);
    res.json(await rolService.generar(mes, { sedeId, sobrescribir }));
  })
  .post('/limpiar', async (req, res) => {
    const { mes, sedeId } = limpiarSchema.parse(req.body);
    res.json(await rolService.limpiar(mes, sedeId));
  });
