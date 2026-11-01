import type { Cargo, CategoriaCodigo, Turno } from '../../../shared/domain.js';
import type { RolMensual } from '../../rol/rol.types.js';

/** Reporte general: quién trabaja de día y de noche, y cuánta gente hubo en promedio por sede. */

export interface AgenteGeneral {
  agenteId: number;
  nombres: string;
  cargo: Cargo;
  sedes: string[];
  turno: Turno;
  /** Cantidad de cada marca (D, N, L, F…) en el período. */
  conteos: Record<string, number>;
  turnosDia: number;
  turnosNoche: number;
  ausencias: number;
}

export interface SedeGeneral {
  nombre: string;
  minimoDia: number;
  agentesDia: number;
  agentesNoche: number;
  turnosDia: number;
  turnosNoche: number;
  /** Promedio de agentes de turno por día en el período. */
  promedioDia: number;
  promedioNoche: number;
  /** Días completos que quedaron por debajo del mínimo de agentes de día. */
  diasBajoMinimo: number;
}

export interface ReporteGeneral {
  diasConsiderados: number;
  diurnos: AgenteGeneral[];
  nocturnos: AgenteGeneral[];
  sedes: SedeGeneral[];
  totales: { turnosDia: number; turnosNoche: number; promedioDia: number; promedioNoche: number; diasBajoMinimo: number };
}

const redondear = (n: number) => Math.round(n * 10) / 10;

export function calcularGeneral(rol: RolMensual, categorias: Map<string, CategoriaCodigo>): ReporteGeneral {
  const dias = Math.max(rol.dias.length, 1);
  const porAgente = new Map<number, AgenteGeneral>();

  for (const sede of rol.sedes) {
    for (const fila of sede.filas) {
      const a =
        porAgente.get(fila.agenteId) ??
        {
          agenteId: fila.agenteId,
          nombres: fila.nombres,
          cargo: fila.cargo,
          sedes: [],
          turno: fila.turno,
          conteos: {},
          turnosDia: 0,
          turnosNoche: 0,
          ausencias: 0,
        };
      a.sedes.push(sede.nombreCorto);
      for (const codigo of fila.marcas) {
        if (!codigo) continue;
        a.conteos[codigo] = (a.conteos[codigo] ?? 0) + 1;
        const categoria = categorias.get(codigo);
        if (categoria === 'DIA') a.turnosDia++;
        if (categoria === 'NOCHE') a.turnosNoche++;
        if (categoria === 'AUSENCIA') a.ausencias++;
      }
      porAgente.set(fila.agenteId, a);
    }
  }

  // Un agente que trabaja de día en una sede y de noche en otra queda donde hizo más turnos.
  const agentes = [...porAgente.values()].map((a) => ({
    ...a,
    turno: a.turnosNoche > a.turnosDia ? 'NOCHE' : a.turnosDia > a.turnosNoche ? 'DIA' : a.turno,
  })) satisfies AgenteGeneral[];
  const porNombre = (x: AgenteGeneral, y: AgenteGeneral) => x.nombres.localeCompare(y.nombres, 'es');

  const sedes: SedeGeneral[] = rol.sedes.map((sede) => {
    const turnosDia = sede.totales.dia.reduce((s, n) => s + n, 0);
    const turnosNoche = sede.totales.noche.reduce((s, n) => s + n, 0);
    return {
      nombre: sede.nombre,
      minimoDia: sede.minimoDia,
      agentesDia: sede.filas.filter((f) => f.turno === 'DIA').length,
      agentesNoche: sede.filas.filter((f) => f.turno === 'NOCHE').length,
      turnosDia,
      turnosNoche,
      promedioDia: redondear(turnosDia / dias),
      promedioNoche: redondear(turnosNoche / dias),
      diasBajoMinimo: sede.totales.dia.filter((n, i) => sede.totales.completos[i] && n < sede.minimoDia).length,
    };
  });

  const suma = (k: 'turnosDia' | 'turnosNoche' | 'diasBajoMinimo') => sedes.reduce((s, x) => s + x[k], 0);
  return {
    diasConsiderados: rol.dias.length,
    diurnos: agentes.filter((a) => a.turno === 'DIA').sort(porNombre),
    nocturnos: agentes.filter((a) => a.turno === 'NOCHE').sort(porNombre),
    sedes,
    totales: {
      turnosDia: suma('turnosDia'),
      turnosNoche: suma('turnosNoche'),
      promedioDia: redondear(suma('turnosDia') / dias),
      promedioNoche: redondear(suma('turnosNoche') / dias),
      diasBajoMinimo: suma('diasBajoMinimo'),
    },
  };
}
