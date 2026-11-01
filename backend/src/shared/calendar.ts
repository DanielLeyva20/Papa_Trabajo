import { env } from '../config/env.js';
import { HttpError } from './errors.js';

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

/** Letras usadas en el rol: índice 0 = Lunes … 6 = Domingo. */
export const LETRAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

export interface Mes {
  year: number;
  month: number; // 1..12
  clave: string; // YYYY-MM
}

export interface DiaDelMes {
  fecha: string; // YYYY-MM-DD
  dia: number;
  indiceSemana: number; // 0 = Lunes
  letra: string;
  esDomingo: boolean;
  feriado: string | null;
}

export interface Feriado {
  fecha: string;
  nombre: string;
  /** NACIONAL: por ley, calculado. LOCAL: agregado a mano (p. ej. fiestas de Cañete). */
  tipo: 'NACIONAL' | 'LOCAL';
}

const pad = (n: number) => String(n).padStart(2, '0');

export function parseMes(clave: string): Mes {
  const match = /^(\d{4})-(\d{2})$/.exec(clave);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  if (!match || month < 1 || month > 12) {
    throw new HttpError(400, `El mes "${clave}" no es válido. Use el formato AAAA-MM.`);
  }
  return { year, month, clave };
}

export function nombreMes(mes: Mes): string {
  return `${MESES[mes.month - 1]} ${mes.year}`;
}

export function diasEnMes(mes: Mes): number {
  return new Date(Date.UTC(mes.year, mes.month, 0)).getUTCDate();
}

/** Fecha de hoy en Perú (no depende de la zona horaria configurada en la PC). */
export function hoyEnPeru(): { fecha: string; mes: string; dia: number } {
  const fecha = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  return { fecha, mes: fecha.slice(0, 7), dia: Number(fecha.slice(8, 10)) };
}

/** `feriados`: fecha → nombre; por defecto solo los nacionales. */
export function diasDelMes(mes: Mes, feriados: Map<string, string> = feriadosDelPeru(mes.year)): DiaDelMes[] {
  return Array.from({ length: diasEnMes(mes) }, (_, i) => {
    const dia = i + 1;
    const fecha = `${mes.clave}-${pad(dia)}`;
    const indiceSemana = (new Date(Date.UTC(mes.year, mes.month - 1, dia)).getUTCDay() + 6) % 7;
    return {
      fecha,
      dia,
      indiceSemana,
      letra: LETRAS_SEMANA[indiceSemana]!,
      esDomingo: indiceSemana === 6,
      feriado: feriados.get(fecha) ?? null,
    };
  });
}

/** Feriados nacionales del Perú (calendario oficial), incluidos Jueves y Viernes Santo. */
export function feriadosDelPeru(year: number): Map<string, string> {
  const fijos: [string, string][] = [
    ['01-01', 'Año Nuevo'],
    ['05-01', 'Día del Trabajo'],
    ['06-07', 'Batalla de Arica y Día de la Bandera'],
    ['06-29', 'San Pedro y San Pablo'],
    ['07-23', 'Día de la Fuerza Aérea del Perú'],
    ['07-28', 'Día de la Independencia del Perú'],
    ['07-29', 'Fiestas Patrias'],
    ['08-06', 'Batalla de Junín'],
    ['08-30', 'Santa Rosa de Lima'],
    ['10-08', 'Combate de Angamos'],
    ['11-01', 'Día de Todos los Santos'],
    ['12-08', 'Inmaculada Concepción'],
    ['12-09', 'Batalla de Ayacucho'],
    ['12-25', 'Navidad'],
  ];
  const feriados = new Map(fijos.map(([md, nombre]) => [`${year}-${md}`, nombre]));

  const pascua = domingoDePascua(year);
  const desplazar = (dias: number) => {
    const d = new Date(pascua);
    d.setUTCDate(d.getUTCDate() + dias);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  };
  feriados.set(desplazar(-3), 'Jueves Santo');
  feriados.set(desplazar(-2), 'Viernes Santo');
  return feriados;
}

/** Algoritmo de Meeus/Jones/Butcher. */
function domingoDePascua(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}
