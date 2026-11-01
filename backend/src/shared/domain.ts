/** Vocabulario del dominio compartido por todos los módulos. */

export const CARGOS = ['SUPERVISOR', 'ARMADO', 'SIMPLE', 'FEMINA', 'FEMINA_DESC'] as const;
export type Cargo = (typeof CARGOS)[number];

export const CARGO_ETIQUETA: Record<Cargo, string> = {
  SUPERVISOR: 'Supervisor',
  ARMADO: 'Armado',
  SIMPLE: 'Simple',
  FEMINA: 'Fémina',
  FEMINA_DESC: 'Fémina descansera',
};

export type CategoriaCodigo = 'DIA' | 'NOCHE' | 'LIBRE' | 'AUSENCIA';

/** Patrón semanal: índice 0 = Lunes … 6 = Domingo. null = no cubre esa sede ese día. */
export type PatronSemanal = (string | null)[];

export const PATRON_VACIO: PatronSemanal = [null, null, null, null, null, null, null];

/** Un agente "fijo" trabaja la mayor parte de la semana en la sede (no es descansero). */
export function esPatronFijo(patron: PatronSemanal, categorias: Map<string, CategoriaCodigo>): boolean {
  const diasTrabajo = patron.filter((c) => c && ['DIA', 'NOCHE'].includes(categorias.get(c) ?? '')).length;
  return diasTrabajo >= 4;
}

/** Turno que predomina en el patrón: DIA o NOCHE (o null si no trabaja). */
export function turnoPredominante(
  patron: PatronSemanal,
  categorias: Map<string, CategoriaCodigo>,
): 'DIA' | 'NOCHE' | null {
  let dia = 0;
  let noche = 0;
  for (const codigo of patron) {
    const categoria = codigo ? categorias.get(codigo) : undefined;
    if (categoria === 'DIA') dia++;
    if (categoria === 'NOCHE') noche++;
  }
  if (dia === 0 && noche === 0) return null;
  return noche > dia ? 'NOCHE' : 'DIA';
}
