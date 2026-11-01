import ExcelJS from 'exceljs';
import { CARGO_ETIQUETA } from '../../../shared/domain.js';
import type { AgenteGeneral, SedeGeneral } from '../datos/general.js';
import type { DatosGeneral } from '../reportes.types.js';
import { encabezadoHoja, escribirTabla, type ColumnaExcel } from './comun.js';

/** Reporte general: promedios por sede y agentes de día / de noche. */
export async function construirGeneralExcel(datos: DatosGeneral): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = datos.config.supervisor;
  const { general } = datos;
  const subtitulo = `${datos.config.entidad.toUpperCase()}  ·  ${datos.corte}  ·  ${general.diasConsiderados} días`;

  // ---------- Hoja 1: por sede ----------
  const sedes = libro.addWorksheet('POR SEDE');
  const colSedes: ColumnaExcel<SedeGeneral>[] = [
    { titulo: 'N.º', ancho: 6, valor: (_s, i) => i + 1 },
    { titulo: 'Sede / Dependencia', ancho: 48, valor: (s) => s.nombre, alinear: 'left', negrita: true },
    { titulo: 'Agentes de día', ancho: 12, valor: (s) => s.agentesDia },
    { titulo: 'Agentes de noche', ancho: 12, valor: (s) => s.agentesNoche },
    { titulo: 'Turnos de día', ancho: 12, valor: (s) => s.turnosDia },
    { titulo: 'Turnos de noche', ancho: 12, valor: (s) => s.turnosNoche },
    { titulo: 'Promedio por día (día)', ancho: 14, valor: (s) => s.promedioDia, negrita: true },
    { titulo: 'Promedio por día (noche)', ancho: 14, valor: (s) => s.promedioNoche, negrita: true },
    { titulo: 'Mínimo de día', ancho: 10, valor: (s) => s.minimoDia },
    { titulo: 'Días bajo el mínimo', ancho: 12, valor: (s) => s.diasBajoMinimo, alerta: (s) => s.diasBajoMinimo > 0 },
  ];
  let fila = encabezadoHoja(sedes, colSedes.length, `REPORTE GENERAL – ${datos.nombreMes.toUpperCase()}`, subtitulo);
  escribirTabla(sedes, fila, colSedes, general.sedes, {
    totales: [
      '',
      'TOTAL',
      general.diurnos.length,
      general.nocturnos.length,
      general.totales.turnosDia,
      general.totales.turnosNoche,
      general.totales.promedioDia,
      general.totales.promedioNoche,
      '',
      general.totales.diasBajoMinimo,
    ],
  });

  // ---------- Hojas 2 y 3: diurnos y nocturnos ----------
  const tipos = datos.codigos;
  const colAgentes: ColumnaExcel<AgenteGeneral>[] = [
    { titulo: 'N.º', ancho: 6, valor: (_a, i) => i + 1 },
    { titulo: 'Apellidos y nombres', ancho: 32, valor: (a) => a.nombres, alinear: 'left', negrita: true },
    { titulo: 'Cargo', ancho: 20, valor: (a) => CARGO_ETIQUETA[a.cargo] },
    { titulo: 'Sedes', ancho: 28, valor: (a) => a.sedes.join(', '), alinear: 'left' },
    ...tipos.map(
      (t): ColumnaExcel<AgenteGeneral> => ({
        titulo: t.codigo,
        ancho: 7,
        valor: (a) => a.conteos[t.codigo] ?? 0,
        cabecera: { fondo: t.colorFondo, texto: t.colorTexto },
      }),
    ),
    { titulo: 'Turnos trabajados', ancho: 12, valor: (a) => a.turnosDia + a.turnosNoche, negrita: true },
  ];
  const listas: [string, AgenteGeneral[]][] = [
    ['DIURNOS', general.diurnos],
    ['NOCTURNOS', general.nocturnos],
  ];
  for (const [nombre, agentes] of listas) {
    const hoja = libro.addWorksheet(nombre);
    fila = encabezadoHoja(hoja, colAgentes.length, `AGENTES ${nombre} – ${datos.nombreMes.toUpperCase()}`, subtitulo);
    escribirTabla(hoja, fila, colAgentes, agentes, { vacio: 'No hay agentes en este turno.' });
  }

  return Buffer.from(await libro.xlsx.writeBuffer());
}
