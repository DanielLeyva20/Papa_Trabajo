import ExcelJS from 'exceljs';
import { CARGO_ETIQUETA } from '../../../shared/domain.js';
import type { Ausencia, AusenciasAgente } from '../datos/ausencias.js';
import type { DatosAusencias } from '../reportes.types.js';
import { argb, encabezadoHoja, escribirTabla, pintar, type ColumnaExcel } from './comun.js';

/** Faltas, descansos médicos, permisos y vacaciones: resumen por agente y detalle día por día. */
export async function construirAusenciasExcel(datos: DatosAusencias): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = datos.config.supervisor;
  const { ausencias } = datos;
  const titulo = `FALTAS, DESCANSOS MÉDICOS Y PERMISOS – ${datos.nombreMes.toUpperCase()}`;
  const subtitulo = `${datos.config.entidad.toUpperCase()}  ·  ${datos.corte}  ·  ${ausencias.totales.total} registros`;

  // ---------- Hoja 1: resumen por agente ----------
  const resumen = libro.addWorksheet('RESUMEN');
  const colResumen: ColumnaExcel<AusenciasAgente>[] = [
    { titulo: 'N.º', ancho: 6, valor: (_a, i) => i + 1 },
    { titulo: 'Apellidos y nombres', ancho: 32, valor: (a) => a.nombres, alinear: 'left', negrita: true },
    { titulo: 'Cargo', ancho: 20, valor: (a) => CARGO_ETIQUETA[a.cargo] },
    { titulo: 'Sedes', ancho: 26, valor: (a) => a.sedes.join(', '), alinear: 'left' },
    ...ausencias.tipos.map(
      (t): ColumnaExcel<AusenciasAgente> => ({
        titulo: t.nombre,
        ancho: 13,
        valor: (a) => a.conteos[t.codigo] ?? 0,
        cabecera: { fondo: t.colorFondo, texto: t.colorTexto },
      }),
    ),
    { titulo: 'Total', ancho: 9, valor: (a) => a.total, negrita: true },
  ];
  escribirTabla(resumen, encabezadoHoja(resumen, colResumen.length, titulo, subtitulo), colResumen, ausencias.porAgente, {
    vacio: 'No se registraron ausencias en este período.',
    totales: ['', 'TOTAL', '', '', ...ausencias.tipos.map((t) => ausencias.totales[t.codigo] ?? 0), ausencias.totales.total],
  });

  // ---------- Hoja 2: detalle ----------
  const detalle = libro.addWorksheet('DETALLE');
  const colorDe = new Map(ausencias.tipos.map((t) => [t.codigo, t]));
  const colDetalle: ColumnaExcel<Ausencia>[] = [
    { titulo: 'Fecha', ancho: 12, valor: (a) => a.fecha.split('-').reverse().join('/') },
    { titulo: 'Día', ancho: 6, valor: (a) => a.letra },
    { titulo: 'Apellidos y nombres', ancho: 32, valor: (a) => a.nombres, alinear: 'left', negrita: true },
    { titulo: 'Cargo', ancho: 20, valor: (a) => CARGO_ETIQUETA[a.cargo] },
    { titulo: 'Sede', ancho: 18, valor: (a) => a.sede },
    { titulo: 'Marca', ancho: 8, valor: (a) => a.codigo, negrita: true },
    { titulo: 'Tipo', ancho: 18, valor: (a) => a.tipo, alinear: 'left' },
  ];
  const primera = encabezadoHoja(detalle, colDetalle.length, titulo, subtitulo);
  escribirTabla(detalle, primera, colDetalle, ausencias.detalle, { vacio: 'No se registraron ausencias en este período.' });
  // La columna de la marca lleva su color, como en el rol.
  ausencias.detalle.forEach((a, i) => {
    const t = colorDe.get(a.codigo);
    if (t) pintar(detalle.getCell(primera + 1 + i, 6), argb(t.colorFondo), argb(t.colorTexto), true);
  });
  detalle.views = [{ state: 'frozen', ySplit: primera }];

  return Buffer.from(await libro.xlsx.writeBuffer());
}
