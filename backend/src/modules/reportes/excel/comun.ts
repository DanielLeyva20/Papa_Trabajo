import type { Borders, Cell, Worksheet } from 'exceljs';

/** Estilos y una tabla genérica para las hojas de Excel de los reportes. */

export const COLOR = {
  tinta: 'FF141414',
  gris: 'FF5F5F64',
  rojo: 'FFD70015',
  cabecera: 'FFDCE6F2',
  banda: 'FF2B2B2B',
  suave: 'FFF1F1F1',
  blanco: 'FFFFFFFF',
} as const;

export const LINEA: Partial<Borders> = {
  top: { style: 'thin', color: { argb: 'FF8C8C8C' } },
  left: { style: 'thin', color: { argb: 'FF8C8C8C' } },
  bottom: { style: 'thin', color: { argb: 'FF8C8C8C' } },
  right: { style: 'thin', color: { argb: 'FF8C8C8C' } },
};

export const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;

export function pintar(cell: Cell, fondo: string, texto: string = COLOR.tinta, negrita = false) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } };
  cell.font = { name: 'Calibri', size: 10, bold: negrita, color: { argb: texto } };
}

export interface ColumnaExcel<T> {
  titulo: string;
  ancho: number;
  valor: (fila: T, indice: number) => string | number;
  alinear?: 'left' | 'center';
  negrita?: boolean;
  /** Fondo/texto propios del encabezado (p. ej. el color de una marca). */
  cabecera?: { fondo: string; texto: string };
  /** Pinta la celda en rojo cuando devuelve true. */
  alerta?: (fila: T) => boolean;
}

/** Título y subtítulo combinados a lo ancho de la hoja. Devuelve la siguiente fila libre. */
export function encabezadoHoja(hoja: Worksheet, columnas: number, titulo: string, subtitulo: string): number {
  hoja.mergeCells(1, 1, 1, columnas);
  const t = hoja.getCell(1, 1);
  t.value = titulo;
  t.font = { name: 'Calibri', size: 15, bold: true };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  hoja.getRow(1).height = 24;

  hoja.mergeCells(2, 1, 2, columnas);
  const s = hoja.getCell(2, 1);
  s.value = subtitulo;
  s.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR.gris } };
  s.alignment = { horizontal: 'center' };
  hoja.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return 4;
}

/**
 * Escribe una tabla con encabezado, filas y (opcional) fila de totales.
 * Devuelve la siguiente fila libre, dejando un espacio.
 */
export function escribirTabla<T>(
  hoja: Worksheet,
  desde: number,
  columnas: ColumnaExcel<T>[],
  filas: T[],
  opciones: { titulo?: string; totales?: (string | number)[]; vacio?: string } = {},
): number {
  let fila = desde;
  columnas.forEach((c, i) => {
    const col = hoja.getColumn(i + 1);
    col.width = Math.max(col.width ?? 0, c.ancho);
  });

  if (opciones.titulo) {
    hoja.mergeCells(fila, 1, fila, columnas.length);
    const banda = hoja.getCell(fila, 1);
    banda.value = opciones.titulo.toUpperCase();
    pintar(banda, COLOR.banda, COLOR.blanco, true);
    banda.alignment = { vertical: 'middle', indent: 1 };
    hoja.getRow(fila).height = 20;
    fila++;
  }

  columnas.forEach((c, i) => {
    const celda = hoja.getCell(fila, i + 1);
    celda.value = c.titulo;
    pintar(celda, c.cabecera ? argb(c.cabecera.fondo) : COLOR.cabecera, c.cabecera ? argb(c.cabecera.texto) : COLOR.tinta, true);
    celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    celda.border = LINEA;
  });
  hoja.getRow(fila).height = 22;
  fila++;

  if (filas.length === 0 && opciones.vacio) {
    hoja.mergeCells(fila, 1, fila, columnas.length);
    const c = hoja.getCell(fila, 1);
    c.value = opciones.vacio;
    c.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLOR.gris } };
    c.alignment = { horizontal: 'center' };
    c.border = LINEA;
    fila++;
  }

  filas.forEach((dato, n) => {
    columnas.forEach((c, i) => {
      const celda = hoja.getCell(fila, i + 1);
      celda.value = c.valor(dato, n);
      celda.border = LINEA;
      celda.font = { name: 'Calibri', size: 10, bold: c.negrita ?? false };
      celda.alignment = { vertical: 'middle', horizontal: c.alinear ?? 'center', wrapText: c.alinear === 'left' };
      if (c.alerta?.(dato)) pintar(celda, COLOR.rojo, COLOR.blanco, true);
    });
    fila++;
  });

  if (opciones.totales) {
    opciones.totales.forEach((v, i) => {
      const celda = hoja.getCell(fila, i + 1);
      celda.value = v;
      pintar(celda, COLOR.suave, COLOR.tinta, true);
      celda.border = LINEA;
      celda.alignment = { vertical: 'middle', horizontal: columnas[i]?.alinear ?? 'center' };
    });
    fila++;
  }
  return fila + 2;
}
