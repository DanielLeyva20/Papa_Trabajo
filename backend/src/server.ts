import { exec } from 'node:child_process';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { cerrar, conectar } from './database/client.js';
import { runMigrations } from './database/migrations.js';
import { seedIfEmpty } from './database/seed.js';
import { hoyEnPeru } from './shared/calendar.js';

const urlLocal = `http://localhost:${env.port}`;
const abrirNavegador = process.argv.includes('--abrir');

function abrir() {
  if (!abrirNavegador) return;
  exec(process.platform === 'win32' ? `start "" "${urlLocal}"` : `xdg-open "${urlLocal}"`);
}

async function iniciar() {
  const destino = env.database.url.startsWith('file:') ? 'archivo local' : 'Turso';
  console.log(`Conectando a la base de datos (${destino})…`);
  conectar();
  await runMigrations();
  await seedIfEmpty(hoyEnPeru().mes);

  const server = createApp().listen(env.port, env.host, () => {
    console.log(`Rol de Turnos listo en ${env.produccion ? `el puerto ${env.port}` : urlLocal}`);
    abrir();
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE' && !env.produccion) {
      // Ya estaba abierto en la PC: solo se muestra la página.
      console.log('El sistema ya estaba abierto. Abriendo el navegador…');
      abrir();
      setTimeout(() => process.exit(0), 1500);
      return;
    }
    throw error;
  });

  // Render avisa con SIGTERM antes de reiniciar: se terminan las peticiones en curso.
  const apagar = () => {
    console.log('Cerrando el servidor…');
    server.close(() => {
      cerrar();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on('SIGTERM', apagar);
  process.on('SIGINT', apagar);
}

iniciar().catch((error: unknown) => {
  console.error('No se pudo iniciar el sistema:', error);
  process.exit(1);
});
