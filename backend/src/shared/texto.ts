/** Utilidades de texto para comparar nombres escritos de distintas formas. */

/** Mayúsculas, sin tildes ni signos, espacios simples: «Fémina  Desc.» → «FEMINA DESC». */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const VACIAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y', 'E']);

/** Palabras significativas de un texto (sin «de», «la», «y»…). */
export function palabras(texto: string): Set<string> {
  return new Set(normalizar(texto).split(' ').filter((p) => p.length > 1 && !VACIAS.has(p)));
}

/** Parecido entre dos textos de 0 a 1 según las palabras que comparten. */
export function parecido(a: string, b: string): number {
  const pa = palabras(a);
  const pb = palabras(b);
  if (pa.size === 0 || pb.size === 0) return 0;
  const comunes = [...pa].filter((p) => pb.has(p)).length;
  return comunes / new Set([...pa, ...pb]).size;
}

/**
 * Todas las palabras del nombre más corto están en el más largo (al menos dos palabras):
 * «LEYVA PARIONA» ⊂ «LEYVA PARIONA EDER».
 */
export function nombreContenido(a: string, b: string): boolean {
  const [corto, largo] = [normalizar(a).split(' '), normalizar(b).split(' ')].sort((x, y) => x.length - y.length) as [
    string[],
    string[],
  ];
  return corto.length >= 2 && corto.every((p) => largo.includes(p));
}

/** Mismas palabras en cualquier orden: «JUAN PEREZ» = «PEREZ JUAN». */
export function mismasPalabras(a: string, b: string): boolean {
  return normalizar(a).split(' ').sort().join(' ') === normalizar(b).split(' ').sort().join(' ');
}
