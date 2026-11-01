import PDFDocument from 'pdfkit';
import { CARGO_ETIQUETA, type CargoBase } from '../../../shared/domain.js';
import type { Distribucion, SedeRol } from '../../rol/rol.types.js';
import type { ReporteDatos } from '../reportes.types.js';

type Doc = PDFKit.PDFDocument;

const MARGEN = 24;
const ALTO_FILA = 13;
const TINTA = '#141414';
const ROJO = '#D70015';
const LINEA = '#8C8C8C';
const CABECERA = '#DCE6F2';
const GRIS = '#F1F1F1';

const ANCHO_N = 16;
const ANCHO_NOMBRE = 132;
const ANCHO_CARGO = 50;

export function construirPdf(datos: ReporteDatos): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4', layout: 'landscape', margin: MARGEN, bufferPages: true,
    info: { Title: `ROL DF – ${datos.rol.nombreMes}`, Author: datos.config.supervisor },
  });
  const partes: Buffer[] = [];
  doc.on('data', (p: Buffer) => partes.push(p));
  const terminado = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(partes))));

  encabezado(doc, datos);
  for (const sede of datos.rol.sedes) tablaSede(doc, datos, sede);
  paginaDistribucion(doc, datos);
  piesDePagina(doc, datos);

  doc.end();
  return terminado;
}

const anchoUtil = (doc: Doc) => doc.page.width - MARGEN * 2;
const limiteInferior = (doc: Doc) => doc.page.height - MARGEN - 18;

function encabezado(doc: Doc, datos: ReporteDatos) {
  doc.font('Helvetica-Bold').fontSize(15).fillColor(TINTA)
    .text(`ROL DE SERVICIO – ${datos.rol.nombreMes.toUpperCase()}`, MARGEN, MARGEN, { width: anchoUtil(doc), align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor('#444444')
    .text(
      `${datos.config.entidad.toUpperCase()}  ·  SUP. ${datos.config.supervisor.toUpperCase()}  ·  ${datos.corte}`,
      { width: anchoUtil(doc), align: 'center' },
    );
  leyenda(doc, datos, doc.y + 6);
  doc.y += 10;
}

function leyenda(doc: Doc, datos: ReporteDatos, y: number) {
  let x = MARGEN;
  doc.fontSize(7.5);
  for (const c of datos.codigos) {
    celda(doc, x, y, 16, 11, c.codigo, { fondo: c.colorFondo, texto: c.colorTexto, negrita: true });
    doc.font('Helvetica').fillColor(TINTA).text(c.nombre, x + 19, y + 2, { lineBreak: false });
    x += 22 + doc.widthOfString(c.nombre) + 12;
  }
  doc.y = y + 12;
}

interface EstiloCelda {
  fondo?: string;
  texto?: string;
  negrita?: boolean;
  alinear?: 'left' | 'center' | 'right';
}

function celda(doc: Doc, x: number, y: number, w: number, h: number, texto: string, estilo: EstiloCelda = {}) {
  if (estilo.fondo && estilo.fondo.toUpperCase() !== '#FFFFFF') doc.rect(x, y, w, h).fill(estilo.fondo);
  doc.lineWidth(0.5).strokeColor(LINEA).rect(x, y, w, h).stroke();
  if (!texto) return;
  const alinear = estilo.alinear ?? 'center';
  const padding = alinear === 'center' ? 0 : 3;
  doc.font(estilo.negrita ? 'Helvetica-Bold' : 'Helvetica').fillColor(estilo.texto ?? TINTA)
    .text(texto, x + padding, y + (h - doc.currentLineHeight()) / 2 + 0.5, {
      width: w - padding * 2, align: alinear, lineBreak: false, ellipsis: true,
    });
}

function tablaSede(doc: Doc, datos: ReporteDatos, sede: SedeRol) {
  const dias = datos.rol.dias;
  const porCodigo = new Map(datos.codigos.map((c) => [c.codigo, c]));
  const anchoDia = (anchoUtil(doc) - ANCHO_N - ANCHO_NOMBRE - ANCHO_CARGO) / Math.max(dias.length, 1);
  const altoBloque = ALTO_FILA * (sede.filas.length + 5) + 10;

  if (doc.y + altoBloque > limiteInferior(doc)) {
    doc.addPage();
    doc.y = MARGEN;
  }

  let y = doc.y;
  const x0 = MARGEN;
  const xDias = x0 + ANCHO_N + ANCHO_NOMBRE + ANCHO_CARGO;

  // Banda de la sede
  doc.rect(x0, y, anchoUtil(doc), ALTO_FILA + 2).fill('#2B2B2B');
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF')
    .text(sede.nombre.toUpperCase(), x0 + 5, y + 3.5, { lineBreak: false });
  y += ALTO_FILA + 2;

  // Cabecera de días
  doc.fontSize(7);
  celda(doc, x0, y, ANCHO_N, ALTO_FILA * 2, 'N.º', { fondo: CABECERA, negrita: true });
  celda(doc, x0 + ANCHO_N, y, ANCHO_NOMBRE, ALTO_FILA * 2, 'APELLIDOS Y NOMBRES', { fondo: CABECERA, negrita: true });
  celda(doc, x0 + ANCHO_N + ANCHO_NOMBRE, y, ANCHO_CARGO, ALTO_FILA * 2, 'CARGO', { fondo: CABECERA, negrita: true });
  dias.forEach((dia, i) => {
    const rojo = dia.feriado !== null; // solo feriados; el domingo es un día normal
    const estilo = { fondo: rojo ? ROJO : CABECERA, texto: rojo ? '#FFFFFF' : TINTA, negrita: true };
    celda(doc, xDias + i * anchoDia, y, anchoDia, ALTO_FILA, String(dia.dia), estilo);
    celda(doc, xDias + i * anchoDia, y + ALTO_FILA, anchoDia, ALTO_FILA, dia.letra, estilo);
  });
  y += ALTO_FILA * 2;

  // Agentes
  sede.filas.forEach((fila, n) => {
    doc.fontSize(7);
    celda(doc, x0, y, ANCHO_N, ALTO_FILA, String(n + 1));
    celda(doc, x0 + ANCHO_N, y, ANCHO_NOMBRE, ALTO_FILA, fila.nombres, { negrita: true, alinear: 'left' });
    celda(doc, x0 + ANCHO_N + ANCHO_NOMBRE, y, ANCHO_CARGO, ALTO_FILA, CARGO_ETIQUETA[fila.cargo].toUpperCase());
    fila.marcas.forEach((codigo, i) => {
      const estilo = codigo ? porCodigo.get(codigo) : undefined;
      celda(doc, xDias + i * anchoDia, y, anchoDia, ALTO_FILA, codigo ?? '', {
        fondo: estilo?.colorFondo, texto: estilo?.colorTexto, negrita: true,
      });
    });
    y += ALTO_FILA;
  });

  // Totales
  const totales: [string, number[]][] = [['TOTAL DÍA', sede.totales.dia], ['TOTAL NOCHE', sede.totales.noche]];
  for (const [etiqueta, valores] of totales) {
    doc.fontSize(7);
    celda(doc, x0, y, ANCHO_N + ANCHO_NOMBRE + ANCHO_CARGO, ALTO_FILA, etiqueta, {
      fondo: GRIS, negrita: true, alinear: 'right',
    });
    valores.forEach((v, i) => {
      const alerta = etiqueta === 'TOTAL DÍA' && sede.totales.completos[i] && v < sede.minimoDia;
      celda(doc, xDias + i * anchoDia, y, anchoDia, ALTO_FILA, String(v), {
        fondo: GRIS, texto: alerta ? ROJO : TINTA, negrita: true,
      });
    });
    y += ALTO_FILA;
  }

  doc.y = y + 10;
}

const CARGOS_CUADRO: CargoBase[] = ['ARMADO', 'SIMPLE', 'FEMINA', 'SUPERVISOR'];

function paginaDistribucion(doc: Doc, datos: ReporteDatos) {
  const bloques: [string, Distribucion][] = [
    ['TURNO DIURNO', datos.distribucionDia],
    ['TURNO NOCTURNO', datos.distribucionNoche],
  ];
  doc.addPage();
  doc.y = MARGEN;

  const anchos = [26, 330, 66, 66, 66, 74, 60];
  const anchoTabla = anchos.reduce((a, b) => a + b, 0);
  const x0 = MARGEN + (anchoUtil(doc) - anchoTabla) / 2;
  const alto = 18;

  for (const [nombre, distribucion] of bloques) {
    if (distribucion.totales.total === 0) continue;
    if (doc.y + alto * (distribucion.sedes.length + 4) > limiteInferior(doc)) {
      doc.addPage();
      doc.y = MARGEN;
    }
    doc.font('Helvetica-Bold').fontSize(13).fillColor(TINTA)
      .text(`DISTRIBUCIÓN DE AGENTES – ${nombre}`, MARGEN, doc.y, { width: anchoUtil(doc), align: 'center' });
    doc.fontSize(10).text(`SUP. ${datos.config.supervisor.toUpperCase()}`, { width: anchoUtil(doc), align: 'center' });
    let y = doc.y + 8;

    const filaTabla = (valores: string[], estilo: EstiloCelda) => {
      let x = x0;
      valores.forEach((v, i) => {
        celda(doc, x, y, anchos[i]!, alto, v, { ...estilo, alinear: i === 1 ? 'left' : 'center' });
        x += anchos[i]!;
      });
      y += alto;
    };

    doc.fontSize(9);
    filaTabla(['N.º', 'Sede / Dependencia', 'Armado', 'Simple', 'Fémina', 'Supervisor', 'Total'], {
      fondo: CABECERA, negrita: true,
    });
    distribucion.sedes.forEach((s, n) =>
      filaTabla([String(n + 1), s.nombre, ...CARGOS_CUADRO.map((c) => String(s.porCargo[c])), String(s.total)], {}),
    );
    filaTabla(
      ['', 'TOTAL', ...CARGOS_CUADRO.map((c) => String(distribucion.totales[c])), String(distribucion.totales.total)],
      { fondo: GRIS, negrita: true },
    );
    doc.y = y + 22;
  }

  // Firma
  const yFirma = Math.min(Math.max(doc.y + 30, doc.page.height - 120), limiteInferior(doc) - 30);
  const centro = doc.page.width / 2;
  doc.lineWidth(0.8).strokeColor(TINTA).moveTo(centro - 110, yFirma).lineTo(centro + 110, yFirma).stroke();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(TINTA)
    .text(`SUP. ${datos.config.supervisor.toUpperCase()}`, centro - 110, yFirma + 4, { width: 220, align: 'center' });
}

function piesDePagina(doc: Doc, datos: ReporteDatos) {
  const rango = doc.bufferedPageRange();
  for (let i = 0; i < rango.count; i++) {
    doc.switchToPage(rango.start + i);
    const y = doc.page.height - MARGEN - 8;
    doc.font('Helvetica').fontSize(7).fillColor('#666666');
    doc.text(`Generado el ${datos.generadoEn}`, MARGEN, y, { lineBreak: false });
    doc.text(`Página ${i + 1} de ${rango.count}`, MARGEN, y, { width: anchoUtil(doc), align: 'right', lineBreak: false });
  }
}
