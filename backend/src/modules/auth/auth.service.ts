import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { HttpError } from '../../shared/errors.js';

export const COOKIE_SESION = 'rol_sesion';

const INTENTOS_POR_IP = 5;
const BLOQUEO_MS = 15 * 60_000;
const FALLOS_GLOBALES_POR_HORA = 40;

const sha256 = (texto: string) => createHash('sha256').update(texto).digest();

/** Huella del PIN actual: si el PIN cambia en el servidor, todas las sesiones anteriores dejan de valer. */
const huellaPin = () => sha256(env.pin).toString('base64url').slice(0, 16);

const firmar = (contenido: string) =>
  createHmac('sha256', env.sessionSecret).update(`${contenido}:${huellaPin()}`).digest('base64url');

// ---------- Freno contra quien intente adivinar el PIN ----------
const fallosPorIp = new Map<string, { cuenta: number; desde: number; bloqueadoHasta: number }>();
let fallosGlobales: number[] = [];

function verificarBloqueo(ip: string): void {
  const ahora = Date.now();
  const registro = fallosPorIp.get(ip);
  if (registro && registro.bloqueadoHasta > ahora) {
    const minutos = Math.ceil((registro.bloqueadoHasta - ahora) / 60_000);
    throw new HttpError(429, `Demasiados intentos. Espere ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} y vuelva a intentar.`);
  }
  fallosGlobales = fallosGlobales.filter((t) => ahora - t < 60 * 60_000);
  if (fallosGlobales.length >= FALLOS_GLOBALES_POR_HORA) {
    throw new HttpError(429, 'El acceso está pausado por seguridad. Intente de nuevo en una hora.');
  }
}

function registrarFallo(ip: string): number {
  const ahora = Date.now();
  const previo = fallosPorIp.get(ip);
  const registro = previo && ahora - previo.desde < BLOQUEO_MS ? previo : { cuenta: 0, desde: ahora, bloqueadoHasta: 0 };
  registro.cuenta++;
  if (registro.cuenta >= INTENTOS_POR_IP) registro.bloqueadoHasta = ahora + BLOQUEO_MS;
  fallosPorIp.set(ip, registro);
  fallosGlobales.push(ahora);
  return Math.max(0, INTENTOS_POR_IP - registro.cuenta);
}

export const authService = {
  /** Comprueba el PIN (en tiempo constante) y devuelve una sesión firmada. */
  ingresar(pin: string, ip: string): { token: string; expira: Date } {
    verificarBloqueo(ip);
    const correcto = timingSafeEqual(sha256(pin), sha256(env.pin));
    if (!correcto) {
      const quedan = registrarFallo(ip);
      throw new HttpError(
        401,
        quedan > 0
          ? `PIN incorrecto. Le quedan ${quedan} ${quedan === 1 ? 'intento' : 'intentos'}.`
          : 'PIN incorrecto. Por seguridad, espere 15 minutos.',
      );
    }
    fallosPorIp.delete(ip);
    const expira = new Date(Date.now() + env.sesionDias * 86_400_000);
    const contenido = `v1.${expira.getTime()}`;
    return { token: `${contenido}.${firmar(contenido)}`, expira };
  },

  /** true si el token es auténtico y no venció. */
  sesionValida(token: string | undefined): boolean {
    if (!token) return false;
    const [version, expira, firma] = token.split('.');
    if (version !== 'v1' || !expira || !firma || Number(expira) < Date.now()) return false;
    const esperada = Buffer.from(firmar(`${version}.${expira}`));
    const recibida = Buffer.from(firma);
    return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
  },
};

/** Lee una cookie de la cabecera sin dependencias extra. */
export function leerCookie(cabecera: string | undefined, nombre: string): string | undefined {
  for (const parte of cabecera?.split(';') ?? []) {
    const [clave, ...valor] = parte.trim().split('=');
    if (clave === nombre) return decodeURIComponent(valor.join('='));
  }
  return undefined;
}
