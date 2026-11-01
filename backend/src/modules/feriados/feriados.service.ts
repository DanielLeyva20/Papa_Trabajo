import { sql } from '../../database/client.js';
import { feriadosDelPeru, type Feriado } from '../../shared/calendar.js';
import { conflicto, notFound } from '../../shared/errors.js';

/** Feriados nacionales (calculados por ley) + locales (agregados a mano), en un solo lugar. */
export const feriadosService = {
  async delAnio(year: number): Promise<Feriado[]> {
    const nacionales: Feriado[] = [...feriadosDelPeru(year)].map(([fecha, nombre]) => ({
      fecha, nombre, tipo: 'NACIONAL',
    }));
    const locales = (
      await sql.all<{ fecha: string; nombre: string }>(
        'SELECT fecha, nombre FROM feriados WHERE fecha LIKE ? ORDER BY fecha', `${year}-%`,
      )
    ).map((f): Feriado => ({ ...f, tipo: 'LOCAL' }));
    // Si un local cae el mismo día que uno nacional, prevalece el nacional.
    const ocupadas = new Set(nacionales.map((f) => f.fecha));
    return [...nacionales, ...locales.filter((f) => !ocupadas.has(f.fecha))].sort((a, b) =>
      a.fecha.localeCompare(b.fecha),
    );
  },

  /** fecha → nombre, para pintar el calendario. */
  async mapaDelAnio(year: number): Promise<Map<string, string>> {
    return new Map((await this.delAnio(year)).map((f) => [f.fecha, f.nombre]));
  },

  async agregar(fecha: string, nombre: string): Promise<Feriado[]> {
    const nacional = feriadosDelPeru(Number(fecha.slice(0, 4))).get(fecha);
    if (nacional) throw conflicto(`Ese día ya es feriado nacional: ${nacional}.`);
    await sql.run(
      'INSERT INTO feriados (fecha, nombre) VALUES (?, ?) ON CONFLICT (fecha) DO UPDATE SET nombre = excluded.nombre',
      fecha, nombre,
    );
    return this.delAnio(Number(fecha.slice(0, 4)));
  },

  async quitar(fecha: string): Promise<Feriado[]> {
    if (feriadosDelPeru(Number(fecha.slice(0, 4))).has(fecha)) {
      throw conflicto('Los feriados nacionales no se pueden quitar.');
    }
    const { changes } = await sql.run('DELETE FROM feriados WHERE fecha = ?', fecha);
    if (changes === 0) throw notFound('Ese feriado');
    return this.delAnio(Number(fecha.slice(0, 4)));
  },
};
