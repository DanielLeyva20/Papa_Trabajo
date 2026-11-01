import type { Cargo } from '../../shared/domain.js';

/** Lo que el lector encontró en el Excel, sin interpretar contra la base de datos. */
export interface FilaLeida {
  /** Número de fila en la hoja (para avisos). */
  fila: number;
  nombres: string;
  cargoTexto: string;
  /** Una marca por día del mes (índice 0 = día 1); null = celda vacía. */
  marcas: (string | null)[];
  /** Celdas con algo que no es una marca conocida, p. ej. «X» o «?». */
  desconocidas: { dia: number; valor: string }[];
}

export interface BloqueLeido {
  hoja: string;
  /** Nombre de la sede tal como está escrito en el Excel. */
  titulo: string;
  /** Mes detectado en el encabezado (AAAA-MM) o null si no se pudo saber. */
  mes: string | null;
  /** Cantidad de días que tiene el encabezado (28 a 31). */
  dias: number;
  filas: FilaLeida[];
}

// ---------- Vista previa que se envía a la pantalla ----------

export interface FilaPrevia {
  nombres: string;
  cargoTexto: string;
  /** Cargo reconocido (o el del agente si ya existe). */
  cargo: Cargo;
  agenteId: number | null;
  /** El agente existe pero está dado de baja: se reactivará. */
  reactivar: boolean;
  marcas: (string | null)[];
  avisos: string[];
}

export interface BloquePrevio {
  id: number;
  hoja: string;
  titulo: string;
  /** Sede sugerida por parecido de nombre (el usuario puede cambiarla). */
  sedeId: number | null;
  mes: string | null;
  filas: FilaPrevia[];
  avisos: string[];
}

export interface AnalisisImportacion {
  /** Mes sugerido para importar (el más frecuente entre los bloques). */
  mes: string | null;
  bloques: BloquePrevio[];
  avisos: string[];
}

// ---------- Plan confirmado por el usuario ----------

export interface FilaPlan {
  nombres: string;
  cargo: Cargo;
  agenteId: number | null;
  marcas: (string | null)[];
}

export interface PlanImportacion {
  mes: string;
  /** true: las celdas vacías del Excel borran lo que había en el sistema para ese agente y sede. */
  reemplazar: boolean;
  bloques: { sedeId: number; filas: FilaPlan[] }[];
}

export interface ResultadoImportacion {
  agentesNuevos: number;
  agentesReactivados: number;
  asignacionesNuevas: number;
  marcasGuardadas: number;
  marcasBorradas: number;
}
