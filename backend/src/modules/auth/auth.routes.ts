import { Router, type CookieOptions, type RequestHandler } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/errors.js';
import { pinSchema } from '../../shared/validation.js';
import { COOKIE_SESION, authService, leerCookie } from './auth.service.js';

const opcionesCookie: CookieOptions = {
  httpOnly: true, // JavaScript no puede leerla
  secure: env.produccion, // solo por HTTPS en la nube
  sameSite: 'lax',
  path: '/',
};

/** Exige una sesión válida para todo lo que viene después. */
export const requiereSesion: RequestHandler = (req, _res, next) => {
  if (authService.sesionValida(leerCookie(req.headers.cookie, COOKIE_SESION))) return next();
  next(new HttpError(401, 'Su sesión terminó. Escriba su PIN para continuar.'));
};

export const authRouter = Router()
  .get('/sesion', (req, res) => {
    res.json({ activa: authService.sesionValida(leerCookie(req.headers.cookie, COOKIE_SESION)) });
  })
  .post('/ingresar', (req, res) => {
    const { pin } = z.object({ pin: pinSchema }).parse(req.body);
    const { token, expira } = authService.ingresar(pin, req.ip ?? 'desconocida');
    res.cookie(COOKIE_SESION, token, { ...opcionesCookie, expires: expira }).json({ activa: true });
  })
  .post('/salir', (_req, res) => {
    res.clearCookie(COOKIE_SESION, opcionesCookie).json({ activa: false });
  });
