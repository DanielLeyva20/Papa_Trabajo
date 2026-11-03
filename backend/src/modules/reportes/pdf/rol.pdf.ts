import { CARGO_ETIQUETA, type CargoBase } from '../../../shared/domain.js';
import type { Distribucion, SedeRol } from '../../rol/rol.types.js';
import { faltaPersonal, filasDeTotales } from '../datos/vistas.js';
import type { ReporteDatos } from '../reportes.types.js';
import {
  COLOR,
  MARGEN,
  anchoUtil,
  banda,
  celda,
  crearDocumento,
  encabezado,
  limiteInferior,
  saltoSiNoCabe,
  textoEnCaja,
  type Doc,
} from './comun.js';

/** El documento oficial: un cuadro por sede (días × agentes), totales y la página de distribución con firma. */

const ALTO_FILA = 14;
const TAMANO = 7;
const COLUMNAS = { n: 16, nombre: 128, cargo: 82 } as const;
/** Un día nunca es más ancho que esto: con pocos días («avance hasta hoy») la tabla queda compacta. */
const ANCHO_DIA_MAX = 24;
const ANCHO_FIJO = COLUMNAS.n + COLUMNAS.nombre + COLUMNAS.cargo;
const CARGOS_CUADRO: CargoBase[] = ['ARMADO', 'SIMPLE', 'FEMINA', 'SUPERVISOR'];

export function construirPdf(datos: ReporteDatos): Promise<Buffer> {
  const { doc, terminar } = crearDocumento(`ROL DF – ${datos.rol.nombreMes}`, datos.config.supervisor);

  encabezado(
    doc,
    `ROL DE SERVICIO – ${datos.rol.nombreMes.toUpperCase()}`,
    `${datos.config.entidad.toUpperCase()}  ·  SUP. ${datos.config.supervisor.toUpperCase()}  ·  ${datos.corte}`,
  );
  leyenda(doc, datos);
  for (const sede of datos.rol.sedes) tablaSede(doc, datos, sede);
  paginaDistribucion(doc, datos);

  return terminar(`Generado el ${datos.generadoEn}`);
}

/** Leyenda de marcas centrada bajo el título. */
function leyenda(doc: Doc, datos: ReporteDatos): void {
  const muestra = 16;
  const separacion = 14;
  doc.font('Helvetica').fontSize(7.5);
  const anchos = datos.codigos.map((c) => muestra + 4 + doc.widthOfString(c.nombre));
  const total = anchos.reduce((a, b) => a + b, 0) + separacion * (anchos.length - 1);
  let x = MARGEN + Math.max(0, (anchoUtil(doc) - total) / 2);
  const y = doc.y - 4;
  datos.codigos.forEach((c, i) => {
    celda(doc, x, y, muestra, 11, c.codigo, { fondo: c.colorFondo, color: c.colorTexto, negrita: true, tamano: 6.5 });
    textoEnCaja(doc, c.nombre, x + muestra + 4, y, anchos[i]! - muestra - 4, 11, { tamano: 7.5, alinear: 'left', relleno: 0 });
    x += anchos[i]! + separacion;
  });
  doc.y = y + 11 + 12;
}

function tablaSede(doc: Doc, datos: ReporteDatos, sede: SedeRol): void {
  const dias = datos.rol.dias;
  const porCodigo = new Map(datos.codigos.map((c) => [c.codigo, c]));
  const anchoDia = Math.min(ANCHO_DIA_MAX, (anchoUtil(doc) - ANCHO_FIJO) / Math.max(dias.length, 1));
  const anchoTabla = ANCHO_FIJO + anchoDia * dias.length;
  const xDias = MARGEN + ANCHO_FIJO;
  const altoCabecera = ALTO_FILA * 2;

  const cabecera = (continua: boolean) => {
    banda(doc, continua ? `${sede.nombre} (continúa)` : sede.nombre, ALTO_FILA + 3, anchoTabla);
    const y = doc.y;
    const titulo = { fondo: COLOR.cabecera, negrita: true, tamano: TAMANO };
    celda(doc, MARGEN, y, COLUMNAS.n, altoCabecera, 'N.º', titulo);
    celda(doc, MARGEN + COLUMNAS.n, y, COLUMNAS.nombre, altoCabecera, 'APELLIDOS Y NOMBRES', titulo);
    celda(doc, MARGEN + COLUMNAS.n + COLUMNAS.nombre, y, COLUMNAS.cargo, altoCabecera, 'CARGO', titulo);
    dias.forEach((dia, i) => {
      // Solo los feriados van en rojo; el domingo es un día normal.
      const estilo = dia.feriado
        ? { fondo: COLOR.rojo, color: COLOR.blanco, negrita: true, tamano: TAMANO }
        : titulo;
      celda(doc, xDias + i * anchoDia, y, anchoDia, ALTO_FILA, String(dia.dia), estilo);
      celda(doc, xDias + i * anchoDia, y + ALTO_FILA, anchoDia, ALTO_FILA, dia.letra, estilo);
    });
    doc.y = y + altoCabecera;
  };

  // La sede empieza en una hoja nueva si no caben su cabecera, unas filas y los totales.
  saltoSiNoCabe(doc, ALTO_FILA + 3 + altoCabecera + ALTO_FILA * Math.min(sede.filas.length + 2, 6));
  cabecera(false);

  sede.filas.forEach((fila, n) => {
    if (saltoSiNoCabe(doc, ALTO_FILA)) cabecera(true);
    const y = doc.y;
    const cebra = n % 2 === 1 ? COLOR.cebra : undefined;
    celda(doc, MARGEN, y, COLUMNAS.n, ALTO_FILA, String(n + 1), { fondo: cebra, tamano: TAMANO, color: COLOR.gris });
    celda(doc, MARGEN + COLUMNAS.n, y, COLUMNAS.nombre, ALTO_FILA, fila.nombres, {
      fondo: cebra, negrita: true, alinear: 'left', tamano: TAMANO,
    });
    celda(doc, MARGEN + COLUMNAS.n + COLUMNAS.nombre, y, COLUMNAS.cargo, ALTO_FILA, CARGO_ETIQUETA[fila.cargo].toUpperCase(), {
      fondo: cebra, tamano: 6.5, minimo: 5,
    });
    fila.marcas.forEach((codigo, i) => {
      const marca = codigo ? porCodigo.get(codigo) : undefined;
      celda(doc, xDias + i * anchoDia, y, anchoDia, ALTO_FILA, codigo ?? '', {
        fondo: marca?.colorFondo ?? cebra, color: marca?.colorTexto, negrita: true, tamano: TAMANO,
      });
    });
    doc.y = y + ALTO_FILA;
  });

  for (const total of filasDeTotales(sede)) {
    if (saltoSiNoCabe(doc, ALTO_FILA)) cabecera(true);
    const y = doc.y;
    celda(doc, MARGEN, y, ANCHO_FIJO, ALTO_FILA, total.etiqueta, { fondo: COLOR.suave, negrita: true, alinear: 'right', tamano: TAMANO });
    total.valores.forEach((v, i) => {
      celda(doc, xDias + i * anchoDia, y, anchoDia, ALTO_FILA, String(v), {
        fondo: COLOR.suave, color: faltaPersonal(sede, total, i) ? COLOR.rojo : COLOR.tinta, negrita: true, tamano: TAMANO,
      });
    });
    doc.y = y + ALTO_FILA;
  }
  doc.y += 12;
}

function paginaDistribucion(doc: Doc, datos: ReporteDatos): void {
  const bloques = (
    [
      ['TURNO DIURNO', datos.distribucionDia],
      ['TURNO NOCTURNO', datos.distribucionNoche],
    ] as [string, Distribucion][]
  ).filter(([, d]) => d.totales.total > 0);
  doc.addPage();
  doc.y = MARGEN;

  const anchos = [28, 330, 70, 70, 70, 78, 64];
  const anchoTabla = anchos.reduce((a, b) => a + b, 0);
  const x0 = MARGEN + (anchoUtil(doc) - anchoTabla) / 2;

  // Las filas se ajustan para que los cuadros y la firma entren en una sola hoja (entre 13 y 18 pt).
  const ALTO_TITULO = 40;
  const SEPARACION = 20;
  const ALTO_FIRMA = 70;
  const filasTotales = bloques.reduce((n, [, d]) => n + d.sedes.length + 2, 0);
  const libre = limiteInferior(doc) - MARGEN - ALTO_FIRMA - bloques.length * (ALTO_TITULO + SEPARACION);
  // Redondeado hacia abajo: los decimales sobrantes harían saltar la firma a otra hoja por una fracción de punto.
  const alto = Math.max(13, Math.min(18, Math.floor((libre / Math.max(filasTotales, 1)) * 10) / 10));
  const tamano = alto >= 16 ? 9 : 8;

  for (const [nombre, distribucion] of bloques) {
    saltoSiNoCabe(doc, ALTO_TITULO + alto * (distribucion.sedes.length + 2));
    textoEnCaja(doc, `DISTRIBUCIÓN DE AGENTES – ${nombre}`, MARGEN, doc.y, anchoUtil(doc), 18, { tamano: 13, negrita: true });
    textoEnCaja(doc, `SUP. ${datos.config.supervisor.toUpperCase()}`, MARGEN, doc.y + 18, anchoUtil(doc), 14, {
      tamano: 9.5, color: COLOR.gris,
    });
    doc.y += ALTO_TITULO; // título (18) + supervisor (14) + aire (8)

    const fila = (valores: string[], estilo: (i: number) => Parameters<typeof celda>[6]) => {
      const y = doc.y;
      let x = x0;
      valores.forEach((v, i) => {
        celda(doc, x, y, anchos[i]!, alto, v, { tamano, alinear: i === 1 ? 'left' : 'center', ...estilo(i) });
        x += anchos[i]!;
      });
      doc.y = y + alto;
    };

    fila(['N.º', 'Sede / Dependencia', 'Armado', 'Simple', 'Fémina', 'Supervisor', 'Total'], () => ({
      fondo: COLOR.cabecera, negrita: true,
    }));
    distribucion.sedes.forEach((s, n) =>
      fila([String(n + 1), s.nombre, ...CARGOS_CUADRO.map((c) => String(s.porCargo[c])), String(s.total)], (i) => ({
        fondo: n % 2 === 1 ? COLOR.cebra : undefined,
        negrita: i === 6,
        color: i >= 2 && s.porCargo[CARGOS_CUADRO[i - 2]!] === 0 ? COLOR.tenue : COLOR.tinta,
      })),
    );
    fila(['', 'TOTAL', ...CARGOS_CUADRO.map((c) => String(distribucion.totales[c])), String(distribucion.totales.total)], () => ({
      fondo: COLOR.suave, negrita: true,
    }));
    doc.y += SEPARACION;
  }

  // Línea de firma: abajo de la hoja; si los cuadros no le dejan lugar, en una hoja propia (nunca encima de una tabla).
  saltoSiNoCabe(doc, ALTO_FIRMA);
  const yFirma = Math.max(doc.y + 40, Math.min(doc.page.height - 130, limiteInferior(doc) - 30));
  const centro = doc.page.width / 2;
  doc.lineWidth(0.8).strokeColor(COLOR.tinta).moveTo(centro - 120, yFirma).lineTo(centro + 120, yFirma).stroke();
  textoEnCaja(doc, `SUP. ${datos.config.supervisor.toUpperCase()}`, centro - 120, yFirma + 3, 240, 14, { tamano: 9, negrita: true });
  textoEnCaja(doc, datos.config.entidad.toUpperCase(), centro - 120, yFirma + 16, 240, 12, { tamano: 7.5, color: COLOR.gris });
}
