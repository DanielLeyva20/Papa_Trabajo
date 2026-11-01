import PDFDocument from 'pdfkit';

/** Documento, encabezado y una tabla genérica (con salto de página) para los reportes en PDF. */

export type Doc = PDFKit.PDFDocument;

export const MARGEN = 28;
export const COLOR = {
  tinta: '#141414',
  gris: '#5F5F64',
  rojo: '#D70015',
  linea: '#B4B4B9',
  cabecera: '#DCE6F2',
  banda: '#2B2B2B',
  suave: '#F1F1F1',
} as const;

export const anchoUtil = (doc: Doc) => doc.page.width - MARGEN * 2;
const limiteInferior = (doc: Doc) => doc.page.height - MARGEN - 20;

/** Crea el documento y devuelve una función que lo cierra y entrega los bytes. */
export function crearDocumento(titulo: string, autor: string, horizontal = true) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: horizontal ? 'landscape' : 'portrait',
    margin: MARGEN,
    bufferPages: true,
    info: { Title: titulo, Author: autor },
  });
  const partes: Buffer[] = [];
  doc.on('data', (p: Buffer) => partes.push(p));
  const listo = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(partes))));
  return {
    doc,
    terminar(pie: string): Promise<Buffer> {
      piesDePagina(doc, pie);
      doc.end();
      return listo;
    },
  };
}

export function encabezado(doc: Doc, titulo: string, subtitulo: string): void {
  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLOR.tinta)
    .text(titulo, MARGEN, MARGEN, { width: anchoUtil(doc), align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor(COLOR.gris).text(subtitulo, { width: anchoUtil(doc), align: 'center' });
  doc.y += 12;
}

/** Bloque de cifras destacadas (p. ej. promedios) en una fila. */
export function cifras(doc: Doc, items: { etiqueta: string; valor: string }[]): void {
  const ancho = anchoUtil(doc) / items.length;
  const y = doc.y;
  items.forEach((it, i) => {
    const x = MARGEN + i * ancho;
    doc.roundedRect(x + 4, y, ancho - 8, 44, 6).fill(COLOR.suave);
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR.tinta).text(it.valor, x + 4, y + 7, { width: ancho - 8, align: 'center' });
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.gris).text(it.etiqueta, x + 4, y + 28, { width: ancho - 8, align: 'center' });
  });
  doc.y = y + 56;
}

export interface ColumnaPdf<T> {
  titulo: string;
  /** Ancho relativo (se reparte el ancho útil de la página). */
  peso: number;
  valor: (fila: T, indice: number) => string;
  alinear?: 'left' | 'center';
  negrita?: boolean;
  cabecera?: { fondo: string; texto: string };
  alerta?: (fila: T) => boolean;
}

interface EstiloCelda {
  fondo?: string;
  texto?: string;
  negrita?: boolean;
  alinear?: 'left' | 'center';
}

function celda(doc: Doc, x: number, y: number, w: number, h: number, texto: string, e: EstiloCelda = {}) {
  if (e.fondo) doc.rect(x, y, w, h).fill(e.fondo);
  doc.lineWidth(0.5).strokeColor(COLOR.linea).rect(x, y, w, h).stroke();
  if (!texto) return;
  const alinear = e.alinear ?? 'center';
  const pad = alinear === 'center' ? 1 : 4;
  doc.font(e.negrita ? 'Helvetica-Bold' : 'Helvetica').fillColor(e.texto ?? COLOR.tinta)
    .text(texto, x + pad, y + (h - doc.currentLineHeight()) / 2 + 0.5, {
      width: w - pad * 2, align: alinear, lineBreak: false, ellipsis: true,
    });
}

/** Tabla que salta de página cuando no cabe y repite su encabezado. */
export function tabla<T>(
  doc: Doc,
  columnas: ColumnaPdf<T>[],
  filas: T[],
  opciones: { titulo?: string; totales?: string[]; vacio?: string; alto?: number } = {},
): void {
  const alto = opciones.alto ?? 15;
  const total = columnas.reduce((s, c) => s + c.peso, 0);
  const anchos = columnas.map((c) => (c.peso / total) * anchoUtil(doc));

  const dibujarFila = (valores: string[], estilo: (i: number) => EstiloCelda) => {
    let x = MARGEN;
    valores.forEach((v, i) => {
      celda(doc, x, doc.y, anchos[i]!, alto, v, estilo(i));
      x += anchos[i]!;
    });
    doc.y += alto;
  };
  const dibujarCabecera = () => {
    doc.fontSize(7.5);
    dibujarFila(columnas.map((c) => c.titulo), (i) => ({
      fondo: columnas[i]!.cabecera?.fondo ?? COLOR.cabecera,
      texto: columnas[i]!.cabecera?.texto ?? COLOR.tinta,
      negrita: true,
    }));
  };
  const asegurarEspacio = (necesario: number, repetirCabecera: boolean) => {
    if (doc.y + necesario <= limiteInferior(doc)) return;
    doc.addPage();
    doc.y = MARGEN;
    if (repetirCabecera) dibujarCabecera();
  };

  asegurarEspacio(alto * 4 + 20, false);
  if (opciones.titulo) {
    doc.rect(MARGEN, doc.y, anchoUtil(doc), alto + 3).fill(COLOR.banda);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF')
      .text(opciones.titulo.toUpperCase(), MARGEN + 6, doc.y + 4.5, { lineBreak: false });
    doc.y += alto + 3;
  }
  dibujarCabecera();

  if (filas.length === 0 && opciones.vacio) {
    doc.fontSize(8);
    celda(doc, MARGEN, doc.y, anchoUtil(doc), alto + 4, opciones.vacio, { texto: COLOR.gris });
    doc.y += alto + 4;
  }

  doc.fontSize(7.5);
  filas.forEach((fila, n) => {
    asegurarEspacio(alto, true);
    doc.fontSize(7.5);
    dibujarFila(columnas.map((c) => c.valor(fila, n)), (i) => {
      const c = columnas[i]!;
      return c.alerta?.(fila)
        ? { fondo: COLOR.rojo, texto: '#FFFFFF', negrita: true, alinear: c.alinear }
        : { negrita: c.negrita, alinear: c.alinear };
    });
  });

  if (opciones.totales) {
    asegurarEspacio(alto, true);
    dibujarFila(opciones.totales, (i) => ({ fondo: COLOR.suave, negrita: true, alinear: columnas[i]?.alinear }));
  }
  doc.y += 14;
}

function piesDePagina(doc: Doc, texto: string): void {
  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    const y = doc.page.height - MARGEN - 6;
    doc.font('Helvetica').fontSize(7).fillColor('#666666');
    doc.text(texto, MARGEN, y, { lineBreak: false });
    doc.text(`Página ${i + 1} de ${rango.count}`, MARGEN, y, { width: anchoUtil(doc), align: 'right', lineBreak: false });
  }
}
