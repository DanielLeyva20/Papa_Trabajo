import type { CodigoTurno } from '../codigos/codigos.service.js';
import type { Configuracion } from '../configuracion/configuracion.service.js';
import type { Distribucion, ResumenAgente, RolMensual } from '../rol/rol.types.js';
import type { ReporteAusencias } from './datos/ausencias.js';
import type { ReporteGeneral } from './datos/general.js';

export const ALCANCES = ['completo', 'hasta-hoy'] as const;
export type Alcance = (typeof ALCANCES)[number];

export const FORMATOS = ['excel', 'pdf'] as const;
export type Formato = (typeof FORMATOS)[number];

/** Datos comunes a todos los reportes: encabezado, corte y marcas. */
export interface Contexto {
  config: Configuracion;
  codigos: CodigoTurno[];
  nombreMes: string;
  /** Texto del corte, p. ej. "Mes completo" o "Avance al 15 de noviembre". */
  corte: string;
  generadoEn: string;
}

/** Rol del mes (el documento oficial). */
export interface ReporteDatos extends Contexto {
  rol: RolMensual;
  resumen: ResumenAgente[];
  distribucionDia: Distribucion;
  distribucionNoche: Distribucion;
}

export interface DatosGeneral extends Contexto {
  general: ReporteGeneral;
}

export interface DatosAusencias extends Contexto {
  ausencias: ReporteAusencias;
}

export interface ArchivoGenerado {
  nombre: string;
  tipo: string;
  contenido: Buffer;
}
