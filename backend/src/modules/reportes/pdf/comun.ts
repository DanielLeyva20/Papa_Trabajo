import PDFDocument from 'pdfkit';

/**
 * Piezas comunes de todos los PDF: documento, encabezado, cifras, celdas y tablas con salto de página.
 *
 * Regla de oro con pdfkit: cada `doc.text()` mueve el cursor (`doc.y`) y, si el texto pasa del margen
 * inferior o no cabe en el ancho, agrega páginas o parte la línea. Por eso todo texto dentro de una
 * celda se escribe con `textoEnCaja`, que no parte líneas, no mueve el cursor y nunca crea páginas.
 */

export type Doc = PDFKit.PDFDocument;
type Alineacion = 'left' | 'center' | 'right';

export const MARGEN = 26;
/** Espacio reservado al pie de cada página (texto «Generado el…» y número de página). */
const ALTO_PIE = 22;

export const COLOR = {
  tinta: '#141414',
  gris: '#5F5F64',
  tenue: '#A1A1A6',
  rojo: '#D70015',
  linea: '#B4B4B9',
  cabecera: '#DCE6F2',
  banda: '#2B2B2B',
  suave: '#F1F1F1',
  cebra: '#FAFAFB',
  blanco: '#FFFFFF',
} as const;

export const FUENTE = { normal: 'Helvetica', negrita: 'Helvetica-Bold' } as const;

export const anchoUtil = (doc: Doc) => doc.page.width - MARGEN * 2;
/** Hasta dónde se puede dibujar contenido sin pisar el pie de página. */
export const limiteInferior = (doc: Doc) => doc.page.height - MARGEN - ALTO_PIE;

/** Crea el documento y devuelve una función que pone los pies de página, lo cierra y entrega los bytes. */
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

/** Pasa a una página nueva si lo que sigue no cabe. Devuelve true si cambió de página. */
export function saltoSiNoCabe(doc: Doc, alto: number): boolean {
  if (doc.y + alto <= limiteInferior(doc)) return false;
  doc.addPage();
  doc.y = MARGEN;
  return true;
}

// ---------- Texto ----------

export interface EstiloTexto {
  tamano: number;
  negrita?: boolean;
  color?: string;
  alinear?: Alineacion;
  /** Margen interno a los costados. */
  relleno?: number;
  /** Tamaño mínimo al achicar un texto que no cabe. */
  minimo?: number;
}

/**
 * Escribe UNA línea centrada verticalmente en la caja (x, y, ancho, alto).
 * Si no cabe, achica la letra hasta `minimo` y, si aún así no cabe, la recorta con «…».
 * No mueve `doc.y` ni agrega páginas.
 */
export function textoEnCaja(doc: Doc, texto: string, x: number, y: number, ancho: number, alto: number, e: EstiloTexto): void {
  if (!texto) return;
  const relleno = e.relleno ?? (e.alinear === 'left' || e.alinear === 'right' ? 4 : 1.5);
  const disponible = Math.max(ancho - relleno * 2, 1);
  const minimo = e.minimo ?? Math.min(5.5, e.tamano);

  doc.font(e.negrita ? FUENTE.negrita : FUENTE.normal);
  let tamano = e.tamano;
  doc.fontSize(tamano);
  while (tamano > minimo && doc.widthOfString(texto) > disponible) doc.fontSize((tamano -= 0.25));

  let linea = texto;
  if (doc.widthOfString(linea) > disponible) {
    while (linea.length > 1 && doc.widthOfString(`${linea}…`) > disponible) linea = linea.slice(0, -1);
    linea = `${linea.trimEnd()}…`;
  }

  const anchoTexto = doc.widthOfString(linea);
  const alinear = e.alinear ?? 'center';
  const tx = alinear === 'left' ? x + relleno : alinear === 'right' ? x + ancho - relleno - anchoTexto : x + (ancho - anchoTexto) / 2;
  // Helvetica: la altura visible de las mayúsculas es ~0.7 del tamaño; así queda centrado a la vista.
  const ty = y + (alto - tamano * 0.7) / 2 - tamano * 0.18;

  const cursor = doc.y;
  doc.fillColor(e.color ?? COLOR.tinta).text(linea, tx, ty, { lineBreak: false });
  doc.y = cursor;
}

// ---------- Celdas ----------

export interface EstiloCelda extends Partial<EstiloTexto> {
  fondo?: string;
  /** Sin borde (p. ej. la banda de título). */
  sinBorde?: boolean;
}

export function celda(doc: Doc, x: number, y: number, ancho: number, alto: number, texto: string, e: EstiloCelda = {}): void {
  if (e.fondo && e.fondo.toUpperCase() !== COLOR.blanco) doc.rect(x, y, ancho, alto).fill(e.fondo);
  if (!e.sinBorde) doc.lineWidth(0.5).strokeColor(COLOR.linea).rect(x, y, ancho, alto).stroke();
  textoEnCaja(doc, texto, x, y, ancho, alto, { tamano: 7.5, ...e });
}

/** Banda oscura con el título de una sección (todo el ancho útil, o el de la tabla que encabeza). */
export function banda(doc: Doc, titulo: string, alto = 18, ancho = anchoUtil(doc)): void {
  doc.rect(MARGEN, doc.y, ancho, alto).fill(COLOR.banda);
  textoEnCaja(doc, titulo.toUpperCase(), MARGEN, doc.y, ancho, alto, {
    tamano: 8.5, negrita: true, color: COLOR.blanco, alinear: 'left', relleno: 7,
  });
  doc.y += alto;
}

// ---------- Encabezado y cifras ----------

export function encabezado(doc: Doc, titulo: string, subtitulo: string): void {
  doc.y = MARGEN;
  textoEnCaja(doc, titulo, MARGEN, doc.y, anchoUtil(doc), 20, { tamano: 15, negrita: true, minimo: 10 });
  textoEnCaja(doc, subtitulo, MARGEN, doc.y + 20, anchoUtil(doc), 13, { tamano: 9, color: COLOR.gris, minimo: 7 });
  doc.y += 20 + 13 + 10;
}

/** Fila de cifras destacadas (p. ej. totales y promedios). */
export function cifras(doc: Doc, items: { etiqueta: string; valor: string }[]): void {
  const separacion = 8;
  const ancho = (anchoUtil(doc) - separacion * (items.length - 1)) / items.length;
  const alto = 46;
  const y = doc.y;
  items.forEach((it, i) => {
    const x = MARGEN + i * (ancho + separacion);
    doc.roundedRect(x, y, ancho, alto, 6).fill(COLOR.suave);
    textoEnCaja(doc, it.valor, x, y + 6, ancho, 22, { tamano: 16, negrita: true });
    textoEnCaja(doc, it.etiqueta, x, y + 27, ancho, 12, { tamano: 7.5, color: COLOR.gris });
  });
  doc.y = y + alto + 14;
}

// ---------- Tabla genérica ----------

export interface ColumnaPdf<T> {
  titulo: string;
  /** Ancho relativo (se reparte el ancho útil de la página). */
  peso: number;
  valor: (fila: T, indice: number) => string;
  alinear?: Alineacion;
  negrita?: boolean;
  /** Color propio del encabezado (p. ej. el color de una marca). */
  cabecera?: { fondo: string; texto: string };
  /** Resalta la celda en rojo (solo para faltas de personal). */
  alerta?: (fila: T) => boolean;
  /** Números: el 0 se ve tenue para que destaque lo que sí hay. */
  numerica?: boolean;
}

export interface OpcionesTabla {
  titulo?: string;
  totales?: string[];
  /** Texto si no hay filas. */
  vacio?: string;
  alto?: number;
}

/** Tabla con banda de título, encabezado repetido en cada página, filas en cebra y fila de totales. */
export function tabla<T>(doc: Doc, columnas: ColumnaPdf<T>[], filas: T[], opciones: OpcionesTabla = {}): void {
  const alto = opciones.alto ?? 16;
  const altoBanda = alto + 2;
  const pesoTotal = columnas.reduce((s, c) => s + c.peso, 0);
  const anchos = columnas.map((c) => (c.peso / pesoTotal) * anchoUtil(doc));

  /** Dibuja una fila en la altura actual y baja el cursor exactamente una fila. */
  const dibujarFila = (valores: string[], estilo: (i: number) => EstiloCelda) => {
    const y = doc.y;
    let x = MARGEN;
    valores.forEach((v, i) => {
      celda(doc, x, y, anchos[i]!, alto, v, estilo(i));
      x += anchos[i]!;
    });
    doc.y = y + alto;
  };

  // Una marca de fondo blanco (la D) usa el color normal del encabezado para que no quede «vacía».
  const fondoCabecera = (c: ColumnaPdf<T>) =>
    c.cabecera && c.cabecera.fondo.toUpperCase() !== COLOR.blanco ? c.cabecera : { fondo: COLOR.cabecera, texto: COLOR.tinta };
  const dibujarCabecera = () =>
    dibujarFila(columnas.map((c) => c.titulo), (i) => ({
      fondo: fondoCabecera(columnas[i]!).fondo,
      color: fondoCabecera(columnas[i]!).texto,
      negrita: true,
      tamano: 7.5,
    }));

  const dibujarTitulo = (continua: boolean) => {
    if (opciones.titulo) banda(doc, continua ? `${opciones.titulo} (continúa)` : opciones.titulo, altoBanda);
  };

  // Título + encabezado + al menos tres filas juntos: nunca un título solo al final de la hoja.
  saltoSiNoCabe(doc, altoBanda + alto * 4);
  dibujarTitulo(false);
  dibujarCabecera();

  if (filas.length === 0) {
    const y = doc.y;
    celda(doc, MARGEN, y, anchoUtil(doc), alto + 6, opciones.vacio ?? 'Sin datos.', { color: COLOR.gris, tamano: 8 });
    doc.y = y + alto + 6 + 16;
    return;
  }

  filas.forEach((fila, n) => {
    if (saltoSiNoCabe(doc, alto)) {
      dibujarTitulo(true);
      dibujarCabecera();
    }
    dibujarFila(columnas.map((c) => c.valor(fila, n)), (i) => {
      const c = columnas[i]!;
      const valor = c.valor(fila, n);
      if (c.alerta?.(fila)) return { fondo: COLOR.rojo, color: COLOR.blanco, negrita: true, alinear: c.alinear };
      return {
        fondo: n % 2 === 1 ? COLOR.cebra : undefined,
        negrita: c.negrita,
        alinear: c.alinear,
        color: c.numerica && valor === '0' ? COLOR.tenue : COLOR.tinta,
      };
    });
  });

  if (opciones.totales) {
    if (saltoSiNoCabe(doc, alto)) {
      dibujarTitulo(true);
      dibujarCabecera();
    }
    dibujarFila(opciones.totales, (i) => ({ fondo: COLOR.suave, negrita: true, alinear: columnas[i]?.alinear }));
  }
  doc.y += 16;
}

// ---------- Pie de página ----------

/** «Generado el…» a la izquierda y «Página N de M» a la derecha, dentro del margen (sin crear hojas). */
function piesDePagina(doc: Doc, texto: string): void {
  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    const y = doc.page.height - MARGEN - 12;
    const estilo = { tamano: 7, color: '#6E6E73' };
    textoEnCaja(doc, texto, MARGEN, y, anchoUtil(doc) / 2, 12, { ...estilo, alinear: 'left', relleno: 0 });
    textoEnCaja(doc, `Página ${i + 1} de ${rango.count}`, MARGEN + anchoUtil(doc) / 2, y, anchoUtil(doc) / 2, 12, {
      ...estilo, alinear: 'right', relleno: 0,
    });
  }
}
