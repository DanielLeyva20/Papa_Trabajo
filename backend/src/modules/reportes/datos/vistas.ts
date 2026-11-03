import type { CategoriaCodigo, Turno } from '../../../shared/domain.js';
import { conFilas } from '../../rol/rol.calculos.js';
import type { FilaRol, RolMensual, SedeRol } from '../../rol/rol.types.js';

/**
 * Cómo se agrupan los agentes por turno:
 * - juntos: todos en la misma tabla, primero los de día y luego los de noche;
 * - separados: cada sede en dos tablas, «Turno día» y «Turno noche»;
 * - dia / noche: solo los de ese turno.
 */
export const VISTAS = ['juntos', 'separados', 'dia', 'noche'] as const;
export type Vista = (typeof VISTAS)[number];

export const ETIQUETA_VISTA: Record<Vista, string> = {
  juntos: 'Día y noche',
  separados: 'Día y noche por separado',
  dia: 'Solo turno día',
  noche: 'Solo turno noche',
};

const ETIQUETA_TURNO: Record<Turno, string> = { DIA: 'Turno día', NOCHE: 'Turno noche' };

/** Día primero, sin alterar el orden de los agentes dentro de cada turno. */
const ordenarPorTurno = (filas: FilaRol[]) =>
  [...filas].sort((a, b) => (a.turno === b.turno ? 0 : a.turno === 'DIA' ? -1 : 1));

export function aplicarVista(rol: RolMensual, vista: Vista, categorias: Map<string, CategoriaCodigo>): RolMensual {
  const de = (filas: FilaRol[], turno: Turno) => filas.filter((f) => f.turno === turno);

  const sedes = rol.sedes.flatMap((sede) => {
    switch (vista) {
      case 'juntos':
        return [{ ...sede, filas: ordenarPorTurno(sede.filas) }];
      case 'dia':
        return [{ ...conFilas(sede, de(sede.filas, 'DIA'), rol.dias, categorias), turno: 'DIA' as const }];
      case 'noche':
        return [{ ...conFilas(sede, de(sede.filas, 'NOCHE'), rol.dias, categorias), turno: 'NOCHE' as const }];
      case 'separados':
        return (['DIA', 'NOCHE'] as const)
          .map((turno) => ({
            ...conFilas(sede, de(sede.filas, turno), rol.dias, categorias, `${sede.nombre} — ${ETIQUETA_TURNO[turno]}`),
            turno,
          }))
          .filter((s) => s.filas.length > 0);
    }
  });

  // En "solo día" / "solo noche" se ocultan las sedes que quedan sin agentes de ese turno.
  return { ...rol, sedes: vista === 'dia' || vista === 'noche' ? sedes.filter((s) => s.filas.length > 0) : sedes };
}

/** Una fila de totales del cuadro de una sede. */
export interface FilaTotal {
  etiqueta: 'TOTAL DÍA' | 'TOTAL NOCHE';
  categoria: Turno;
  valores: number[];
  /** Solo el total de día se compara con el mínimo de la sede (y puede ir en rojo). */
  conMinimo: boolean;
}

/**
 * Qué totales lleva el cuadro de una sede (lo comparten el PDF y el Excel):
 * un cuadro de un solo turno, solo el suyo; uno mixto, el de día y, si hay turno de noche, también ese.
 */
export function filasDeTotales(sede: SedeRol): FilaTotal[] {
  const dia: FilaTotal = { etiqueta: 'TOTAL DÍA', categoria: 'DIA', valores: sede.totales.dia, conMinimo: true };
  const noche: FilaTotal = { etiqueta: 'TOTAL NOCHE', categoria: 'NOCHE', valores: sede.totales.noche, conMinimo: false };
  if (sede.turno === 'DIA') return [dia];
  if (sede.turno === 'NOCHE') return [noche];
  const hayNoche = sede.filas.some((f) => f.turno === 'NOCHE') || sede.totales.noche.some((n) => n > 0);
  return hayNoche ? [dia, noche] : [dia];
}

/** Día completo que quedó por debajo del mínimo: el único caso que va en rojo. */
export const faltaPersonal = (sede: SedeRol, total: FilaTotal, i: number): boolean =>
  total.conMinimo && !!sede.totales.completos[i] && (total.valores[i] ?? 0) < sede.minimoDia;
