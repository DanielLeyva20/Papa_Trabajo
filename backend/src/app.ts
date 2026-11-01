import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import express, { Router } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { sql } from './database/client.js';
import { errorHandler } from './shared/errors.js';
import { agentesRouter } from './modules/agentes/agentes.routes.js';
import { asignacionesRouter } from './modules/asignaciones/asignaciones.routes.js';
import { authRouter, requiereSesion } from './modules/auth/auth.routes.js';
import { codigosRouter } from './modules/codigos/codigos.routes.js';
import { configuracionRouter } from './modules/configuracion/configuracion.routes.js';
import { feriadosRouter } from './modules/feriados/feriados.routes.js';
import { reportesRouter } from './modules/reportes/reportes.routes.js';
import { respaldoRouter } from './modules/respaldo/respaldo.routes.js';
import { rolRouter } from './modules/rol/rol.routes.js';
import { sedesRouter } from './modules/sedes/sedes.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Render pone un proxy delante: así se obtiene la IP real (para frenar intentos de PIN).
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // estilos de componentes de Angular
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: env.produccion ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  const api = Router()
    // Público: Render lo usa para saber si el servicio está vivo.
    .get('/salud', async (_req, res) => {
      await sql.get('SELECT 1');
      res.json({ ok: true });
    })
    .use('/auth', authRouter)
    // Todo lo demás exige haber ingresado el PIN.
    .use(requiereSesion)
    .use('/configuracion', configuracionRouter)
    .use('/codigos', codigosRouter)
    .use('/sedes', sedesRouter)
    .use('/agentes', agentesRouter)
    .use('/asignaciones', asignacionesRouter)
    .use('/rol', rolRouter)
    .use('/reportes', reportesRouter)
    .use('/feriados', feriadosRouter)
    .use('/respaldo', respaldoRouter)
    .use((_req, res) => {
      res.status(404).json({ mensaje: 'Ruta no encontrada.' });
    });

  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', api);

  // La pantalla Angular compilada se sirve desde el mismo servidor.
  if (fs.existsSync(env.frontendDist)) {
    app.use(
      express.static(env.frontendDist, {
        index: false,
        setHeaders: (res, archivo) => {
          // Los archivos con huella en el nombre nunca cambian; index.html siempre se revisa.
          const conHuella = /-[A-Z0-9]{8}\.(js|css|woff2?)$/i.test(archivo);
          res.setHeader('Cache-Control', conHuella ? 'public, max-age=31536000, immutable' : 'no-cache');
        },
      }),
    );
    app.get('/{*ruta}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(env.frontendDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
