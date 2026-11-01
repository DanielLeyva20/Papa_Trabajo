import { sentencia, sql } from '../../database/client.js';

export interface Sede {
  id: number;
  nombre: string;
  nombreCorto: string;
  orden: number;
  activa: boolean;
  /** Agentes de día que debe haber cada día; menos que esto se marca en rojo. */
  minimoDia: number;
}

export type SedeDatos = Pick<Sede, 'nombre' | 'nombreCorto' | 'activa' | 'minimoDia'>;

interface SedeRow extends Omit<Sede, 'activa'> {
  activa: number;
}

const SELECT = 'SELECT id, nombre, nombre_corto AS nombreCorto, orden, activa, minimo_dia AS minimoDia FROM sedes';
const toSede = (row: SedeRow): Sede => ({ ...row, activa: row.activa === 1 });

export const sedesRepository = {
  async listar(soloActivas: boolean): Promise<Sede[]> {
    const where = soloActivas ? ' WHERE activa = 1' : '';
    return (await sql.all<SedeRow>(`${SELECT}${where} ORDER BY orden, id`)).map(toSede);
  },

  async buscar(id: number): Promise<Sede | undefined> {
    const row = await sql.get<SedeRow>(`${SELECT} WHERE id = ?`, id);
    return row && toSede(row);
  },

  /** Otra sede (distinta de `exceptoId`) que ya use ese nombre o nombre corto. */
  async buscarDuplicada(nombre: string, nombreCorto: string, exceptoId = 0): Promise<Sede | undefined> {
    const row = await sql.get<SedeRow>(
      `${SELECT} WHERE id <> ? AND (LOWER(nombre) = LOWER(?) OR LOWER(nombre_corto) = LOWER(?))`,
      exceptoId, nombre, nombreCorto,
    );
    return row && toSede(row);
  },

  async crear(datos: SedeDatos): Promise<number> {
    const siguiente = (await sql.get<{ n: number }>('SELECT COALESCE(MAX(orden), -1) + 1 AS n FROM sedes'))!.n;
    const { lastId } = await sql.run(
      'INSERT INTO sedes (nombre, nombre_corto, orden, activa, minimo_dia) VALUES (?, ?, ?, ?, ?)',
      datos.nombre, datos.nombreCorto, siguiente, datos.activa ? 1 : 0, datos.minimoDia,
    );
    return lastId;
  },

  async actualizar(id: number, datos: SedeDatos): Promise<void> {
    await sql.run(
      'UPDATE sedes SET nombre = ?, nombre_corto = ?, activa = ?, minimo_dia = ? WHERE id = ?',
      datos.nombre, datos.nombreCorto, datos.activa ? 1 : 0, datos.minimoDia, id,
    );
  },

  async ordenar(ids: number[]): Promise<void> {
    await sql.lote(ids.map((id, orden) => sentencia('UPDATE sedes SET orden = ? WHERE id = ?', orden, id)));
  },
};
