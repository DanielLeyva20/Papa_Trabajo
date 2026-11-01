import type { CategoriaCodigo, Turno } from '../../../shared/domain.js';
import { conFilas } from '../../rol/rol.calculos.js';
import type { FilaRol, RolMensual } from '../../rol/rol.types.js';

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
        return [conFilas(sede, de(sede.filas, 'DIA'), rol.dias, categorias)];
      case 'noche':
        return [conFilas(sede, de(sede.filas, 'NOCHE'), rol.dias, categorias)];
      case 'separados':
        return (['DIA', 'NOCHE'] as const)
          .map((turno) => conFilas(sede, de(sede.filas, turno), rol.dias, categorias, `${sede.nombre} — ${ETIQUETA_TURNO[turno]}`))
          .filter((s) => s.filas.length > 0);
    }
  });

  // En "solo día" / "solo noche" se ocultan las sedes que quedan sin agentes de ese turno.
  return { ...rol, sedes: vista === 'dia' || vista === 'noche' ? sedes.filter((s) => s.filas.length > 0) : sedes };
}
