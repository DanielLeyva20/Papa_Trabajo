import { sentencia, sql } from '../../database/client.js';

export interface Configuracion {
  titulo: string;
  entidad: string;
  supervisor: string;
}

/** Se guarda en memoria: casi nunca cambia y así no se consulta la base en cada reporte. */
let cache: Configuracion | null = null;

export const configuracionService = {
  async obtener(): Promise<Configuracion> {
    if (cache) return cache;
    const filas = await sql.all<{ clave: string; valor: string }>('SELECT clave, valor FROM configuracion');
    const mapa = Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
    cache = {
      titulo: mapa['titulo'] ?? 'Distribución de agentes',
      entidad: mapa['entidad'] ?? '',
      supervisor: mapa['supervisor'] ?? '',
    };
    return cache;
  },

  async actualizar(cambios: Partial<Configuracion>): Promise<Configuracion> {
    await sql.lote(
      Object.entries(cambios).map(([clave, valor]) =>
        sentencia(
          'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor',
          clave, valor,
        ),
      ),
    );
    cache = null;
    return this.obtener();
  },
};
