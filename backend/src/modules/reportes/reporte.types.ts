import type { CodigoTurno } from '../codigos/codigos.service.js';
import type { Configuracion } from '../configuracion/configuracion.service.js';
import type { Distribucion, ResumenAgente, RolMensual } from '../rol/rol.types.js';

export type Alcance = 'completo' | 'hasta-hoy';

/** Todo lo que necesita un generador de archivos, ya calculado. */
export interface ReporteDatos {
  config: Configuracion;
  rol: RolMensual;
  resumen: ResumenAgente[];
  distribucionDia: Distribucion;
  distribucionNoche: Distribucion;
  codigos: CodigoTurno[];
  /** Texto del corte, p. ej. "Mes completo" o "Avance al 15 de noviembre". */
  corte: string;
  generadoEn: string;
}
