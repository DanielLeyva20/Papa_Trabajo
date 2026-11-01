import ExcelJS, { type Borders, type Cell, type Worksheet } from 'exceljs';
import { CARGO_ETIQUETA, type Cargo } from '../../shared/domain.js';
import type { CodigoTurno } from '../codigos/codigos.service.js';
import type { Distribucion } from '../rol/rol.types.js';
import type { ReporteDatos } from './reporte.types.js';

const ROJO = 'FFD70015';
const TINTA = 'FF141414';
const CABECERA = 'FFDCE6F2';
const BANDA = 'FF2B2B2B';
const GRIS = 'FFF1F1F1';

const LINEA: Partial<Borders> = {
  top: { style: 'thin', color: { argb: 'FF8C8C8C' } },
  left: { style: 'thin', color: { argb: 'FF8C8C8C' } },
  bottom: { style: 'thin', color: { argb: 'FF8C8C8C' } },
  right: { style: 'thin', color: { argb: 'FF8C8C8C' } },
};

const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;

function pintar(cell: Cell, fondo: string, texto = TINTA, negrita = false) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } };
  cell.font = { name: 'Calibri', size: 10, bold: negrita, color: { argb: texto } };
}

function centrar(cell: Cell) {
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

export async function construirExcel(datos: ReporteDatos): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = datos.config.supervisor;
  libro.created = new Date();
  libro.calcProperties.fullCalcOnLoad = true; // Excel recalcula los totales al abrir

  hojaRol(libro.addWorksheet('ROL', { views: [{ state: 'frozen', xSplit: 3, ySplit: 0 }] }), datos);
  hojaDistribucion(libro.addWorksheet('DISTRIBUCIÓN'), datos);
  hojaResumen(libro.addWorksheet('RESUMEN'), datos);

  return Buffer.from(await libro.xlsx.writeBuffer());
}

function hojaRol(hoja: Worksheet, datos: ReporteDatos) {
  const { rol, codigos, config } = datos;
  const totalDias = rol.dias.length;
  const primeraDia = 4; // columna D
  const ultimaDia = primeraDia + totalDias - 1;
  const colDias = ultimaDia + 1;
  const ultimaColumna = colDias + 2;
  const letra = (col: number) => hoja.getColumn(col).letter;
  const porCodigo = new Map(codigos.map((c) => [c.codigo, c]));

  hoja.getColumn(1).width = 5;
  hoja.getColumn(2).width = 30;
  hoja.getColumn(3).width = 13;
  for (let c = primeraDia; c <= ultimaDia; c++) hoja.getColumn(c).width = 4.6;
  hoja.getColumn(colDias).width = 7;
  hoja.getColumn(colDias + 1).width = 7;
  hoja.getColumn(colDias + 2).width = 8;

  hoja.pageSetup = {
    orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
  };

  // Encabezado del documento
  hoja.mergeCells(1, 1, 1, ultimaColumna);
  const titulo = hoja.getCell(1, 1);
  titulo.value = `ROL DE SERVICIO – ${rol.nombreMes.toUpperCase()}`;
  titulo.font = { name: 'Calibri', size: 16, bold: true };
  centrar(titulo);

  hoja.mergeCells(2, 1, 2, ultimaColumna);
  const sub = hoja.getCell(2, 1);
  sub.value = `${config.entidad.toUpperCase()}  ·  SUP. ${config.supervisor.toUpperCase()}  ·  ${datos.corte}`;
  sub.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF444444' } };
  centrar(sub);
  hoja.getRow(1).height = 26;

  let fila = 4;
  for (const sede of rol.sedes) {
    // Banda con el nombre de la sede
    hoja.mergeCells(fila, 1, fila, ultimaColumna);
    const banda = hoja.getCell(fila, 1);
    banda.value = sede.nombre.toUpperCase();
    pintar(banda, BANDA, 'FFFFFFFF', true);
    banda.alignment = { vertical: 'middle', indent: 1 };
    hoja.getRow(fila).height = 20;
    fila++;

    // Cabecera: número del día y letra de la semana
    const filaNumeros = hoja.getRow(fila);
    const filaLetras = hoja.getRow(fila + 1);
    ['N.º', 'APELLIDOS Y NOMBRES', 'CARGO'].forEach((texto, i) => {
      hoja.mergeCells(fila, i + 1, fila + 1, i + 1);
      const c = filaNumeros.getCell(i + 1);
      c.value = texto;
      pintar(c, CABECERA, TINTA, true);
      centrar(c);
      c.border = LINEA;
    });
    rol.dias.forEach((dia, i) => {
      const rojo = dia.feriado !== null; // solo feriados; el domingo es un día normal
      const num = filaNumeros.getCell(primeraDia + i);
      const let_ = filaLetras.getCell(primeraDia + i);
      num.value = dia.dia;
      let_.value = dia.letra;
      for (const c of [num, let_]) {
        pintar(c, rojo ? ROJO : CABECERA, rojo ? 'FFFFFFFF' : TINTA, true);
        centrar(c);
        c.border = LINEA;
      }
      if (dia.feriado) num.note = dia.feriado;
    });
    ['DÍAS', 'LIBRES', 'AUSENC.'].forEach((texto, i) => {
      hoja.mergeCells(fila, colDias + i, fila + 1, colDias + i);
      const c = filaNumeros.getCell(colDias + i);
      c.value = texto;
      pintar(c, CABECERA, TINTA, true);
      centrar(c);
      c.border = LINEA;
    });
    fila += 2;

    const inicioAgentes = fila;
    sede.filas.forEach((agente, n) => {
      const r = hoja.getRow(fila);
      r.height = 17;
      r.getCell(1).value = n + 1;
      r.getCell(2).value = agente.nombres;
      r.getCell(3).value = CARGO_ETIQUETA[agente.cargo].toUpperCase();
      [1, 2, 3].forEach((c) => {
        const cell = r.getCell(c);
        cell.border = LINEA;
        cell.font = { name: 'Calibri', size: 10, bold: c === 2 };
        cell.alignment = { vertical: 'middle', horizontal: c === 2 ? 'left' : 'center' };
      });

      agente.marcas.forEach((codigo, i) => {
        const cell = r.getCell(primeraDia + i);
        cell.border = LINEA;
        centrar(cell);
        if (!codigo) return;
        cell.value = codigo;
        const estilo = porCodigo.get(codigo);
        if (estilo) pintar(cell, argb(estilo.colorFondo), argb(estilo.colorTexto), true);
      });

      const rango = `${letra(primeraDia)}${fila}:${letra(ultimaDia)}${fila}`;
      const formulas = [
        sumaPorCategoria(codigos, rango, ['DIA', 'NOCHE']),
        sumaPorCategoria(codigos, rango, ['LIBRE']),
        sumaPorCategoria(codigos, rango, ['AUSENCIA']),
      ];
      const conteos = contarPorCategoria(agente.marcas, codigos);
      formulas.forEach((formula, i) => {
        const cell = r.getCell(colDias + i);
        cell.value = { formula, result: conteos[i] };
        cell.border = LINEA;
        cell.font = { name: 'Calibri', size: 10, bold: true };
        centrar(cell);
      });
      fila++;
    });
    const finAgentes = fila - 1;

    // Totales por día con fórmulas: siguen funcionando si se edita el Excel a mano.
    const totales: [string, string[], number[]][] = [
      ['TOTAL DÍA', codigosDe(codigos, 'DIA'), sede.totales.dia],
      ['TOTAL NOCHE', codigosDe(codigos, 'NOCHE'), sede.totales.noche],
    ];
    for (const [etiqueta, codigosCategoria, valores] of totales) {
      const r = hoja.getRow(fila);
      hoja.mergeCells(fila, 1, fila, 3);
      const rotulo = r.getCell(1);
      rotulo.value = etiqueta;
      pintar(rotulo, GRIS, TINTA, true);
      rotulo.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
      rotulo.border = LINEA;
      rol.dias.forEach((_, i) => {
        const col = letra(primeraDia + i);
        const cell = r.getCell(primeraDia + i);
        const formula = sede.filas.length
          ? codigosCategoria.map((c) => `COUNTIF(${col}${inicioAgentes}:${col}${finAgentes},"${c}")`).join('+')
          : '0';
        cell.value = { formula, result: valores[i] ?? 0 };
        const falta = etiqueta === 'TOTAL DÍA' && sede.totales.completos[i] && (valores[i] ?? 0) < sede.minimoDia;
        pintar(cell, GRIS, falta ? ROJO : TINTA, true);
        cell.border = LINEA;
        centrar(cell);
      });
      fila++;
    }
    fila += 2; // espacio entre sedes
  }

  // Leyenda de marcas
  const leyenda = hoja.getRow(fila);
  leyenda.getCell(2).value = 'LEYENDA';
  leyenda.getCell(2).font = { name: 'Calibri', size: 10, bold: true };
  codigos.forEach((c, i) => {
    const r = hoja.getRow(fila + 1 + i);
    const marca = r.getCell(1);
    marca.value = c.codigo;
    pintar(marca, argb(c.colorFondo), argb(c.colorTexto), true);
    marca.border = LINEA;
    centrar(marca);
    r.getCell(2).value = c.nombre;
  });
  hoja.getRow(fila + codigos.length + 2).getCell(2).value = `Generado el ${datos.generadoEn}`;
}

function codigosDe(codigos: CodigoTurno[], ...categorias: CodigoTurno['categoria'][]): string[] {
  return codigos.filter((c) => categorias.includes(c.categoria)).map((c) => c.codigo);
}

function sumaPorCategoria(codigos: CodigoTurno[], rango: string, categorias: CodigoTurno['categoria'][]): string {
  const partes = codigosDe(codigos, ...categorias).map((c) => `COUNTIF(${rango},"${c}")`);
  return partes.length ? partes.join('+') : '0';
}

function contarPorCategoria(marcas: (string | null)[], codigos: CodigoTurno[]): number[] {
  const categoria = new Map(codigos.map((c) => [c.codigo, c.categoria]));
  const cuenta = (cats: string[]) => marcas.filter((m) => m && cats.includes(categoria.get(m) ?? '')).length;
  return [cuenta(['DIA', 'NOCHE']), cuenta(['LIBRE']), cuenta(['AUSENCIA'])];
}

const CARGOS_CUADRO: Cargo[] = ['ARMADO', 'SIMPLE', 'FEMINA', 'SUPERVISOR'];

function hojaDistribucion(hoja: Worksheet, datos: ReporteDatos) {
  hoja.columns = [
    { width: 6 }, { width: 52 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 12 }, { width: 10 },
  ];
  hoja.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  let fila = 1;
  const bloques: [string, Distribucion][] = [
    ['TURNO DIURNO', datos.distribucionDia],
    ['TURNO NOCTURNO', datos.distribucionNoche],
  ];
  for (const [nombre, distribucion] of bloques) {
    if (distribucion.totales.total === 0) continue;
    hoja.mergeCells(fila, 1, fila, 7);
    const t = hoja.getCell(fila, 1);
    t.value = `DISTRIBUCIÓN DE AGENTES – ${nombre}`;
    t.font = { name: 'Calibri', size: 14, bold: true };
    centrar(t);
    hoja.mergeCells(fila + 1, 1, fila + 1, 7);
    const s = hoja.getCell(fila + 1, 1);
    s.value = `SUP. ${datos.config.supervisor.toUpperCase()}  ·  ${datos.rol.nombreMes.toUpperCase()}`;
    s.font = { name: 'Calibri', size: 11, bold: true };
    centrar(s);
    fila += 3;

    const encabezado = hoja.getRow(fila);
    ['N.º', 'Sede / Dependencia', 'Armado', 'Simple', 'Fémina', 'Supervisor', 'Total'].forEach((texto, i) => {
      const c = encabezado.getCell(i + 1);
      c.value = texto;
      pintar(c, CABECERA, TINTA, true);
      c.border = LINEA;
      centrar(c);
    });
    fila++;

    distribucion.sedes.forEach((sede, n) => {
      const r = hoja.getRow(fila);
      r.height = 20;
      const valores = [n + 1, sede.nombre, ...CARGOS_CUADRO.map((c) => sede.porCargo[c]), sede.total];
      valores.forEach((v, i) => {
        const c = r.getCell(i + 1);
        c.value = v;
        c.border = LINEA;
        c.font = { name: 'Calibri', size: 11, bold: i === 1 || i === 6 };
        c.alignment = { vertical: 'middle', horizontal: i === 1 ? 'left' : 'center' };
      });
      fila++;
    });

    const total = hoja.getRow(fila);
    const valores = ['', 'TOTAL', ...CARGOS_CUADRO.map((c) => distribucion.totales[c]), distribucion.totales.total];
    valores.forEach((v, i) => {
      const c = total.getCell(i + 1);
      c.value = v;
      pintar(c, GRIS, TINTA, true);
      c.border = LINEA;
      c.alignment = { vertical: 'middle', horizontal: i === 1 ? 'left' : 'center' };
    });
    fila += 3;
  }
}

function hojaResumen(hoja: Worksheet, datos: ReporteDatos) {
  const codigos = datos.codigos;
  hoja.columns = [
    { width: 6 }, { width: 32 }, { width: 18 }, { width: 34 },
    ...codigos.map(() => ({ width: 7 })), { width: 12 },
  ];
  hoja.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  hoja.mergeCells(1, 1, 1, 5 + codigos.length);
  const t = hoja.getCell(1, 1);
  t.value = `RESUMEN POR AGENTE – ${datos.rol.nombreMes.toUpperCase()}  (${datos.corte})`;
  t.font = { name: 'Calibri', size: 14, bold: true };
  centrar(t);

  const encabezado = hoja.getRow(3);
  ['N.º', 'Apellidos y nombres', 'Cargo', 'Sedes', ...codigos.map((c) => c.codigo), 'Días trabajados']
    .forEach((texto, i) => {
      const c = encabezado.getCell(i + 1);
      c.value = texto;
      const codigo = codigos[i - 4];
      if (codigo) pintar(c, argb(codigo.colorFondo), argb(codigo.colorTexto), true);
      else pintar(c, CABECERA, TINTA, true);
      c.border = LINEA;
      centrar(c);
    });

  datos.resumen.forEach((agente, n) => {
    const r = hoja.getRow(4 + n);
    const valores = [
      n + 1, agente.nombres, CARGO_ETIQUETA[agente.cargo], agente.sedes.join(', '),
      ...codigos.map((c) => agente.conteos[c.codigo] ?? 0), agente.diasTrabajados,
    ];
    valores.forEach((v, i) => {
      const c = r.getCell(i + 1);
      c.value = v;
      c.border = LINEA;
      c.font = { name: 'Calibri', size: 10, bold: i === 1 || i === valores.length - 1 };
      c.alignment = { vertical: 'middle', horizontal: i === 1 || i === 3 ? 'left' : 'center', wrapText: i === 3 };
    });
  });
}
