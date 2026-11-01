// Desarrollo: levanta el backend (4800) y Angular (4200) juntos. Ctrl+C detiene ambos.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const procesos = [
  { nombre: 'backend ', carpeta: 'backend', script: 'dev' },
  { nombre: 'frontend', carpeta: 'frontend', script: 'start' },
].map(({ nombre, carpeta, script }) => {
  const hijo = spawn('npm', ['run', script], { cwd: path.join(raiz, carpeta), shell: true });
  const prefijar = (datos) =>
    datos.toString().split(/\r?\n/).filter(Boolean).forEach((linea) => console.log(`[${nombre}] ${linea}`));
  hijo.stdout.on('data', prefijar);
  hijo.stderr.on('data', prefijar);
  hijo.on('exit', (codigo) => console.log(`[${nombre}] terminó (${codigo ?? 'detenido'})`));
  return hijo;
});

const detener = () => {
  procesos.forEach((p) => p.kill());
  process.exit(0);
};
process.on('SIGINT', detener);
process.on('SIGTERM', detener);
