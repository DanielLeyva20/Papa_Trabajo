import { sql } from '../../database/client.js';
import { CARGO_SQL, columnasCargo } from '../../database/fragmentos.js';
import type { Cargo } from '../../shared/domain.js';

export interface Agente {
  id: number;
  nombres: string;
  cargo: Cargo;
  dni: string | null;
  telefono: string | null;
  activo: boolean;
  /** Marca de tiempo de la foto actual (sirve para refrescar la imagen) o null. */
  fotoVersion: string | null;
}

export interface AgenteConSedes extends Agente {
  sedes: string[];
}

export type AgenteDatos = Omit<Agente, 'id' | 'activo' | 'fotoVersion'>;

export interface Foto {
  tipo: string;
  datos: Buffer;
}

interface AgenteRow extends Omit<Agente, 'activo'> {
  activo: number;
  sedes: string | null;
}

const COLUMNAS = `a.id, a.nombres, ${CARGO_SQL} AS cargo, a.dni, a.telefono, a.activo, f.actualizado_en AS fotoVersion`;
const toAgente = ({ activo, ...resto }: Omit<AgenteRow, 'sedes'>): Agente => ({ ...resto, activo: activo === 1 });

export const agentesRepository = {
  /** Agentes con los nombres cortos de las sedes donde están asignados ese mes. */
  async listar(mes: string, incluirInactivos: boolean): Promise<AgenteConSedes[]> {
    const filas = await sql.all<AgenteRow>(
      `SELECT ${COLUMNAS}, GROUP_CONCAT(s.nombre_corto, '|') AS sedes
       FROM agentes a
       LEFT JOIN agente_fotos f ON f.agente_id = a.id
       LEFT JOIN asignaciones x ON x.agente_id = a.id AND x.desde <= ? AND (x.hasta IS NULL OR x.hasta >= ?)
       LEFT JOIN sedes s ON s.id = x.sede_id
       ${incluirInactivos ? '' : 'WHERE a.activo = 1'}
       GROUP BY a.id
       ORDER BY a.nombres COLLATE NOCASE`,
      mes, mes,
    );
    return filas.map(({ sedes, ...fila }) => ({ ...toAgente(fila), sedes: sedes ? sedes.split('|') : [] }));
  },

  async buscar(id: number): Promise<Agente | undefined> {
    const fila = await sql.get<AgenteRow>(
      `SELECT ${COLUMNAS} FROM agentes a LEFT JOIN agente_fotos f ON f.agente_id = a.id WHERE a.id = ?`, id,
    );
    return fila && toAgente(fila);
  },

  /** Otro agente con el mismo DNI, u otro activo con el mismo nombre. */
  async buscarDuplicado(
    datos: AgenteDatos,
    exceptoId = 0,
  ): Promise<{ id: number; nombres: string; dni: string | null } | undefined> {
    return sql.get(
      `SELECT id, nombres, dni FROM agentes
       WHERE id <> ? AND ((? IS NOT NULL AND dni = ?) OR (activo = 1 AND nombres = ?))`,
      exceptoId, datos.dni, datos.dni, datos.nombres,
    );
  },

  async crear(datos: AgenteDatos): Promise<number> {
    const { base, descansero } = columnasCargo(datos.cargo);
    const { lastId } = await sql.run(
      'INSERT INTO agentes (nombres, cargo, descansero, dni, telefono) VALUES (?, ?, ?, ?, ?)',
      datos.nombres, base, descansero, datos.dni, datos.telefono,
    );
    return lastId;
  },

  async actualizar(id: number, datos: AgenteDatos): Promise<void> {
    const { base, descansero } = columnasCargo(datos.cargo);
    await sql.run(
      'UPDATE agentes SET nombres = ?, cargo = ?, descansero = ?, dni = ?, telefono = ? WHERE id = ?',
      datos.nombres, base, descansero, datos.dni, datos.telefono, id,
    );
  },

  async cambiarEstado(id: number, activo: boolean): Promise<void> {
    await sql.run('UPDATE agentes SET activo = ? WHERE id = ?', activo ? 1 : 0, id);
  },

  // ---------- Fotos ----------

  async foto(id: number): Promise<Foto | undefined> {
    const fila = await sql.get<{ tipo: string; datos: ArrayBuffer }>(
      'SELECT tipo, datos FROM agente_fotos WHERE agente_id = ?', id,
    );
    return fila && { tipo: fila.tipo, datos: Buffer.from(fila.datos) };
  },

  async guardarFoto(id: number, foto: Foto): Promise<void> {
    await sql.run(
      `INSERT INTO agente_fotos (agente_id, tipo, datos) VALUES (?, ?, ?)
       ON CONFLICT (agente_id) DO UPDATE SET tipo = excluded.tipo, datos = excluded.datos,
         actualizado_en = strftime('%Y%m%d%H%M%f', 'now')`,
      id, foto.tipo, foto.datos,
    );
  },

  async quitarFoto(id: number): Promise<void> {
    await sql.run('DELETE FROM agente_fotos WHERE agente_id = ?', id);
  },

  /** agenteId → versión de su foto, para todos los que tienen foto. */
  async versionesDeFotos(): Promise<Map<number, string>> {
    const filas = await sql.all<{ id: number; version: string }>(
      'SELECT agente_id AS id, actualizado_en AS version FROM agente_fotos',
    );
    return new Map(filas.map((f) => [f.id, f.version]));
  },
};
