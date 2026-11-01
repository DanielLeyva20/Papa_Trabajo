import { MESES, hoyEnPeru, parseMes } from '../../shared/calendar.js';
import { codigosService } from '../codigos/codigos.service.js';
import { configuracionService } from '../configuracion/configuracion.service.js';
import { rolService } from '../rol/rol.service.js';
import type { RolMensual } from '../rol/rol.types.js';
import { construirExcel } from './excel.builder.js';
import { construirPdf } from './pdf.builder.js';
import type { Alcance, ReporteDatos } from './reporte.types.js';

export interface ArchivoGenerado {
  nombre: string;
  tipo: string;
  contenido: Buffer;
}

/** Recorta el rol hasta el día indicado (inclusive). */
function recortar(rol: RolMensual, hastaDia: number): RolMensual {
  return {
    ...rol,
    dias: rol.dias.slice(0, hastaDia),
    sedes: rol.sedes.map((s) => ({
      ...s,
      filas: s.filas.map((f) => ({ ...f, marcas: f.marcas.slice(0, hastaDia) })),
      totales: {
        dia: s.totales.dia.slice(0, hastaDia),
        noche: s.totales.noche.slice(0, hastaDia),
        completos: s.totales.completos.slice(0, hastaDia),
      },
    })),
    conflictos: rol.conflictos.filter((c) => Number(c.fecha.slice(8, 10)) <= hastaDia),
  };
}

async function prepararDatos(mes: string, alcance: Alcance): Promise<ReporteDatos> {
  const completo = await rolService.obtener(mes);
  const hoy = hoyEnPeru();
  const { month } = parseMes(mes);

  // "Hasta hoy" solo recorta el mes en curso; un mes pasado ya está completo.
  const recorta = alcance === 'hasta-hoy' && hoy.mes === mes;
  const rol = recorta ? recortar(completo, hoy.dia) : completo;
  const corte = recorta ? `Avance al ${hoy.dia} de ${MESES[month - 1]!.toLowerCase()}` : 'Mes completo';

  const [config, resumen, distribucionDia, distribucionNoche, codigos] = await Promise.all([
    configuracionService.obtener(),
    rolService.resumen(rol),
    rolService.distribucion(completo, 'DIA'),
    rolService.distribucion(completo, 'NOCHE'),
    codigosService.listar(),
  ]);

  return {
    config,
    rol,
    resumen,
    distribucionDia,
    distribucionNoche,
    codigos,
    corte,
    generadoEn: new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short',
    }).format(new Date()),
  };
}

function nombreArchivo(datos: ReporteDatos, extension: string): string {
  const sufijo = datos.corte === 'Mes completo' ? '' : ` (al ${datos.rol.dias.length})`;
  return `ROL DF - ${datos.rol.nombreMes}${sufijo}.${extension}`;
}

export const reportesService = {
  async excel(mes: string, alcance: Alcance): Promise<ArchivoGenerado> {
    const datos = await prepararDatos(mes, alcance);
    return {
      nombre: nombreArchivo(datos, 'xlsx'),
      tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: await construirExcel(datos),
    };
  },

  async pdf(mes: string, alcance: Alcance): Promise<ArchivoGenerado> {
    const datos = await prepararDatos(mes, alcance);
    return {
      nombre: nombreArchivo(datos, 'pdf'),
      tipo: 'application/pdf',
      contenido: await construirPdf(datos),
    };
  },
};
