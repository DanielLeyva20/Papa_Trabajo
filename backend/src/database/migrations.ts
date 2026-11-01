import { sql } from './client.js';

/**
 * Migraciones en orden. Nunca editar una ya publicada: agregar una nueva al final.
 * Así la base de datos (Turso o la de la PC) se actualiza sola al iniciar una versión nueva.
 */
type Migracion = string | (() => Promise<void>);

const MIGRATIONS: readonly Migracion[] = [
  /* 1 — esquema inicial */ `
  CREATE TABLE configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );

  CREATE TABLE codigos (
    codigo      TEXT PRIMARY KEY,
    nombre      TEXT NOT NULL,
    categoria   TEXT NOT NULL CHECK (categoria IN ('DIA', 'NOCHE', 'LIBRE', 'AUSENCIA')),
    tecla       TEXT NOT NULL UNIQUE,
    color_fondo TEXT NOT NULL,
    color_texto TEXT NOT NULL,
    orden       INTEGER NOT NULL
  );

  CREATE TABLE sedes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre       TEXT NOT NULL UNIQUE,
    nombre_corto TEXT NOT NULL,
    orden        INTEGER NOT NULL DEFAULT 0,
    activa       INTEGER NOT NULL DEFAULT 1,
    creado_en    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE agentes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombres   TEXT NOT NULL,
    cargo     TEXT NOT NULL CHECK (cargo IN ('SUPERVISOR', 'ARMADO', 'SIMPLE', 'FEMINA', 'FEMINA_DESC')),
    dni       TEXT,
    telefono  TEXT,
    activo    INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- Un agente pertenece a una sede durante un rango de meses (YYYY-MM).
  -- patron: JSON de 7 casilleros (Lunes..Domingo) con el código habitual o null.
  CREATE TABLE asignaciones (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    agente_id INTEGER NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
    sede_id   INTEGER NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
    orden     INTEGER NOT NULL DEFAULT 0,
    patron    TEXT NOT NULL,
    desde     TEXT NOT NULL,
    hasta     TEXT,
    CHECK (hasta IS NULL OR hasta >= desde)
  );
  CREATE INDEX idx_asignaciones_sede ON asignaciones (sede_id, desde, hasta);
  CREATE INDEX idx_asignaciones_agente ON asignaciones (agente_id);

  CREATE TABLE turnos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    agente_id      INTEGER NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
    sede_id        INTEGER NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
    fecha          TEXT NOT NULL,
    codigo         TEXT NOT NULL REFERENCES codigos(codigo),
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE (agente_id, sede_id, fecha)
  );
  CREATE INDEX idx_turnos_sede_fecha ON turnos (sede_id, fecha);
  CREATE INDEX idx_turnos_fecha ON turnos (fecha);
  `,

  /* 2 — mínimo de agentes de día por sede (el TOTAL DÍA se marca en rojo si no se alcanza) */
  async () => {
    await sql.script('ALTER TABLE sedes ADD COLUMN minimo_dia INTEGER NOT NULL DEFAULT 1');
    // Valor inicial: agentes fijos de día menos uno (cada día uno descansa).
    const sedes = await sql.all<{ id: number }>('SELECT id FROM sedes');
    for (const { id } of sedes) {
      const patrones = await sql.all<{ patron: string }>(
        'SELECT patron FROM asignaciones WHERE sede_id = ? AND hasta IS NULL', id,
      );
      const fijosDia = patrones.filter(({ patron }) => {
        const dias = (JSON.parse(patron) as (string | null)[]).filter((c) => c === 'D').length;
        return dias >= 4;
      }).length;
      await sql.run('UPDATE sedes SET minimo_dia = ? WHERE id = ?', Math.max(1, fijosDia - 1), id);
    }
  },

  /* 3 — feriados locales, fotos del personal y paleta de marcas renovada */
  async () => {
    await sql.script(`
      -- Feriados agregados a mano (locales, días no laborables). Los nacionales se calculan solos.
      CREATE TABLE feriados (
        fecha  TEXT PRIMARY KEY,
        nombre TEXT NOT NULL
      );

      CREATE TABLE agente_fotos (
        agente_id      INTEGER PRIMARY KEY REFERENCES agentes(id) ON DELETE CASCADE,
        tipo           TEXT NOT NULL,
        datos          BLOB NOT NULL,
        actualizado_en TEXT NOT NULL DEFAULT (strftime('%Y%m%d%H%M%f', 'now'))
      );
    `);
    // Solo se cambian los colores que nadie personalizó.
    const PALETA: [codigo: string, antes: string, fondo: string, texto: string][] = [
      ['D', '#FFFFFF', '#FFFFFF', '#1D1D1F'],
      ['N', '#1F4FA3', '#5856D6', '#FFFFFF'],
      ['L', '#F2C230', '#FFCC00', '#1D1D1F'],
      ['F', '#D21F26', '#D70015', '#FFFFFF'],
      ['V', '#2E7D4F', '#248A3D', '#FFFFFF'],
      ['DM', '#6B3FA0', '#8944AB', '#FFFFFF'],
      ['P', '#E07B2E', '#FF9500', '#1D1D1F'],
    ];
    for (const [codigo, antes, fondo, texto] of PALETA) {
      await sql.run(
        'UPDATE codigos SET color_fondo = ?, color_texto = ? WHERE codigo = ? AND UPPER(color_fondo) = ?',
        fondo, texto, codigo, antes,
      );
    }
  },

  /*
   * 4 — cargos descanseros para todos los cargos (Simple, Armado, Supervisor, Fémina).
   * Se guarda como un indicador aparte del cargo base: así no hay que reconstruir la tabla
   * de agentes (que otras tablas referencian) y el cargo sigue validado por su CHECK.
   */
  async () => {
    await sql.script(`
      ALTER TABLE agentes ADD COLUMN descansero INTEGER NOT NULL DEFAULT 0;
      UPDATE agentes SET cargo = 'FEMINA', descansero = 1 WHERE cargo = 'FEMINA_DESC';
    `);
  },
];

export async function runMigrations(): Promise<void> {
  await sql.script('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  const actual = (await sql.get<{ version: number | null }>('SELECT MAX(version) AS version FROM schema_version'))?.version ?? 0;

  for (const [i, migracion] of MIGRATIONS.slice(actual).entries()) {
    const version = actual + i + 1;
    if (typeof migracion === 'string') await sql.script(migracion);
    else await migracion();
    await sql.run('INSERT INTO schema_version (version) VALUES (?)', version);
    console.log(`  · migración ${version} aplicada`);
  }
}
