import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/** Carpeta `backend/` — funciona igual desde `src/` (desarrollo) o `dist/` (producción). */
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const projectRoot = path.resolve(backendRoot, '..');

// En la PC se leen las variables de `.env` (en Render se configuran en su panel).
for (const archivo of [path.join(backendRoot, '.env'), path.join(projectRoot, '.env')]) {
  if (fs.existsSync(archivo)) {
    process.loadEnvFile(archivo);
    break;
  }
}

const esquema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(4800),
    HOST: z.string().optional(),

    /** Turso: libsql://<base>.turso.io — en la PC puede ser un archivo: file:../datos/rol-turnos.db */
    DATABASE_URL: z.string().min(1).default(`file:${path.join(projectRoot, 'datos', 'rol-turnos.db').replace(/\\/g, '/')}`),
    DATABASE_AUTH_TOKEN: z.string().optional(),

    /** PIN de 6 dígitos para entrar al sistema. */
    APP_PIN: z.string({ message: 'falta (PIN de 6 dígitos)' }).regex(/^\d{6}$/, 'debe ser un PIN de exactamente 6 dígitos'),
    /** Clave larga y secreta para firmar la sesión (mínimo 32 caracteres). */
    SESSION_SECRET: z.string({ message: 'falta (clave secreta de 32+ caracteres)' }).min(32, 'debe tener al menos 32 caracteres'),
  })
  .superRefine((v, ctx) => {
    if (v.DATABASE_URL.startsWith('libsql://') && !v.DATABASE_AUTH_TOKEN) {
      ctx.addIssue({ code: 'custom', path: ['DATABASE_AUTH_TOKEN'], message: 'es obligatorio para conectarse a Turso' });
    }
  });

const resultado = esquema.safeParse(process.env);
if (!resultado.success) {
  console.error('\n✖ Configuración incompleta. Revise estas variables de entorno:\n');
  for (const problema of resultado.error.issues) {
    console.error(`  • ${problema.path.join('.')}: ${problema.message}`);
  }
  console.error('\nEn la PC: copie backend/.env.example como backend/.env y complételo.\n');
  process.exit(1);
}

const v = resultado.data;
const produccion = v.NODE_ENV === 'production';

export const env = {
  produccion,
  // En la nube se escucha en todas las interfaces; en la PC, solo en la propia máquina.
  host: v.HOST ?? (produccion ? '0.0.0.0' : '127.0.0.1'),
  port: v.PORT,
  database: { url: v.DATABASE_URL, authToken: v.DATABASE_AUTH_TOKEN },
  pin: v.APP_PIN,
  sessionSecret: v.SESSION_SECRET,
  sesionDias: 30,
  frontendDist: path.join(projectRoot, 'frontend', 'dist', 'frontend', 'browser'),
  timeZone: 'America/Lima',
} as const;
