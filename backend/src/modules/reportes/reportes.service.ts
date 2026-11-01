import { MESES, hoyEnPeru, parseMes } from '../../shared/calendar.js';
import { codigosService } from '../codigos/codigos.service.js';
import { configuracionService } from '../configuracion/configuracion.service.js';
import { rolService } from '../rol/rol.service.js';
import type { RolMensual } from '../rol/rol.types.js';
import { calcularAusencias } from './datos/ausencias.js';
import { calcularGeneral } from './datos/general.js';
import { ETIQUETA_VISTA, aplicarVista, type Vista } from './datos/vistas.js';
import { construirAusenciasExcel } from './excel/ausencias.excel.js';
import { construirGeneralExcel } from './excel/general.excel.js';
import { construirExcel as construirRolExcel } from './excel/rol.excel.js';
import { construirAusenciasPdf } from './pdf/ausencias.pdf.js';
import { construirGeneralPdf } from './pdf/general.pdf.js';
import { construirPdf as construirRolPdf } from './pdf/rol.pdf.js';
import type { Alcance, ArchivoGenerado, Contexto, Formato } from './reportes.types.js';

const TIPO: Record<Formato, { mime: string; extension: string }> = {
  excel: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx' },
  pdf: { mime: 'application/pdf', extension: 'pdf' },
};

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

/** Rol del período pedido + datos comunes de encabezado. "Hasta hoy" solo recorta el mes en curso. */
async function preparar(mes: string, alcance: Alcance) {
  const completo = await rolService.obtener(mes);
  const hoy = hoyEnPeru();
  const recorta = alcance === 'hasta-hoy' && hoy.mes === mes;
  const rol = recorta ? recortar(completo, hoy.dia) : completo;

  const [config, codigos] = await Promise.all([configuracionService.obtener(), codigosService.listar()]);
  const contexto: Contexto = {
    config,
    codigos,
    nombreMes: completo.nombreMes,
    corte: recorta ? `Avance al ${hoy.dia} de ${MESES[parseMes(mes).month - 1]!.toLowerCase()}` : 'Mes completo',
    generadoEn: new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short' }).format(
      new Date(),
    ),
  };
  return { completo, rol, contexto, sufijo: recorta ? ` (al ${hoy.dia})` : '' };
}

const archivo = (formato: Formato, nombre: string, contenido: Buffer): ArchivoGenerado => ({
  nombre: `${nombre}.${TIPO[formato].extension}`,
  tipo: TIPO[formato].mime,
  contenido,
});

export const reportesService = {
  /** El rol oficial, con día y noche juntos, separados o uno solo. */
  async rol(formato: Formato, mes: string, alcance: Alcance, vista: Vista): Promise<ArchivoGenerado> {
    const { completo, rol, contexto, sufijo } = await preparar(mes, alcance);
    const categorias = await codigosService.categorias();
    const visto = aplicarVista(rol, vista, categorias);
    const [resumen, distribucionDia, distribucionNoche] = await Promise.all([
      rolService.resumen(visto),
      rolService.distribucion(completo, 'DIA'),
      rolService.distribucion(completo, 'NOCHE'),
    ]);
    const datos = {
      ...contexto,
      corte: vista === 'juntos' ? contexto.corte : `${contexto.corte} · ${ETIQUETA_VISTA[vista]}`,
      rol: visto,
      resumen,
      distribucionDia,
      distribucionNoche,
    };
    const extra = vista === 'dia' ? ' - Día' : vista === 'noche' ? ' - Noche' : vista === 'separados' ? ' - Día y noche' : '';
    const contenido = formato === 'excel' ? await construirRolExcel(datos) : await construirRolPdf(datos);
    return archivo(formato, `ROL DF - ${completo.nombreMes}${extra}${sufijo}`, contenido);
  },

  /** Promedios por sede y agentes de día / de noche. */
  async general(formato: Formato, mes: string, alcance: Alcance): Promise<ArchivoGenerado> {
    const { rol, contexto, sufijo } = await preparar(mes, alcance);
    const datos = { ...contexto, general: calcularGeneral(rol, await codigosService.categorias()) };
    const contenido = formato === 'excel' ? await construirGeneralExcel(datos) : await construirGeneralPdf(datos);
    return archivo(formato, `Reporte general - ${contexto.nombreMes}${sufijo}`, contenido);
  },

  /** Faltas, descansos médicos, permisos y vacaciones del período. */
  async ausencias(formato: Formato, mes: string, alcance: Alcance): Promise<ArchivoGenerado> {
    const { rol, contexto, sufijo } = await preparar(mes, alcance);
    const datos = { ...contexto, ausencias: calcularAusencias(rol, contexto.codigos) };
    const contenido = formato === 'excel' ? await construirAusenciasExcel(datos) : await construirAusenciasPdf(datos);
    return archivo(formato, `Faltas y permisos - ${contexto.nombreMes}${sufijo}`, contenido);
  },
};
