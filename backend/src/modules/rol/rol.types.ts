import type { DiaDelMes } from '../../shared/calendar.js';
import type { Cargo, CargoBase, PatronSemanal, Turno } from '../../shared/domain.js';

export interface FilaRol {
  /** null cuando el agente ya no está asignado pero tiene marcas en ese mes (historial). */
  asignacionId: number | null;
  agenteId: number;
  nombres: string;
  cargo: Cargo;
  patron: PatronSemanal | null;
  /** Una marca por día del mes (índice 0 = día 1). */
  marcas: (string | null)[];
  /** Marca de tiempo de la foto (para refrescarla) o null si no tiene. */
  fotoVersion: string | null;
  /** De día o de noche según su semana habitual (o sus marcas del mes). */
  turno: Turno;
}

export interface SedeRol {
  id: number;
  nombre: string;
  nombreCorto: string;
  minimoDia: number;
  filas: FilaRol[];
  /** completos[i]: todos los que debían venir ese día ya tienen marca. */
  totales: { dia: number[]; noche: number[]; completos: boolean[] };
}

/** Un agente marcado de turno en más de una sede el mismo día. */
export interface Conflicto {
  agenteId: number;
  nombres: string;
  fecha: string;
  sedes: string[];
}

export interface RolMensual {
  mes: string;
  nombreMes: string;
  hoy: string;
  dias: DiaDelMes[];
  sedes: SedeRol[];
  conflictos: Conflicto[];
}

export interface CambioMarca {
  agenteId: number;
  sedeId: number;
  fecha: string;
  codigo: string | null;
}

export interface ResumenAgente {
  agenteId: number;
  nombres: string;
  cargo: Cargo;
  sedes: string[];
  conteos: Record<string, number>;
  diasTrabajados: number;
}

export interface DistribucionSede {
  sedeId: number;
  nombre: string;
  porCargo: Record<CargoBase, number>;
  total: number;
}

export interface Distribucion {
  turno: 'DIA' | 'NOCHE';
  sedes: DistribucionSede[];
  totales: Record<CargoBase, number> & { total: number };
}
