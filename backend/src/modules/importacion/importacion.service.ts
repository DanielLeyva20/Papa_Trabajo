import type { InStatement } from '@libsql/client';
import { sentencia, sql } from '../../database/client.js';
import { CARGO_SQL, columnasCargo } from '../../database/fragmentos.js';
import { diasDelMes, diasEnMes, parseMes } from '../../shared/calendar.js';
import type { Cargo, CategoriaCodigo, PatronSemanal } from '../../shared/domain.js';
import { solicitudInvalida } from '../../shared/errors.js';
import { mismasPalabras, nombreContenido, normalizar, parecido } from '../../shared/texto.js';
import { codigosService } from '../codigos/codigos.service.js';
import { sedesRepository, type Sede } from '../sedes/sedes.repository.js';
import { interpretarCargo, leerLibro } from './importacion.parser.js';
import type {
  AnalisisImportacion,
  BloquePrevio,
  FilaPrevia,
  PlanImportacion,
  ResultadoImportacion,
} from './importacion.types.js';

interface AgenteBase {
  id: number;
  nombres: string;
  cargo: Cargo;
  activo: number;
}

const PARECIDO_MINIMO = 0.34;

/** Un archivo .xlsx es un ZIP: empieza con «PK». El .xls antiguo empieza distinto. */
function verificarArchivo(contenido: unknown): Buffer {
  if (!Buffer.isBuffer(contenido) || contenido.length === 0) throw solicitudInvalida('No llegó ningún archivo.');
  if (contenido.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))) {
    throw solicitudInvalida('Ese Excel es del formato antiguo (.xls). Ábralo en Excel y guárdelo como «.xlsx».');
  }
  if (!contenido.subarray(0, 2).equals(Buffer.from('PK'))) throw solicitudInvalida('El archivo no es un Excel (.xlsx).');
  return contenido;
}

async function todosLosAgentes(): Promise<AgenteBase[]> {
  return sql.all<AgenteBase>(`SELECT a.id, a.nombres, ${CARGO_SQL} AS cargo, a.activo FROM agentes a`);
}

/**
 * Busca al agente, de lo más seguro a lo menos:
 * 1) mismo nombre (sin tildes ni espacios de más); 2) mismas palabras en otro orden;
 * 3) un nombre contiene al otro («LEYVA PARIONA» ↔ «LEYVA PARIONA EDER»), solo si hay un único candidato.
 */
function buscarAgente(agentes: AgenteBase[], nombres: string): AgenteBase | undefined {
  const n = normalizar(nombres);
  const exacto = agentes.find((a) => normalizar(a.nombres) === n) ?? agentes.find((a) => mismasPalabras(a.nombres, n));
  if (exacto) return exacto;
  const contenidos = agentes.filter((a) => nombreContenido(a.nombres, n));
  return contenidos.length === 1 ? contenidos[0] : undefined;
}

function sugerirSede(sedes: Sede[], titulo: string): Sede | null {
  const puntaje = (s: Sede) => Math.max(parecido(s.nombre, titulo), parecido(s.nombreCorto, titulo) * 0.9);
  const [mejor] = [...sedes].sort((a, b) => puntaje(b) - puntaje(a));
  return mejor && puntaje(mejor) >= PARECIDO_MINIMO ? mejor : null;
}

/**
 * Semana habitual deducida del mes: para cada día de la semana, la marca que más se repite
 * (al menos dos veces). Así un agente fijo queda con su descanso y un descansero solo con sus días.
 */
function inferirPatron(marcas: (string | null)[], mes: string, categorias: Map<string, CategoriaCodigo>): PatronSemanal {
  const dias = diasDelMes(parseMes(mes));
  const porSemana: Map<string, number>[] = Array.from({ length: 7 }, () => new Map());
  dias.forEach((d, i) => {
    const codigo = marcas[i];
    if (!codigo || categorias.get(codigo) === 'AUSENCIA') return;
    const conteo = porSemana[d.indiceSemana]!;
    conteo.set(codigo, (conteo.get(codigo) ?? 0) + 1);
  });
  return porSemana.map((conteo) => {
    const [codigo, veces] = [...conteo].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    return veces >= 2 ? codigo : null;
  });
}

const masFrecuente = (valores: (string | null)[]) => {
  const cuenta = new Map<string, number>();
  for (const v of valores) if (v) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  return [...cuenta].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

export const importacionService = {
  /** Lee el Excel y prepara una vista previa. No guarda nada. */
  async analizar(contenido: unknown): Promise<AnalisisImportacion> {
    const leidos = await leerLibro(verificarArchivo(contenido));
    if (leidos.length === 0) {
      throw solicitudInvalida(
        'No se encontró ninguna tabla de rol en el Excel. Debe tener una fila con los días del mes (1, 2, 3… o 1-Nov, 2-Nov…).',
      );
    }
    const [sedes, agentes, categorias] = await Promise.all([
      sedesRepository.listar(false),
      todosLosAgentes(),
      codigosService.categorias(),
    ]);

    const bloques: BloquePrevio[] = leidos.map((b, id) => {
      const sede = sugerirSede(sedes, b.titulo);
      const avisos: string[] = [];
      if (!sede) avisos.push(`No se reconoció la sede «${b.titulo}». Elíjala de la lista.`);

      const filas: FilaPrevia[] = b.filas.map((f) => {
        const existente = buscarAgente(agentes, f.nombres);
        const leido = interpretarCargo(f.cargoTexto);
        const avisosFila: string[] = [];
        if (!existente && !leido) avisosFila.push(`Cargo «${f.cargoTexto || 'vacío'}» no reconocido: se usará Simple.`);
        if (existente && leido && existente.cargo !== leido) {
          avisosFila.push(`En el Excel figura como «${f.cargoTexto}»; se mantiene el cargo del sistema.`);
        }
        const invalidas = f.marcas.filter((m) => m && !categorias.has(m));
        for (const m of new Set(invalidas)) avisosFila.push(`La marca «${m}» no existe y se dejará vacía.`);
        for (const d of f.desconocidas) avisosFila.push(`Día ${d.dia}: «${d.valor}» no es una marca; se dejará vacío.`);
        if (existente?.activo === 0) avisosFila.push('Estaba dado de baja: se reactivará.');
        if (existente && normalizar(existente.nombres) !== f.nombres) {
          avisosFila.push(`Se asoció con «${existente.nombres}», que ya está en el sistema.`);
        }
        return {
          nombres: existente?.nombres ?? f.nombres,
          cargoTexto: f.cargoTexto,
          cargo: existente?.cargo ?? leido ?? 'SIMPLE',
          agenteId: existente?.id ?? null,
          reactivar: existente?.activo === 0,
          marcas: f.marcas.map((m) => (m && categorias.has(m) ? m : null)),
          avisos: avisosFila,
        };
      });
      return { id, hoja: b.hoja, titulo: b.titulo, sedeId: sede?.id ?? null, mes: b.mes, filas, avisos };
    });

    const mes = masFrecuente(bloques.map((b) => b.mes));
    const avisos: string[] = [];
    const repetidas = bloques.filter((b, i) => b.sedeId && bloques.findIndex((x) => x.sedeId === b.sedeId) !== i);
    if (repetidas.length) avisos.push('Dos tablas del Excel apuntan a la misma sede. Revise las sedes elegidas.');
    if (new Set(bloques.map((b) => b.mes).filter(Boolean)).size > 1) {
      avisos.push('El Excel tiene tablas de meses distintos: solo se importará el mes elegido.');
    }
    return { mes, bloques, avisos };
  },

  /**
   * Aplica el plan confirmado en un solo lote atómico: crea agentes nuevos, los asigna a su sede
   * (con la semana deducida del mes) y escribe las marcas tal cual están en el Excel.
   */
  async aplicar(plan: PlanImportacion): Promise<ResultadoImportacion> {
    const totalDias = diasEnMes(parseMes(plan.mes));
    const [sedes, agentes, categorias] = await Promise.all([
      sedesRepository.listar(false),
      todosLosAgentes(),
      codigosService.categorias(),
    ]);
    const sedesValidas = new Set(sedes.map((s) => s.id));
    const resultado: ResultadoImportacion = {
      agentesNuevos: 0,
      agentesReactivados: 0,
      asignacionesNuevas: 0,
      marcasGuardadas: 0,
      marcasBorradas: 0,
    };

    const lote: InStatement[] = [];
    /** Posiciones en el lote de los DELETE de casilleros vacíos. */
    const borrados: number[] = [];
    let siguienteId = ((await sql.get<{ n: number | null }>('SELECT MAX(id) AS n FROM agentes'))?.n ?? 0) + 1;
    const nuevos = new Map<string, number>(); // nombre normalizado → id (un agente nuevo en varias sedes)
    const reactivados = new Set<number>();
    const asignados = new Set<string>();
    const ordenSiguiente = new Map<number, number>();

    for (const bloque of plan.bloques) {
      if (!sedesValidas.has(bloque.sedeId)) throw solicitudInvalida('Una de las sedes elegidas ya no existe. Recargue la página.');

      for (const fila of bloque.filas) {
        // 1) Agente: el elegido, uno que ya exista con ese nombre, o uno nuevo.
        const existente = (fila.agenteId ? agentes.find((a) => a.id === fila.agenteId) : undefined) ?? buscarAgente(agentes, fila.nombres);
        let agenteId = existente?.id ?? nuevos.get(normalizar(fila.nombres));
        if (!agenteId) {
          agenteId = siguienteId++;
          nuevos.set(normalizar(fila.nombres), agenteId);
          const { base, descansero } = columnasCargo(fila.cargo);
          lote.push(sentencia('INSERT INTO agentes (id, nombres, cargo, descansero) VALUES (?, ?, ?, ?)', agenteId, normalizar(fila.nombres), base, descansero));
          resultado.agentesNuevos++;
        } else if (existente?.activo === 0 && !reactivados.has(agenteId)) {
          lote.push(sentencia('UPDATE agentes SET activo = 1 WHERE id = ?', agenteId));
          reactivados.add(agenteId);
          resultado.agentesReactivados++;
        }

        // 2) Asignación a la sede ese mes (si no la tiene), con su semana deducida del Excel.
        const clave = `${agenteId}:${bloque.sedeId}`;
        if (!asignados.has(clave)) {
          asignados.add(clave);
          const yaAsignado = existente
            ? await sql.get(
                'SELECT 1 FROM asignaciones WHERE agente_id = ? AND sede_id = ? AND desde <= ? AND (hasta IS NULL OR hasta >= ?)',
                agenteId, bloque.sedeId, plan.mes, plan.mes,
              )
            : undefined;
          if (!yaAsignado) {
            if (!ordenSiguiente.has(bloque.sedeId)) {
              const n = (await sql.get<{ n: number }>('SELECT COALESCE(MAX(orden), -1) + 1 AS n FROM asignaciones WHERE sede_id = ?', bloque.sedeId))!.n;
              ordenSiguiente.set(bloque.sedeId, n);
            }
            const orden = ordenSiguiente.get(bloque.sedeId)!;
            ordenSiguiente.set(bloque.sedeId, orden + 1);
            lote.push(
              sentencia(
                'INSERT INTO asignaciones (agente_id, sede_id, orden, patron, desde) VALUES (?, ?, ?, ?, ?)',
                agenteId, bloque.sedeId, orden, JSON.stringify(inferirPatron(fila.marcas, plan.mes, categorias)), plan.mes,
              ),
            );
            resultado.asignacionesNuevas++;
          }
        }

        // 3) Marcas del mes, día por día, tal como están en el Excel.
        for (let i = 0; i < totalDias; i++) {
          const fecha = `${plan.mes}-${String(i + 1).padStart(2, '0')}`;
          const codigo = fila.marcas[i] ?? null;
          if (codigo && categorias.has(codigo)) {
            lote.push(
              sentencia(
                `INSERT INTO turnos (agente_id, sede_id, fecha, codigo) VALUES (?, ?, ?, ?)
                 ON CONFLICT (agente_id, sede_id, fecha) DO UPDATE SET codigo = excluded.codigo, actualizado_en = datetime('now')`,
                agenteId, bloque.sedeId, fecha, codigo,
              ),
            );
            resultado.marcasGuardadas++;
          } else if (plan.reemplazar) {
            // Se cuenta después: solo los casilleros que de verdad tenían una marca.
            borrados.push(lote.length);
            lote.push(sentencia('DELETE FROM turnos WHERE agente_id = ? AND sede_id = ? AND fecha = ?', agenteId, bloque.sedeId, fecha));
          }
        }
      }
    }

    const cambios = await sql.lote(lote);
    resultado.marcasBorradas = borrados.reduce((n, i) => n + (cambios[i] ?? 0), 0);
    return resultado;
  },
};
