import { sentencia, sql } from '../../database/client.js';
import { CARGO_SQL } from '../../database/fragmentos.js';
import type { Cargo } from '../../shared/domain.js';

export interface Turno {
  agenteId: number;
  sedeId: number;
  fecha: string;
  codigo: string;
}

export interface TurnoHuerfano {
  agenteId: number;
  sedeId: number;
  nombres: string;
  cargo: Cargo;
}

export interface CambioTurno {
  agenteId: number;
  sedeId: number;
  fecha: string;
  /** null = borrar la marca */
  codigo: string | null;
}

export const turnosRepository = {
  delRango(desde: string, hasta: string): Promise<Turno[]> {
    return sql.all<Turno>(
      `SELECT agente_id AS agenteId, sede_id AS sedeId, fecha, codigo
       FROM turnos WHERE fecha BETWEEN ? AND ?`,
      desde, hasta,
    );
  },

  /** Pares agente/sede con marcas en el rango pero sin asignación vigente en `mes`. */
  sinAsignacion(desde: string, hasta: string, mes: string): Promise<TurnoHuerfano[]> {
    return sql.all<TurnoHuerfano>(
      `SELECT DISTINCT t.agente_id AS agenteId, t.sede_id AS sedeId, a.nombres, ${CARGO_SQL} AS cargo
       FROM turnos t JOIN agentes a ON a.id = t.agente_id
       WHERE t.fecha BETWEEN ? AND ?
         AND NOT EXISTS (
           SELECT 1 FROM asignaciones x
           WHERE x.agente_id = t.agente_id AND x.sede_id = t.sede_id
             AND x.desde <= ? AND (x.hasta IS NULL OR x.hasta >= ?))
       ORDER BY a.nombres`,
      desde, hasta, mes, mes,
    );
  },

  /** Guarda o borra varias marcas en un solo lote atómico (una sola ida a la base). */
  async aplicar(cambios: CambioTurno[]): Promise<void> {
    await sql.lote(
      cambios.map((c) =>
        c.codigo === null
          ? sentencia('DELETE FROM turnos WHERE agente_id = ? AND sede_id = ? AND fecha = ?', c.agenteId, c.sedeId, c.fecha)
          : sentencia(
              `INSERT INTO turnos (agente_id, sede_id, fecha, codigo) VALUES (?, ?, ?, ?)
               ON CONFLICT (agente_id, sede_id, fecha)
               DO UPDATE SET codigo = excluded.codigo, actualizado_en = datetime('now')`,
              c.agenteId, c.sedeId, c.fecha, c.codigo,
            ),
      ),
    );
  },

  async borrarRango(desde: string, hasta: string, sedeId?: number): Promise<number> {
    const { changes } =
      sedeId !== undefined
        ? await sql.run('DELETE FROM turnos WHERE fecha BETWEEN ? AND ? AND sede_id = ?', desde, hasta, sedeId)
        : await sql.run('DELETE FROM turnos WHERE fecha BETWEEN ? AND ?', desde, hasta);
    return changes;
  },
};
