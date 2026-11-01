import ExcelJS, { type Cell, type Worksheet } from 'exceljs';
import { MESES, hoyEnPeru } from '../../shared/calendar.js';
import { componerCargo, type Cargo } from '../../shared/domain.js';
import { normalizar } from '../../shared/texto.js';
import type { BloqueLeido, FilaLeida } from './importacion.types.js';

/**
 * Lector del Excel del rol. Funciona con el formato que usa el supervisor (sede en la columna A,
 * nombres, cargo y una columna por día) y con el que exporta este mismo sistema.
 *
 * Cómo encuentra cada sede: busca filas con los días del mes seguidos (1, 2, 3… o «1-Nov», «2-Nov»…).
 * Cada una de esas filas abre un bloque, que termina en la fila «TOTAL» o en el siguiente encabezado.
 */

const LETRAS_SEMANA = new Set(['L', 'M', 'X', 'J', 'V', 'S', 'D']);
const MESES_CORTOS: Record<string, number> = {
  ENE: 1, JAN: 1, FEB: 2, MAR: 3, ABR: 4, APR: 4, MAY: 5, JUN: 6, JUL: 7,
  AGO: 8, AUG: 8, SET: 9, SEP: 9, OCT: 10, NOV: 11, DIC: 12, DEC: 12,
};
const MESES_LARGOS = MESES.map((m) => normalizar(m)).concat(['SEPTIEMBRE']);

const pad = (n: number) => String(n).padStart(2, '0');

// ---------- Lectura de celdas ----------

/** Valor "visible" de una celda: resuelve celdas combinadas, fórmulas y texto enriquecido. */
function valor(cell: Cell): unknown {
  const c = cell.isMerged ? cell.master : cell;
  const v = c.value;
  if (v && typeof v === 'object') {
    if (v instanceof Date) return v;
    if ('result' in v) return v.result ?? null;
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return v.text;
  }
  return v;
}

function texto(cell: Cell): string {
  const v = valor(cell);
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return '';
  return String(v).trim();
}

interface DiaEncabezado {
  dia: number;
  mes: string | null;
}

/** ¿La celda es un día del encabezado? Acepta fechas, números y textos como «1-Nov». */
function diaDeCelda(cell: Cell): DiaEncabezado | null {
  const v = valor(cell);
  if (v instanceof Date) {
    return { dia: v.getUTCDate(), mes: `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}` };
  }
  if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 31) return { dia: v, mes: null };
  if (typeof v === 'string') {
    const m = /^(\d{1,2})(?:\s*[-/ ]\s*([A-Za-zÁÉÍÓÚáéíóú]{3,}))?\.?$/.exec(v.trim());
    if (!m) return null;
    const dia = Number(m[1]);
    if (dia < 1 || dia > 31) return null;
    const mesNum = m[2] ? MESES_CORTOS[normalizar(m[2]).slice(0, 3)] : undefined;
    return { dia, mes: mesNum ? `?-${pad(mesNum)}` : null };
  }
  return null;
}

// ---------- Detección de encabezados ----------

interface Encabezado {
  fila: number;
  columnaInicial: number;
  /** columna → número de día */
  columnas: Map<number, number>;
  mes: string | null;
}

/** Busca en una fila una secuencia de días 1, 2, 3… de al menos 28 columnas seguidas. */
function encabezadoEn(hoja: Worksheet, fila: number): Encabezado | null {
  const r = hoja.getRow(fila);
  const ultima = Math.min(hoja.columnCount, 80);
  for (let c = 1; c <= ultima; c++) {
    const inicio = diaDeCelda(r.getCell(c));
    if (inicio?.dia !== 1) continue;
    const columnas = new Map<number, number>([[c, 1]]);
    let esperado = 2;
    let mes = inicio.mes;
    for (let k = c + 1; k <= ultima && esperado <= 31; k++) {
      const d = diaDeCelda(r.getCell(k));
      if (d?.dia !== esperado) break;
      columnas.set(k, esperado);
      mes ??= d.mes;
      esperado++;
    }
    if (columnas.size >= 28) return { fila, columnaInicial: c, columnas, mes };
  }
  return null;
}

/** Fila con las letras de la semana (L M X J V S D…): se repite cada 7 días y tiene variedad. */
function esFilaDeLetras(valores: string[]): boolean {
  const llenos = valores.filter(Boolean);
  if (llenos.length < 20 || !llenos.every((v) => LETRAS_SEMANA.has(v.toUpperCase()))) return false;
  if (new Set(llenos.map((v) => v.toUpperCase())).size < 5) return false;
  let iguales = 0;
  for (let i = 0; i + 7 < valores.length; i++) if (valores[i] && valores[i] === valores[i + 7]) iguales++;
  return iguales >= llenos.length - 8;
}

// ---------- Interpretación de cargos y marcas ----------

/** «FEMINA DESC», «Fem. desc.», «SIMPLEN», «ARMADO» → cargo del sistema (o null si no se reconoce). */
export function interpretarCargo(textoCargo: string): Cargo | null {
  const n = normalizar(textoCargo);
  if (!n) return null;
  const descansero = /DESC/.test(n);
  const base = n.startsWith('SUP')
    ? 'SUPERVISOR'
    : n.startsWith('ARM')
      ? 'ARMADO'
      : n.startsWith('FEM')
        ? 'FEMINA'
        : n.startsWith('SIM')
          ? 'SIMPLE'
          : null;
  return base ? componerCargo(base, descansero) : null;
}

const parecido_a_cargo = (t: string) => interpretarCargo(t) !== null;

const SINONIMOS: Record<string, string> = {
  LIBRE: 'L', DIA: 'D', NOCHE: 'N', FALTA: 'F', VACACIONES: 'V', VAC: 'V', PERMISO: 'P', PERM: 'P', 'D M': 'DM', DESCANSO: 'DM',
};

/** Texto de una celda de día → código de marca en mayúsculas ('' si está vacía). */
export function interpretarMarca(valorCelda: string): string {
  const n = normalizar(valorCelda);
  if (!n) return '';
  return SINONIMOS[n] ?? n.replace(/\s+/g, '');
}

// ---------- Lectura del libro ----------

/** Mes escrito en las primeras filas, p. ej. «ROL DE SERVICIO – NOVIEMBRE 2026». */
function mesDelTitulo(hoja: Worksheet): string | null {
  for (let f = 1; f <= Math.min(5, hoja.rowCount); f++) {
    for (let c = 1; c <= Math.min(hoja.columnCount, 10); c++) {
      const t = normalizar(texto(hoja.getCell(f, c)));
      const m = new RegExp(`(${MESES_LARGOS.join('|')})\\s+(\\d{4})`).exec(t);
      if (m) {
        const indice = m[1] === 'SEPTIEMBRE' ? 8 : MESES_LARGOS.indexOf(m[1]!);
        return `${m[2]}-${pad(indice + 1)}`;
      }
    }
  }
  return null;
}

const ES_ROTULO = /^(N|NO|NRO|NUM|ITEM|AGENTE|AGENTES|NOMBRES?|APELLIDOS?|NOMBRES Y APELLIDOS|APELLIDOS Y NOMBRES|CARGO|TOTAL)\b/;

/** Elige la columna de nombres y la de cargo entre las columnas a la izquierda de los días. */
function columnasDeDatos(hoja: Worksheet, filas: number[], hasta: number): { nombre: number; cargo: number | null } {
  const puntosCargo = new Map<number, number>();
  const puntosNombre = new Map<number, number>();
  for (let c = 1; c < hasta; c++) {
    for (const f of filas) {
      const cell = hoja.getCell(f, c);
      if (cell.isMerged && cell.master.address !== cell.address) continue; // la sede combinada en la columna A
      const t = texto(cell);
      if (!t) continue;
      const n = normalizar(t);
      if (parecido_a_cargo(t)) puntosCargo.set(c, (puntosCargo.get(c) ?? 0) + 1);
      else if (/[A-Z]{3,}/.test(n) && !ES_ROTULO.test(n)) puntosNombre.set(c, (puntosNombre.get(c) ?? 0) + 1);
    }
  }
  const mejor = (m: Map<number, number>, excepto?: number | null) =>
    [...m].filter(([c]) => c !== excepto).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const cargo = mejor(puntosCargo);
  return { nombre: mejor(puntosNombre, cargo) ?? Math.max(1, hasta - 2), cargo };
}

/** Nombre de la sede: la banda encima del encabezado o el texto combinado de la columna A. */
function tituloDelBloque(hoja: Worksheet, enc: Encabezado, filas: number[], columnaNombre: number): string {
  const valido = (t: string) => {
    const n = normalizar(t);
    return n.length >= 4 && !ES_ROTULO.test(n) && !/^\d+$/.test(n) && !/ROL DE SERVICIO|DISTRIBUCION/.test(n);
  };
  for (const f of [enc.fila - 1, enc.fila - 2]) {
    if (f < 1) continue;
    for (let c = 1; c < enc.columnaInicial; c++) {
      const t = texto(hoja.getCell(f, c));
      if (valido(t) && !parecido_a_cargo(t)) return t;
    }
  }
  const cuenta = new Map<string, number>();
  for (const f of [enc.fila, ...filas]) {
    for (let c = 1; c < enc.columnaInicial; c++) {
      if (c === columnaNombre) continue;
      const t = texto(hoja.getCell(f, c));
      if (valido(t) && !parecido_a_cargo(t)) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
    }
  }
  return [...cuenta].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0]?.[0] ?? `Bloque de la fila ${enc.fila}`;
}

function leerHoja(hoja: Worksheet): BloqueLeido[] {
  const encabezados: Encabezado[] = [];
  for (let f = 1; f <= hoja.rowCount; f++) {
    const enc = encabezadoEn(hoja, f);
    if (enc) encabezados.push(enc);
  }
  const mesTitulo = mesDelTitulo(hoja);

  return encabezados.map((enc, i) => {
    const limite = encabezados[i + 1]?.fila ?? hoja.rowCount + 1;
    const columnasDia = [...enc.columnas];
    const valoresDia = (f: number) => columnasDia.map(([c]) => texto(hoja.getCell(f, c)));

    // Filas de agentes: hasta la fila TOTAL o el siguiente encabezado.
    const candidatas: number[] = [];
    for (let f = enc.fila + 1; f < limite; f++) {
      const rotulo = normalizar(
        Array.from({ length: enc.columnaInicial - 1 }, (_, k) => texto(hoja.getCell(f, k + 1))).join(' '),
      );
      if (/\bTOTAL\b/.test(rotulo)) break;
      if (esFilaDeLetras(valoresDia(f))) continue;
      candidatas.push(f);
    }
    const { nombre, cargo } = columnasDeDatos(hoja, candidatas, enc.columnaInicial);

    const filas: FilaLeida[] = [];
    for (const f of candidatas) {
      const nombres = texto(hoja.getCell(f, nombre)).replace(/\s+/g, ' ');
      const n = normalizar(nombres);
      if (!n || ES_ROTULO.test(n) || !/[A-Z]{2,}/.test(n)) continue; // fila vacía o de rótulos
      const marcas: (string | null)[] = Array.from({ length: Math.max(...enc.columnas.values()) }, () => null);
      const desconocidas: FilaLeida['desconocidas'] = [];
      for (const [c, dia] of columnasDia) {
        const crudo = texto(hoja.getCell(f, c));
        const marca = interpretarMarca(crudo);
        if (!marca) continue;
        if (/^[A-Z]{1,3}$/.test(marca)) marcas[dia - 1] = marca;
        else desconocidas.push({ dia, valor: crudo });
      }
      filas.push({ fila: f, nombres: n, cargoTexto: cargo ? texto(hoja.getCell(f, cargo)) : '', marcas, desconocidas });
    }

    // «1-Nov» sin año: se toma el año del título de la hoja o, si no hay, el año actual.
    const anio = mesTitulo?.slice(0, 4) ?? hoyEnPeru().fecha.slice(0, 4);
    const mes = enc.mes?.startsWith('?-') ? `${anio}${enc.mes.slice(1)}` : (enc.mes ?? mesTitulo);
    return {
      hoja: hoja.name,
      titulo: tituloDelBloque(hoja, enc, candidatas, nombre),
      mes,
      dias: enc.columnas.size,
      filas,
    };
  });
}

/** Lee todas las hojas del libro y devuelve los bloques (sedes) encontrados. */
export async function leerLibro(contenido: Buffer): Promise<BloqueLeido[]> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(contenido as unknown as ArrayBuffer);
  return libro.worksheets.filter((h) => h.state === 'visible').flatMap(leerHoja);
}
