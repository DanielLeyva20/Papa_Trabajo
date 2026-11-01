/** Utilidades de fechas, siempre en hora de Perú. */

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

export function hoyEnPeru(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function mesActual(): string {
  return hoyEnPeru().slice(0, 7);
}

export function desplazarMes(mes: string, delta: number): string {
  const [y, m] = mes.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function partesMes(mes: string): { nombre: string; year: number } {
  const [y, m] = mes.split('-').map(Number) as [number, number];
  return { nombre: MESES[m - 1]!, year: y };
}

export function nombreMes(mes: string): string {
  const { nombre, year } = partesMes(mes);
  return `${nombre} ${year}`;
}
