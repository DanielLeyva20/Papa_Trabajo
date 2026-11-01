import type { DiaDelMes } from '../../shared/calendar.js';
import type { CategoriaCodigo } from '../../shared/domain.js';
import type { FilaRol, SedeRol } from './rol.types.js';

/** Cálculos puros sobre las filas del rol (sin base de datos). Los usan el rol, las vistas y los reportes. */

/** Cuántas filas tienen una marca de la categoría indicada, día por día. */
export function totalesPorDia(
  filas: readonly FilaRol[],
  cantidadDias: number,
  categorias: Map<string, CategoriaCodigo>,
  categoria: CategoriaCodigo,
): number[] {
  return Array.from({ length: cantidadDias }, (_, i) =>
    filas.reduce((n, fila) => {
      const codigo = fila.marcas[i];
      return codigo && categorias.get(codigo) === categoria ? n + 1 : n;
    }, 0),
  );
}

/**
 * Un día está completo cuando todos los que deben venir ese día (según su semana habitual)
 * ya tienen marca. Solo entonces tiene sentido avisar que falta personal.
 */
export function diasCompletos(filas: readonly FilaRol[], dias: readonly DiaDelMes[]): boolean[] {
  return dias.map((dia, i) => {
    const esperados = filas.filter((f) => f.patron?.[dia.indiceSemana]);
    return esperados.length > 0 && esperados.every((f) => f.marcas[i] !== null);
  });
}

export function calcularTotales(
  filas: readonly FilaRol[],
  dias: readonly DiaDelMes[],
  categorias: Map<string, CategoriaCodigo>,
): SedeRol['totales'] {
  return {
    dia: totalesPorDia(filas, dias.length, categorias, 'DIA'),
    noche: totalesPorDia(filas, dias.length, categorias, 'NOCHE'),
    completos: diasCompletos(filas, dias),
  };
}

/** Misma sede con otro conjunto de filas (totales recalculados). */
export function conFilas(
  sede: SedeRol,
  filas: FilaRol[],
  dias: readonly DiaDelMes[],
  categorias: Map<string, CategoriaCodigo>,
  nombre = sede.nombre,
): SedeRol {
  return { ...sede, nombre, filas, totales: calcularTotales(filas, dias, categorias) };
}
