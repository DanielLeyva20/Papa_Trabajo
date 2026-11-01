/** Modelos que reflejan las respuestas de la API local. */

export type Cargo = 'SUPERVISOR' | 'ARMADO' | 'SIMPLE' | 'FEMINA' | 'FEMINA_DESC';

export const CARGOS: readonly Cargo[] = ['SUPERVISOR', 'ARMADO', 'SIMPLE', 'FEMINA', 'FEMINA_DESC'];

export const CARGO_ETIQUETA: Record<Cargo, string> = {
  SUPERVISOR: 'Supervisor',
  ARMADO: 'Armado',
  SIMPLE: 'Simple',
  FEMINA: 'Fémina',
  FEMINA_DESC: 'Fémina descansera',
};

export type CategoriaCodigo = 'DIA' | 'NOCHE' | 'LIBRE' | 'AUSENCIA';

export interface CodigoTurno {
  codigo: string;
  nombre: string;
  categoria: CategoriaCodigo;
  tecla: string;
  colorFondo: string;
  colorTexto: string;
}

/** 7 casilleros: índice 0 = Lunes … 6 = Domingo. */
export type PatronSemanal = (string | null)[];

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
export const LETRAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

export interface Sede {
  id: number;
  nombre: string;
  nombreCorto: string;
  orden: number;
  activa: boolean;
  /** Agentes de día que debe haber cada día en la sede. */
  minimoDia: number;
}

export interface Agente {
  id: number;
  nombres: string;
  cargo: Cargo;
  dni: string | null;
  telefono: string | null;
  activo: boolean;
  fotoVersion: string | null;
  sedes: string[];
}

export interface Feriado {
  fecha: string;
  nombre: string;
  tipo: 'NACIONAL' | 'LOCAL';
}

export interface Asignacion {
  id: number;
  agenteId: number;
  sedeId: number;
  nombres: string;
  cargo: Cargo;
  orden: number;
  patron: PatronSemanal;
  desde: string;
  hasta: string | null;
}

export interface DiaDelMes {
  fecha: string;
  dia: number;
  indiceSemana: number;
  letra: string;
  esDomingo: boolean;
  feriado: string | null;
}

export interface FilaRol {
  asignacionId: number | null;
  agenteId: number;
  nombres: string;
  cargo: Cargo;
  patron: PatronSemanal | null;
  marcas: (string | null)[];
  fotoVersion: string | null;
}

export interface SedeRol {
  id: number;
  nombre: string;
  nombreCorto: string;
  minimoDia: number;
  filas: FilaRol[];
}

export interface RolMensual {
  mes: string;
  nombreMes: string;
  hoy: string;
  dias: DiaDelMes[];
  sedes: SedeRol[];
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

export interface Distribucion {
  turno: 'DIA' | 'NOCHE';
  sedes: { sedeId: number; nombre: string; porCargo: Record<Cargo, number>; total: number }[];
  totales: Record<Cargo, number> & { total: number };
}

export interface ResumenMensual {
  agentes: ResumenAgente[];
  distribucionDia: Distribucion;
  distribucionNoche: Distribucion;
}

export interface Configuracion {
  titulo: string;
  entidad: string;
  supervisor: string;
}

/** Dónde viven los datos (Turso en la nube o un archivo en la PC). */
export interface InfoRespaldo {
  enLaNube: boolean;
  descripcion: string;
}

