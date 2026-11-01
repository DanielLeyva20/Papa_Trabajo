import fs from 'node:fs';
import path from 'node:path';
import { createClient, type Client, type InStatement, type InValue } from '@libsql/client';
import { env } from '../config/env.js';

/**
 * Acceso a la base de datos (Turso en la nube o un archivo SQLite en la PC).
 * Toda la app usa estos atajos tipados; ningún módulo crea su propio cliente.
 */
let cliente: Client | null = null;

export function conectar(): Client {
  const { url, authToken } = env.database;
  if (url.startsWith('file:')) {
    // Base local: se asegura que exista su carpeta.
    fs.mkdirSync(path.dirname(path.resolve(url.slice('file:'.length))), { recursive: true });
  }
  cliente = createClient({ url, authToken });
  return cliente;
}

function db(): Client {
  if (!cliente) throw new Error('La base de datos no está conectada.');
  return cliente;
}

export const sql = {
  async all<T>(consulta: string, ...args: InValue[]): Promise<T[]> {
    const r = await db().execute({ sql: consulta, args });
    return r.rows as unknown as T[];
  },

  async get<T>(consulta: string, ...args: InValue[]): Promise<T | undefined> {
    const r = await db().execute({ sql: consulta, args });
    return r.rows[0] as unknown as T | undefined;
  },

  async run(consulta: string, ...args: InValue[]) {
    const r = await db().execute({ sql: consulta, args });
    return { changes: r.rowsAffected, lastId: Number(r.lastInsertRowid ?? 0) };
  },

  /**
   * Ejecuta varias sentencias de forma atómica: o se guardan todas o ninguna.
   * Devuelve cuántas filas cambió cada sentencia, en el mismo orden.
   */
  async lote(sentencias: InStatement[]): Promise<number[]> {
    if (sentencias.length === 0) return [];
    const resultados = await db().batch(sentencias, 'write');
    return resultados.map((r) => r.rowsAffected);
  },

  /** Script con varias sentencias separadas por ";" (solo para migraciones). */
  async script(texto: string): Promise<void> {
    await db().executeMultiple(texto);
  },
};

/** Una sentencia para usar dentro de `sql.lote`. */
export const sentencia = (consulta: string, ...args: InValue[]): InStatement => ({ sql: consulta, args });

export function cerrar(): void {
  cliente?.close();
  cliente = null;
}
