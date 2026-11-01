import type { Cargo, PatronSemanal } from '../shared/domain.js';
import { sentencia, sql } from './client.js';

/**
 * Datos iniciales tomados del ROL DF de noviembre 2026 (Cañete).
 * Solo se cargan la primera vez, cuando la base está vacía.
 */

type Dia = 'LUN' | 'MAR' | 'MIE' | 'JUE' | 'VIE' | 'SAB' | 'DOM';
const DIAS: Dia[] = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

/** Agente fijo: trabaja `turno` toda la semana y descansa (L) el día indicado. */
const fijo = (descanso: Dia | null, turno: 'D' | 'N' = 'D'): PatronSemanal =>
  DIAS.map((dia) => (dia === descanso ? 'L' : turno));

/** Descansero: solo cubre esa sede los días indicados. */
const cubre = (...dias: Dia[]): PatronSemanal => DIAS.map((dia) => (dias.includes(dia) ? 'D' : null));

const CODIGOS = [
  { codigo: 'D', nombre: 'Día', categoria: 'DIA', tecla: 'D', fondo: '#FFFFFF', texto: '#1D1D1F' },
  { codigo: 'N', nombre: 'Noche', categoria: 'NOCHE', tecla: 'N', fondo: '#5856D6', texto: '#FFFFFF' },
  { codigo: 'L', nombre: 'Libre', categoria: 'LIBRE', tecla: 'L', fondo: '#FFCC00', texto: '#1D1D1F' },
  { codigo: 'F', nombre: 'Falta', categoria: 'AUSENCIA', tecla: 'F', fondo: '#D70015', texto: '#FFFFFF' },
  { codigo: 'V', nombre: 'Vacaciones', categoria: 'AUSENCIA', tecla: 'V', fondo: '#248A3D', texto: '#FFFFFF' },
  { codigo: 'DM', nombre: 'Descanso médico', categoria: 'AUSENCIA', tecla: 'M', fondo: '#8944AB', texto: '#FFFFFF' },
  { codigo: 'P', nombre: 'Permiso', categoria: 'AUSENCIA', tecla: 'P', fondo: '#FF9500', texto: '#1D1D1F' },
] as const;

const CONFIGURACION: Record<string, string> = {
  titulo: 'Distribución de agentes',
  entidad: 'Distrito Fiscal de Cañete',
  supervisor: 'LEYVA PARIONA EDER',
};

interface SedeSeed {
  nombre: string;
  corto: string;
  agentes: [nombres: string, cargo: Cargo, patron: PatronSemanal][];
}

const RUTH = 'RAMOS LUYO RUTH';

const SEDES: SedeSeed[] = [
  {
    nombre: 'Sede Principal Cañete – Día 7',
    corto: 'Principal',
    agentes: [
      ['LEYVA PARIONA EDER', 'SUPERVISOR', fijo('SAB')],
      ['BRIGGITE PORRAS', 'FEMINA', fijo('LUN')],
      ['ABARCA ARENAS', 'ARMADO', fijo('VIE')],
      ['CARRANZA CRUZ DANIEL', 'ARMADO', fijo('DOM')],
      ['LAPA ANGELES FRANSICO', 'SIMPLE', fijo('LUN')],
      ['CRUZADO REBATTA', 'SIMPLE', fijo('JUE')],
      ['DIAS BUENDIA', 'SIMPLE', fijo('MAR')],
      [RUTH, 'FEMINA_DESC', cubre('LUN')],
    ],
  },
  {
    nombre: 'Almacén Bienes Incautos Archivo Cañete',
    corto: 'Archivo',
    agentes: [
      ['CLODOMIRO', 'SIMPLE', fijo('MAR')],
      ['SALVADOR GONZALES', 'ARMADO', fijo('DOM')],
    ],
  },
  {
    nombre: 'Almacén de Bienes Incautos y Cochera Institucional',
    corto: 'Cochera',
    agentes: [
      ['CALAGUA SILVA', 'ARMADO', fijo('MIE')],
      ['CHAVEZ PADILLA', 'ARMADO', fijo('JUE')],
      ['FLORES AGUILAR', 'SIMPLE', fijo('MAR')],
    ],
  },
  {
    nombre: 'Fiscalía Familia y Prevención del Delito Cañete',
    corto: 'Familia',
    agentes: [
      ['LIZ PARIONA', 'FEMINA', fijo('VIE')],
      ['HUMAN RIVERA', 'ARMADO', fijo('SAB')],
      ['SANCHEZ VILCA', 'SIMPLE', fijo('MAR')],
      ['AYLLON ARAUS ANDERSON', 'SIMPLE', fijo(null)],
      [RUTH, 'FEMINA_DESC', cubre('VIE')],
    ],
  },
  {
    nombre: 'Transitoria de Prevención del Delito',
    corto: 'Transitoria',
    agentes: [
      ['BERROCAL GUIRALDY', 'ARMADO', fijo('MAR')],
      ['YACTAYO SACSA', 'SIMPLE', fijo('SAB')],
      ['HERNANDES CUYA', 'SIMPLE', fijo('VIE')],
    ],
  },
  {
    nombre: 'Fiscalía Especial Anticorrupción Cañete',
    corto: 'Anticorrupción',
    agentes: [
      ['CUETO RAMOS', 'FEMINA', fijo('SAB')],
      ['ARANA FRNACIA', 'ARMADO', fijo('DOM')],
      ['GONZALES CABELLO', 'SIMPLE', fijo('MIE')],
      [RUTH, 'FEMINA_DESC', cubre('SAB')],
    ],
  },
  {
    nombre: 'Dependencias Administrativas',
    corto: 'Administrativas',
    agentes: [
      ['DIEGO JARA', 'ARMADO', fijo('DOM')],
      ['BALVIN BALVIN RANDY', 'SIMPLE', fijo('VIE')],
      ['PERALES HUARI', 'SIMPLE', fijo('LUN')],
    ],
  },
  {
    nombre: 'Fiscalía Provincial de Mala',
    corto: 'Mala',
    agentes: [
      ['PERLA ALCANTARA', 'FEMINA', fijo('DOM')],
      ['RAMOS CRUZ', 'ARMADO', fijo('MAR')],
      ['DOMINGES CENISARIO', 'ARMADO', fijo('SAB')],
      ['ORTIZ FASABY', 'SIMPLE', fijo('MAR')],
      [RUTH, 'FEMINA_DESC', cubre('DOM')],
    ],
  },
  {
    nombre: 'Fiscalía Provincial de Yauyos',
    corto: 'Yauyos',
    agentes: [
      ['REIMONDY HUARACA YONY', 'ARMADO', fijo('LUN')],
      ['PIO RODRIGEZ MARTIN', 'SIMPLE', fijo('MAR')],
      ['CASTRO ORE RONAL', 'ARMADO', fijo('MIE', 'N')],
      ['MANUEL REYES LENIN', 'SIMPLE', fijo('JUE', 'N')],
    ],
  },
];

export async function seedIfEmpty(desdeMes: string): Promise<void> {
  const yaTieneDatos = ((await sql.get<{ n: number }>('SELECT COUNT(*) AS n FROM codigos'))?.n ?? 0) > 0;
  if (yaTieneDatos) return;

  // La base está vacía: los IDs se asignan aquí para cargar todo en un solo lote atómico.
  const lote = [
    ...CODIGOS.map((c, orden) =>
      sentencia(
        'INSERT INTO codigos (codigo, nombre, categoria, tecla, color_fondo, color_texto, orden) VALUES (?, ?, ?, ?, ?, ?, ?)',
        c.codigo, c.nombre, c.categoria, c.tecla, c.fondo, c.texto, orden,
      ),
    ),
    ...Object.entries(CONFIGURACION).map(([clave, valor]) =>
      sentencia('INSERT INTO configuracion (clave, valor) VALUES (?, ?)', clave, valor),
    ),
  ];

  const agenteIds = new Map<string, number>();
  SEDES.forEach((sede, i) => {
    const sedeId = i + 1;
    // Mínimo de día: agentes fijos de día menos uno (cada día uno descansa).
    const fijosDia = sede.agentes.filter(([, , p]) => p.filter((c) => c === 'D').length >= 4).length;
    lote.push(
      sentencia(
        'INSERT INTO sedes (id, nombre, nombre_corto, orden, minimo_dia) VALUES (?, ?, ?, ?, ?)',
        sedeId, sede.nombre, sede.corto, i, Math.max(1, fijosDia - 1),
      ),
    );

    sede.agentes.forEach(([nombres, cargo, patron], orden) => {
      let agenteId = agenteIds.get(nombres);
      if (agenteId === undefined) {
        agenteId = agenteIds.size + 1;
        agenteIds.set(nombres, agenteId);
        lote.push(sentencia('INSERT INTO agentes (id, nombres, cargo) VALUES (?, ?, ?)', agenteId, nombres, cargo));
      }
      lote.push(
        sentencia(
          'INSERT INTO asignaciones (agente_id, sede_id, orden, patron, desde) VALUES (?, ?, ?, ?, ?)',
          agenteId, sedeId, orden, JSON.stringify(patron), desdeMes,
        ),
      );
    });
  });

  await sql.lote(lote);
  console.log(`  · datos iniciales cargados: ${SEDES.length} sedes, ${agenteIds.size} agentes`);
}
