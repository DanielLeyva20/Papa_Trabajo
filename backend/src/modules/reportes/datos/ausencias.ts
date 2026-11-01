import type { Cargo } from '../../../shared/domain.js';
import type { CodigoTurno } from '../../codigos/codigos.service.js';
import type { RolMensual } from '../../rol/rol.types.js';

/** Reporte de ausencias: faltas, descansos médicos, permisos y vacaciones del período. */

export interface Ausencia {
  fecha: string;
  dia: number;
  letra: string;
  nombres: string;
  cargo: Cargo;
  sede: string;
  codigo: string;
  tipo: string;
}

export interface AusenciasAgente {
  nombres: string;
  cargo: Cargo;
  sedes: string[];
  conteos: Record<string, number>;
  total: number;
}

export interface ReporteAusencias {
  /** Tipos de ausencia (las marcas de categoría AUSENCIA: F, DM, P, V…). */
  tipos: CodigoTurno[];
  porAgente: AusenciasAgente[];
  detalle: Ausencia[];
  totales: Record<string, number> & { total: number };
}

export function calcularAusencias(rol: RolMensual, codigos: CodigoTurno[]): ReporteAusencias {
  const tipos = codigos.filter((c) => c.categoria === 'AUSENCIA');
  const nombreTipo = new Map(tipos.map((t) => [t.codigo, t.nombre]));
  const detalle: Ausencia[] = [];
  const porAgente = new Map<number, AusenciasAgente>();

  for (const sede of rol.sedes) {
    for (const fila of sede.filas) {
      fila.marcas.forEach((codigo, i) => {
        if (!codigo || !nombreTipo.has(codigo)) return;
        const dia = rol.dias[i]!;
        detalle.push({
          fecha: dia.fecha,
          dia: dia.dia,
          letra: dia.letra,
          nombres: fila.nombres,
          cargo: fila.cargo,
          sede: sede.nombreCorto,
          codigo,
          tipo: nombreTipo.get(codigo)!,
        });
        const a = porAgente.get(fila.agenteId) ?? { nombres: fila.nombres, cargo: fila.cargo, sedes: [], conteos: {}, total: 0 };
        if (!a.sedes.includes(sede.nombreCorto)) a.sedes.push(sede.nombreCorto);
        a.conteos[codigo] = (a.conteos[codigo] ?? 0) + 1;
        a.total++;
        porAgente.set(fila.agenteId, a);
      });
    }
  }

  const totales = { total: detalle.length } as Record<string, number> & { total: number };
  for (const t of tipos) totales[t.codigo] = detalle.filter((d) => d.codigo === t.codigo).length;

  return {
    tipos,
    porAgente: [...porAgente.values()].sort((a, b) => b.total - a.total || a.nombres.localeCompare(b.nombres, 'es')),
    detalle: detalle.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombres.localeCompare(b.nombres, 'es')),
    totales,
  };
}
