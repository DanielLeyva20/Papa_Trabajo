import { sql } from '../../database/client.js';
import type { CategoriaCodigo } from '../../shared/domain.js';

export interface CodigoTurno {
  codigo: string;
  nombre: string;
  categoria: CategoriaCodigo;
  tecla: string;
  colorFondo: string;
  colorTexto: string;
}

/** Las marcas no se editan desde la app: se leen una vez y quedan en memoria. */
let cache: CodigoTurno[] | null = null;

export const codigosService = {
  async listar(): Promise<CodigoTurno[]> {
    cache ??= await sql.all<CodigoTurno>(
      `SELECT codigo, nombre, categoria, tecla, color_fondo AS colorFondo, color_texto AS colorTexto
       FROM codigos ORDER BY orden`,
    );
    return cache;
  },

  async categorias(): Promise<Map<string, CategoriaCodigo>> {
    return new Map((await this.listar()).map((c) => [c.codigo, c.categoria]));
  },
};
