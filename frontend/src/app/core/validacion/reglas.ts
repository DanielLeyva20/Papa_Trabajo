/**
 * Reglas de validación de los formularios. Son las mismas que aplica el servidor
 * (backend/src/shared/validation.ts): aquí sirven para avisar antes de enviar.
 * Cada regla devuelve el mensaje de error o null si el valor es válido.
 */
export type Regla = (valor: string) => string | null;

const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/;

export const reglas = {
  requerido:
    (min = 1, max = 120): Regla =>
    (v) => {
      const t = v.trim();
      if (!t) return 'Este dato es obligatorio.';
      if (t.length < min) return `Escriba al menos ${min} letras.`;
      if (t.length > max) return `Máximo ${max} caracteres.`;
      return null;
    },

  nombrePersona: ((v) => {
    const t = v.trim();
    if (!t) return 'Escriba los apellidos y nombres.';
    if (t.length < 3) return 'Escriba al menos 3 letras.';
    if (t.length > 80) return 'Máximo 80 caracteres.';
    if (!SOLO_LETRAS.test(t)) return 'Use solo letras (sin números ni símbolos).';
    return null;
  }) satisfies Regla,

  /** Opcional; si se escribe, deben ser exactamente 8 dígitos. */
  dni: ((v) => {
    const t = v.trim();
    if (!t) return null;
    return /^\d{8}$/.test(t) ? null : 'El DNI debe tener 8 dígitos.';
  }) satisfies Regla,

  /** Opcional; de 6 a 9 dígitos (se ignoran espacios y guiones). */
  telefono: ((v) => {
    const t = v.replace(/[\s-]/g, '');
    if (!t) return null;
    return /^\d{6,9}$/.test(t) ? null : 'El teléfono debe tener entre 6 y 9 dígitos.';
  }) satisfies Regla,
};

/** Quita todo lo que no sea dígito (para campos numéricos mientras se escribe). */
export const soloDigitos = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);
