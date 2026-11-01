import { env } from '../../config/env.js';
import { sql } from '../../database/client.js';
import { hoyEnPeru } from '../../shared/calendar.js';

/** Tablas con datos del usuario, en orden de dependencia (para poder restaurarlas en ese orden). */
const TABLAS = [
  'configuracion',
  'codigos',
  'sedes',
  'agentes',
  'agente_fotos',
  'asignaciones',
  'turnos',
  'feriados',
] as const;

export interface Respaldo {
  version: 1;
  generadoEn: string;
  tablas: Record<string, Record<string, unknown>[]>;
}

export const respaldoService = {
  /** Dónde viven los datos, para explicarlo en la pantalla de Descargas. */
  info() {
    const enLaNube = !env.database.url.startsWith('file:');
    return {
      enLaNube,
      descripcion: enLaNube
        ? 'Los datos están en Turso (en la nube), que guarda copias automáticas.'
        : 'Los datos están en esta PC, en la carpeta «datos».',
    };
  },

  /** Exporta todas las tablas a un JSON legible. Las fotos van en base64. */
  async exportar(): Promise<{ nombre: string; contenido: string }> {
    const tablas: Respaldo['tablas'] = {};
    const resultados = await Promise.all(TABLAS.map((t) => sql.all<Record<string, unknown>>(`SELECT * FROM ${t}`)));
    TABLAS.forEach((tabla, i) => {
      tablas[tabla] = resultados[i]!.map((fila) =>
        Object.fromEntries(
          Object.entries(fila).map(([k, v]) => [k, v instanceof ArrayBuffer ? Buffer.from(v).toString('base64') : v]),
        ),
      );
    });
    const respaldo: Respaldo = { version: 1, generadoEn: new Date().toISOString(), tablas };
    return { nombre: `Respaldo Rol de Turnos ${hoyEnPeru().fecha}.json`, contenido: JSON.stringify(respaldo) };
  },
};
