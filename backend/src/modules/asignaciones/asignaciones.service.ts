import type { PatronSemanal } from '../../shared/domain.js';
import { conflicto, notFound, solicitudInvalida } from '../../shared/errors.js';
import { agentesService } from '../agentes/agentes.service.js';
import { codigosService } from '../codigos/codigos.service.js';
import { sedesService } from '../sedes/sedes.service.js';
import { asignacionesRepository, type Asignacion } from './asignaciones.repository.js';

async function validarPatron(patron: PatronSemanal): Promise<void> {
  const validos = await codigosService.categorias();
  const invalido = patron.find((c) => c !== null && !validos.has(c));
  if (invalido) throw solicitudInvalida(`La marca «${invalido}» no existe.`);
}

async function existente(id: number): Promise<Asignacion> {
  const asignacion = await asignacionesRepository.buscar(id);
  if (!asignacion) throw notFound('La asignación');
  return asignacion;
}

export const asignacionesService = {
  delAgente: (agenteId: number, mes: string) => asignacionesRepository.delAgente(agenteId, mes),
  deSede: (sedeId: number, mes: string) => asignacionesRepository.vigentesEnSede(sedeId, mes),

  async crear(datos: { agenteId: number; sedeId: number; desde: string; patron: PatronSemanal }): Promise<Asignacion> {
    const agente = await agentesService.existente(datos.agenteId);
    if (!agente.activo) throw conflicto('Este agente está dado de baja. Reactívelo primero.');
    const sede = await sedesService.existente(datos.sedeId);
    if (!sede.activa) throw conflicto(`La sede «${sede.nombre}» está oculta. Muéstrela primero en Sedes.`);
    if (await asignacionesRepository.existeVigente(datos.agenteId, datos.sedeId, datos.desde)) {
      throw conflicto('Este agente ya está en esa sede.');
    }
    await validarPatron(datos.patron);
    const id = await asignacionesRepository.crear(datos.agenteId, datos.sedeId, datos.patron, datos.desde);
    return (await asignacionesRepository.buscar(id))!;
  },

  async cambiarPatron(id: number, patron: PatronSemanal): Promise<Asignacion> {
    await existente(id);
    await validarPatron(patron);
    await asignacionesRepository.actualizarPatron(id, patron);
    return (await asignacionesRepository.buscar(id))!;
  },

  /** Todas deben ser de la misma sede, para no mezclar el orden de sedes distintas. */
  async ordenar(ids: number[]): Promise<void> {
    if (new Set(ids).size !== ids.length) throw solicitudInvalida('La lista tiene agentes repetidos.');
    const asignaciones = await Promise.all(ids.map((id) => existente(id)));
    if (new Set(asignaciones.map((a) => a.sedeId)).size > 1) {
      throw solicitudInvalida('Solo se pueden ordenar agentes de una misma sede.');
    }
    await asignacionesRepository.ordenar(ids);
  },

  async retirar(id: number, desdeMes: string): Promise<void> {
    await existente(id);
    await asignacionesRepository.cerrar(id, desdeMes);
  },
};
