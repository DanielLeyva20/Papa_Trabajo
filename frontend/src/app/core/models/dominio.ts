/** Modelos que reflejan las respuestas de la API. */

/** Cargo base o base + `_DESC` (descansero: cubre los descansos de otros). */
export type Cargo =
  | 'SUPERVISOR'
  | 'SUPERVISOR_DESC'
  | 'ARMADO'
  | 'ARMADO_DESC'
  | 'SIMPLE'
  | 'SIMPLE_DESC'
  | 'FEMINA'
  | 'FEMINA_DESC';

/** Cargo sin la condición de descansero (lo que cuenta el cuadro de distribución). */
export type CargoBase = 'SUPERVISOR' | 'ARMADO' | 'SIMPLE' | 'FEMINA';

export const CARGOS_FIJOS: readonly CargoBase[] = ['SUPERVISOR', 'ARMADO', 'SIMPLE', 'FEMINA'];
export const CARGOS_DESCANSEROS: readonly Cargo[] = ['SUPERVISOR_DESC', 'ARMADO_DESC', 'SIMPLE_DESC', 'FEMINA_DESC'];
export const CARGOS: readonly Cargo[] = [...CARGOS_FIJOS, ...CARGOS_DESCANSEROS];

export const CARGO_ETIQUETA: Record<Cargo, string> = {
  SUPERVISOR: 'Supervisor',
  SUPERVISOR_DESC: 'Supervisor descansero',
  ARMADO: 'Armado',
  ARMADO_DESC: 'Armado descansero',
  SIMPLE: 'Simple',
  SIMPLE_DESC: 'Simple descansero',
  FEMINA: 'Fémina',
  FEMINA_DESC: 'Fémina descansera',
};

export const esDescansero = (cargo: Cargo) => cargo.endsWith('_DESC');

/** Turno de un agente: de día (diurno) o de noche (nocturno). */
export type Turno = 'DIA' | 'NOCHE';

/** Cómo se muestran los turnos en el rol y en las descargas. */
export type VistaTurno = 'juntos' | 'separados' | 'dia' | 'noche';

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
  turno: Turno;
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
  sedes: { sedeId: number; nombre: string; porCargo: Record<CargoBase, number>; total: number }[];
  totales: Record<CargoBase, number> & { total: number };
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


// ---------- Importar desde Excel ----------

export interface FilaPrevia {
  nombres: string;
  cargoTexto: string;
  cargo: Cargo;
  /** null = agente nuevo (se creará al importar). */
  agenteId: number | null;
  /** Existe pero estaba dado de baja: se reactivará. */
  reactivar: boolean;
  marcas: (string | null)[];
  avisos: string[];
}

export interface BloquePrevio {
  id: number;
  hoja: string;
  titulo: string;
  /** Sede sugerida por el nombre de la tabla; null si no se reconoció. */
  sedeId: number | null;
  mes: string | null;
  filas: FilaPrevia[];
  avisos: string[];
}

export interface AnalisisImportacion {
  mes: string | null;
  bloques: BloquePrevio[];
  avisos: string[];
}

export interface PlanImportacion {
  mes: string;
  reemplazar: boolean;
  bloques: { sedeId: number; filas: Pick<FilaPrevia, 'nombres' | 'cargo' | 'agenteId' | 'marcas'>[] }[];
}

export interface ResultadoImportacion {
  agentesNuevos: number;
  agentesReactivados: number;
  asignacionesNuevas: number;
  marcasGuardadas: number;
  marcasBorradas: number;
}
