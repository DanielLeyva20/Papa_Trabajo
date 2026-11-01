import { sql } from '../../database/client.js';
import { diasDelMes, hoyEnPeru, nombreMes, parseMes, type DiaDelMes, type Mes } from '../../shared/calendar.js';
import { CARGOS, esPatronFijo, turnoPredominante, type Cargo, type CategoriaCodigo } from '../../shared/domain.js';
import { notFound, solicitudInvalida } from '../../shared/errors.js';
import { agentesRepository } from '../agentes/agentes.repository.js';
import { asignacionesRepository } from '../asignaciones/asignaciones.repository.js';
import { codigosService } from '../codigos/codigos.service.js';
import { feriadosService } from '../feriados/feriados.service.js';
import { sedesRepository } from '../sedes/sedes.repository.js';
import type {
  CambioMarca,
  Conflicto,
  Distribucion,
  FilaRol,
  ResumenAgente,
  RolMensual,
  SedeRol,
} from './rol.types.js';
import { turnosRepository, type Turno } from './turnos.repository.js';

async function rango(mes: Mes) {
  const dias = diasDelMes(mes, await feriadosService.mapaDelAnio(mes.year));
  return { dias, desde: dias[0]!.fecha, hasta: dias[dias.length - 1]!.fecha };
}

const claveTurno = (agenteId: number, sedeId: number, fecha: string) => `${agenteId}:${sedeId}:${fecha}`;

const cuentaCargos = (): Record<Cargo, number> =>
  Object.fromEntries(CARGOS.map((c) => [c, 0])) as Record<Cargo, number>;

/** Comprueba que existan todos los agentes y sedes de un lote de cambios (una consulta por tabla). */
async function validarReferencias(cambios: CambioMarca[]): Promise<void> {
  const unicos = (lista: number[]) => [...new Set(lista)];
  const agentes = unicos(cambios.map((c) => c.agenteId));
  const sedes = unicos(cambios.map((c) => c.sedeId));
  const huecos = (n: number) => Array(n).fill('?').join(',');
  const [conteoAgentes, conteoSedes] = await Promise.all([
    sql.get<{ n: number }>(`SELECT COUNT(*) AS n FROM agentes WHERE id IN (${huecos(agentes.length)})`, ...agentes),
    sql.get<{ n: number }>(`SELECT COUNT(*) AS n FROM sedes WHERE id IN (${huecos(sedes.length)})`, ...sedes),
  ]);
  if (conteoAgentes?.n !== agentes.length) throw notFound('Uno de los agentes');
  if (conteoSedes?.n !== sedes.length) throw notFound('Una de las sedes');
}

export const rolService = {
  async obtener(clave: string): Promise<RolMensual> {
    const mes = parseMes(clave);
    const { dias, desde, hasta } = await rango(mes);

    // Consultas independientes en paralelo: con Turso cada una es un viaje por la red.
    const [categorias, turnos, fotos, asignaciones, huerfanos, todasLasSedes] = await Promise.all([
      codigosService.categorias(),
      turnosRepository.delRango(desde, hasta),
      agentesRepository.versionesDeFotos(),
      asignacionesRepository.vigentesEnMes(clave),
      turnosRepository.sinAsignacion(desde, hasta, clave),
      sedesRepository.listar(false),
    ]);

    const marcas = new Map(turnos.map((t) => [claveTurno(t.agenteId, t.sedeId, t.fecha), t.codigo]));
    const marcasDe = (agenteId: number, sedeId: number) =>
      dias.map((d) => marcas.get(claveTurno(agenteId, sedeId, d.fecha)) ?? null);
    const sedesConHistorial = new Set(huerfanos.map((h) => h.sedeId));

    const sedes: SedeRol[] = todasLasSedes
      .filter((s) => s.activa || sedesConHistorial.has(s.id))
      .map((sede) => {
        const filas: FilaRol[] = [
          ...asignaciones
            .filter((a) => a.sedeId === sede.id)
            .map((a) => ({
              asignacionId: a.id,
              agenteId: a.agenteId,
              nombres: a.nombres,
              cargo: a.cargo,
              fotoVersion: fotos.get(a.agenteId) ?? null,
              patron: a.patron,
              marcas: marcasDe(a.agenteId, sede.id),
            })),
          ...huerfanos
            .filter((h) => h.sedeId === sede.id)
            .map((h) => ({
              asignacionId: null,
              agenteId: h.agenteId,
              nombres: h.nombres,
              cargo: h.cargo,
              fotoVersion: fotos.get(h.agenteId) ?? null,
              patron: null,
              marcas: marcasDe(h.agenteId, sede.id),
            })),
        ];
        return {
          id: sede.id,
          nombre: sede.nombre,
          nombreCorto: sede.nombreCorto,
          minimoDia: sede.minimoDia,
          filas,
          totales: {
            dia: totalesPorDia(filas, dias.length, categorias, 'DIA'),
            noche: totalesPorDia(filas, dias.length, categorias, 'NOCHE'),
            completos: diasCompletos(filas, dias),
          },
        };
      });

    return {
      mes: clave,
      nombreMes: nombreMes(mes),
      hoy: hoyEnPeru().fecha,
      dias,
      sedes,
      conflictos: detectarConflictos(turnos, categorias, sedes),
    };
  },

  /** Guarda un lote de marcas de forma atómica: si una falla, no se guarda ninguna. */
  async guardarMarcas(cambios: CambioMarca[]): Promise<void> {
    const validos = await codigosService.categorias();
    const invalida = cambios.find((c) => c.codigo !== null && !validos.has(c.codigo));
    if (invalida) throw solicitudInvalida(`La marca «${invalida.codigo}» no existe.`);
    await validarReferencias(cambios);
    await turnosRepository.aplicar(cambios);
  },

  /**
   * Llena el mes según el patrón semanal de cada agente.
   * Por defecto respeta lo que ya estaba marcado y nunca pisa una ausencia (F, V, DM, P)
   * registrada en otra sede ese mismo día. Todo se guarda en un solo lote.
   */
  async generar(clave: string, opciones: { sedeId?: number; sobrescribir: boolean }): Promise<{ marcados: number }> {
    const mes = parseMes(clave);
    if (opciones.sedeId !== undefined && !(await sedesRepository.buscar(opciones.sedeId))) throw notFound('La sede');
    const { dias, desde, hasta } = await rango(mes);
    const [categorias, existentes, vigentes] = await Promise.all([
      codigosService.categorias(),
      turnosRepository.delRango(desde, hasta),
      asignacionesRepository.vigentesEnMes(clave),
    ]);

    const ocupados = new Set(existentes.map((t) => claveTurno(t.agenteId, t.sedeId, t.fecha)));
    const ausentes = new Set(
      existentes.filter((t) => categorias.get(t.codigo) === 'AUSENCIA').map((t) => `${t.agenteId}:${t.fecha}`),
    );

    const cambios: CambioMarca[] = [];
    for (const a of vigentes.filter((x) => opciones.sedeId === undefined || x.sedeId === opciones.sedeId)) {
      for (const dia of dias) {
        const codigo = a.patron[dia.indiceSemana];
        if (!codigo) continue;
        if (ausentes.has(`${a.agenteId}:${dia.fecha}`)) continue;
        if (!opciones.sobrescribir && ocupados.has(claveTurno(a.agenteId, a.sedeId, dia.fecha))) continue;
        cambios.push({ agenteId: a.agenteId, sedeId: a.sedeId, fecha: dia.fecha, codigo });
      }
    }
    await turnosRepository.aplicar(cambios);
    return { marcados: cambios.length };
  },

  async limpiar(clave: string, sedeId?: number): Promise<{ borrados: number }> {
    if (sedeId !== undefined && !(await sedesRepository.buscar(sedeId))) throw notFound('La sede');
    const { desde, hasta } = await rango(parseMes(clave));
    return { borrados: await turnosRepository.borrarRango(desde, hasta, sedeId) };
  },

  async resumen(rol: RolMensual): Promise<ResumenAgente[]> {
    const categorias = await codigosService.categorias();
    const porAgente = new Map<number, ResumenAgente>();

    for (const sede of rol.sedes) {
      for (const fila of sede.filas) {
        const item =
          porAgente.get(fila.agenteId) ??
          { agenteId: fila.agenteId, nombres: fila.nombres, cargo: fila.cargo, sedes: [], conteos: {}, diasTrabajados: 0 };
        item.sedes.push(sede.nombreCorto);
        for (const codigo of fila.marcas) {
          if (!codigo) continue;
          item.conteos[codigo] = (item.conteos[codigo] ?? 0) + 1;
          const categoria = categorias.get(codigo);
          if (categoria === 'DIA' || categoria === 'NOCHE') item.diasTrabajados++;
        }
        porAgente.set(fila.agenteId, item);
      }
    }
    return [...porAgente.values()].sort((a, b) => a.nombres.localeCompare(b.nombres, 'es'));
  },

  /** Cuadro "Distribución de agentes": agentes fijos por sede y cargo según su turno habitual. */
  async distribucion(rol: RolMensual, turno: 'DIA' | 'NOCHE'): Promise<Distribucion> {
    const categorias = await codigosService.categorias();
    const totales = { ...cuentaCargos(), total: 0 };

    const sedes = rol.sedes.map((sede) => {
      const porCargo = cuentaCargos();
      for (const fila of sede.filas) {
        if (!fila.patron || !esPatronFijo(fila.patron, categorias)) continue;
        if (turnoPredominante(fila.patron, categorias) !== turno) continue;
        porCargo[fila.cargo]++;
        totales[fila.cargo]++;
      }
      const total = Object.values(porCargo).reduce((a, b) => a + b, 0);
      totales.total += total;
      return { sedeId: sede.id, nombre: sede.nombre, porCargo, total };
    });

    return { turno, sedes, totales };
  },
};

/**
 * Un día está completo cuando todos los que deben venir ese día (según su semana habitual)
 * ya tienen marca. Solo entonces tiene sentido avisar que falta personal.
 */
function diasCompletos(filas: FilaRol[], dias: DiaDelMes[]): boolean[] {
  return dias.map((dia, i) => {
    const esperados = filas.filter((f) => f.patron?.[dia.indiceSemana]);
    return esperados.length > 0 && esperados.every((f) => f.marcas[i] !== null);
  });
}

function totalesPorDia(
  filas: FilaRol[],
  cantidadDias: number,
  categorias: Map<string, CategoriaCodigo>,
  categoria: CategoriaCodigo,
): number[] {
  return Array.from({ length: cantidadDias }, (_, i) =>
    filas.reduce((n, fila) => {
      const codigo = fila.marcas[i];
      return codigo && categorias.get(codigo) === categoria ? n + 1 : n;
    }, 0),
  );
}

function detectarConflictos(
  turnos: Turno[],
  categorias: Map<string, CategoriaCodigo>,
  sedes: SedeRol[],
): Conflicto[] {
  const nombreSede = new Map(sedes.map((s) => [s.id, s.nombreCorto]));
  const nombreAgente = new Map(sedes.flatMap((s) => s.filas.map((f) => [f.agenteId, f.nombres] as const)));
  const grupos = new Map<string, Turno[]>();

  for (const t of turnos) {
    const categoria = categorias.get(t.codigo);
    if (categoria !== 'DIA' && categoria !== 'NOCHE') continue;
    const clave = `${t.agenteId}:${t.fecha}:${categoria}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), t]);
  }

  return [...grupos.values()]
    .filter((g) => g.length > 1)
    .map((g) => ({
      agenteId: g[0]!.agenteId,
      nombres: nombreAgente.get(g[0]!.agenteId) ?? '',
      fecha: g[0]!.fecha,
      sedes: g.map((t) => nombreSede.get(t.sedeId) ?? '?'),
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
