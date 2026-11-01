/** Vocabulario del dominio compartido por todos los módulos. */

/** Cargo base. Cualquiera puede ser además "descansero" (cubre los descansos de otros). */
export const CARGOS_BASE = ['SUPERVISOR', 'ARMADO', 'SIMPLE', 'FEMINA'] as const;
export type CargoBase = (typeof CARGOS_BASE)[number];

/** Cargo completo tal como lo ve la app: base, o base + `_DESC` si es descansero. */
export const CARGOS = [
  'SUPERVISOR',
  'SUPERVISOR_DESC',
  'ARMADO',
  'ARMADO_DESC',
  'SIMPLE',
  'SIMPLE_DESC',
  'FEMINA',
  'FEMINA_DESC',
] as const;
export type Cargo = (typeof CARGOS)[number];

export const CARGO_ETIQUETA: Record<Cargo, string> = {
  SUPERVISOR: 'Supervisor',
  SUPERVISOR_DESC: 'Supervisor descansero',
  ARMADO: 'Armado',
  ARMADO_DESC: 'Armado descansero',
  SIMPLE: 'Simple',
  SIMPLE_DESC: 'Simple descansero',
  FEMINA: 'Fémina',
  FEMINA_DESC: 'Fémina descansera',
};

export const esDescansero = (cargo: Cargo): boolean => cargo.endsWith('_DESC');
export const cargoBase = (cargo: Cargo): CargoBase => cargo.replace('_DESC', '') as CargoBase;
export const componerCargo = (base: CargoBase, descansero: boolean): Cargo =>
  (descansero ? `${base}_DESC` : base) as Cargo;

export type CategoriaCodigo = 'DIA' | 'NOCHE' | 'LIBRE' | 'AUSENCIA';

/** Turno de trabajo de un agente: de día (diurno) o de noche (nocturno). */
export type Turno = 'DIA' | 'NOCHE';

/** Patrón semanal: índice 0 = Lunes … 6 = Domingo. null = no cubre esa sede ese día. */
export type PatronSemanal = (string | null)[];

export const PATRON_VACIO: PatronSemanal = [null, null, null, null, null, null, null];

/** Un agente "fijo" trabaja la mayor parte de la semana en la sede (no es descansero). */
export function esPatronFijo(patron: PatronSemanal, categorias: Map<string, CategoriaCodigo>): boolean {
  const diasTrabajo = patron.filter((c) => c && ['DIA', 'NOCHE'].includes(categorias.get(c) ?? '')).length;
  return diasTrabajo >= 4;
}

/** Turno que predomina en una lista de marcas: DIA o NOCHE (o null si no hay ninguna de trabajo). */
export function turnoPredominante(
  codigos: readonly (string | null)[],
  categorias: Map<string, CategoriaCodigo>,
): Turno | null {
  let dia = 0;
  let noche = 0;
  for (const codigo of codigos) {
    const categoria = codigo ? categorias.get(codigo) : undefined;
    if (categoria === 'DIA') dia++;
    if (categoria === 'NOCHE') noche++;
  }
  if (dia === 0 && noche === 0) return null;
  return noche > dia ? 'NOCHE' : 'DIA';
}

/**
 * Turno de un agente en una sede: primero según su semana habitual; si no la tiene
 * (historial), según lo que marcó en el mes. Por defecto, de día.
 */
export function turnoDeAgente(
  patron: PatronSemanal | null,
  marcas: readonly (string | null)[],
  categorias: Map<string, CategoriaCodigo>,
): Turno {
  return (patron && turnoPredominante(patron, categorias)) ?? turnoPredominante(marcas, categorias) ?? 'DIA';
}
