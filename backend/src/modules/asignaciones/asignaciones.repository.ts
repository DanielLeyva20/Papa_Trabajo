import { sentencia, sql } from '../../database/client.js';
import { CARGO_SQL } from '../../database/fragmentos.js';
import type { Cargo, PatronSemanal } from '../../shared/domain.js';

export interface Asignacion {
  id: number;
  agenteId: number;
  sedeId: number;
  nombres: string;
  cargo: Cargo;
  orden: number;
  patron: PatronSemanal;
  desde: string;
  hasta: string | null;
}

interface AsignacionRow extends Omit<Asignacion, 'patron'> {
  patron: string;
}

const SELECT = `
  SELECT x.id, x.agente_id AS agenteId, x.sede_id AS sedeId, a.nombres, ${CARGO_SQL} AS cargo,
         x.orden, x.patron, x.desde, x.hasta
  FROM asignaciones x JOIN agentes a ON a.id = x.agente_id`;

const VIGENTE_EN_MES = 'x.desde <= ? AND (x.hasta IS NULL OR x.hasta >= ?)';

const toAsignacion = (row: AsignacionRow): Asignacion => ({ ...row, patron: JSON.parse(row.patron) });

/** YYYY-MM del mes anterior a `mes`. */
function mesPrevio(mes: string): string {
  const [y, m] = mes.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Sentencias para retirar una asignación desde `desdeMes` (o borrarla si nunca estuvo vigente antes). */
function sentenciasCierre(id: number, desdeMes: string) {
  const hasta = mesPrevio(desdeMes);
  return [
    sentencia('DELETE FROM asignaciones WHERE id = ? AND desde > ?', id, hasta),
    sentencia('UPDATE asignaciones SET hasta = ? WHERE id = ? AND (hasta IS NULL OR hasta > ?)', hasta, id, hasta),
  ];
}

export const asignacionesRepository = {
  async vigentesEnSede(sedeId: number, mes: string): Promise<Asignacion[]> {
    const filas = await sql.all<AsignacionRow>(
      `${SELECT} WHERE x.sede_id = ? AND ${VIGENTE_EN_MES} ORDER BY x.orden, x.id`, sedeId, mes, mes,
    );
    return filas.map(toAsignacion);
  },

  async vigentesEnMes(mes: string): Promise<Asignacion[]> {
    const filas = await sql.all<AsignacionRow>(
      `${SELECT} WHERE ${VIGENTE_EN_MES} ORDER BY x.sede_id, x.orden, x.id`, mes, mes,
    );
    return filas.map(toAsignacion);
  },

  async delAgente(agenteId: number, mes: string): Promise<Asignacion[]> {
    const filas = await sql.all<AsignacionRow>(
      `${SELECT} WHERE x.agente_id = ? AND ${VIGENTE_EN_MES} ORDER BY x.sede_id`, agenteId, mes, mes,
    );
    return filas.map(toAsignacion);
  },

  async buscar(id: number): Promise<Asignacion | undefined> {
    const fila = await sql.get<AsignacionRow>(`${SELECT} WHERE x.id = ?`, id);
    return fila && toAsignacion(fila);
  },

  async existeVigente(agenteId: number, sedeId: number, mes: string): Promise<boolean> {
    return !!(await sql.get(
      `SELECT 1 FROM asignaciones x WHERE x.agente_id = ? AND x.sede_id = ? AND ${VIGENTE_EN_MES}`,
      agenteId, sedeId, mes, mes,
    ));
  },

  async crear(agenteId: number, sedeId: number, patron: PatronSemanal, desde: string): Promise<number> {
    const siguiente = (await sql.get<{ n: number }>(
      'SELECT COALESCE(MAX(orden), -1) + 1 AS n FROM asignaciones WHERE sede_id = ?', sedeId,
    ))!.n;
    const { lastId } = await sql.run(
      'INSERT INTO asignaciones (agente_id, sede_id, orden, patron, desde) VALUES (?, ?, ?, ?, ?)',
      agenteId, sedeId, siguiente, JSON.stringify(patron), desde,
    );
    return lastId;
  },

  async actualizarPatron(id: number, patron: PatronSemanal): Promise<void> {
    await sql.run('UPDATE asignaciones SET patron = ? WHERE id = ?', JSON.stringify(patron), id);
  },

  async ordenar(ids: number[]): Promise<void> {
    await sql.lote(ids.map((id, orden) => sentencia('UPDATE asignaciones SET orden = ? WHERE id = ?', orden, id)));
  },

  /** Retira la asignación a partir de `desdeMes`; si nunca llegó a estar vigente antes, se elimina. */
  async cerrar(id: number, desdeMes: string): Promise<void> {
    await sql.lote(sentenciasCierre(id, desdeMes));
  },

  async cerrarTodasDelAgente(agenteId: number, desdeMes: string): Promise<void> {
    const filas = await sql.all<{ id: number }>('SELECT id FROM asignaciones WHERE agente_id = ?', agenteId);
    await sql.lote(filas.flatMap(({ id }) => sentenciasCierre(id, desdeMes)));
  },

  /** IDs de las asignaciones vigentes en una sede ese mes (para validar un reordenamiento). */
  async idsDeSede(sedeId: number, mes: string): Promise<number[]> {
    const filas = await sql.all<{ id: number }>(
      `SELECT x.id FROM asignaciones x WHERE x.sede_id = ? AND ${VIGENTE_EN_MES}`, sedeId, mes, mes,
    );
    return filas.map((f) => f.id);
  },
};
