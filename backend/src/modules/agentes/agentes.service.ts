import { conflicto, notFound, solicitudInvalida } from '../../shared/errors.js';
import { asignacionesRepository } from '../asignaciones/asignaciones.repository.js';
import { agentesRepository, type Agente, type AgenteDatos } from './agentes.repository.js';
import { MAX_FOTO_BYTES } from './agentes.schemas.js';

/** Reconoce la imagen por sus primeros bytes, sin confiar en lo que declara el navegador. */
function tipoReal(datos: Buffer): string | null {
  if (datos[0] === 0xff && datos[1] === 0xd8 && datos[2] === 0xff) return 'image/jpeg';
  if (datos.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (datos.subarray(0, 4).toString('ascii') === 'RIFF' && datos.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

async function sinDuplicados(datos: AgenteDatos, exceptoId?: number): Promise<void> {
  const otro = await agentesRepository.buscarDuplicado(datos, exceptoId);
  if (!otro) return;
  throw conflicto(
    datos.dni && otro.dni === datos.dni
      ? `El DNI ${datos.dni} ya está registrado para ${otro.nombres}.`
      : `Ya hay un agente activo llamado ${otro.nombres}.`,
  );
}

export const agentesService = {
  listar: (mes: string, incluirInactivos: boolean) => agentesRepository.listar(mes, incluirInactivos),

  async existente(id: number): Promise<Agente> {
    const agente = await agentesRepository.buscar(id);
    if (!agente) throw notFound('El agente');
    return agente;
  },

  async crear(datos: AgenteDatos): Promise<Agente> {
    await sinDuplicados(datos);
    return (await agentesRepository.buscar(await agentesRepository.crear(datos)))!;
  },

  async actualizar(id: number, datos: AgenteDatos): Promise<Agente> {
    await this.existente(id);
    await sinDuplicados(datos, id);
    await agentesRepository.actualizar(id, datos);
    return (await agentesRepository.buscar(id))!;
  },

  /** Deja de aparecer desde el mes indicado; su historial se conserva. */
  async darDeBaja(id: number, desdeMes: string): Promise<Agente> {
    const agente = await this.existente(id);
    if (!agente.activo) throw conflicto('Este agente ya estaba dado de baja.');
    await asignacionesRepository.cerrarTodasDelAgente(id, desdeMes);
    await agentesRepository.cambiarEstado(id, false);
    return (await agentesRepository.buscar(id))!;
  },

  async reactivar(id: number): Promise<Agente> {
    const { nombres, cargo, dni, telefono } = await this.existente(id);
    await sinDuplicados({ nombres, cargo, dni, telefono }, id);
    await agentesRepository.cambiarEstado(id, true);
    return (await agentesRepository.buscar(id))!;
  },

  async foto(id: number) {
    const foto = await agentesRepository.foto(id);
    if (!foto) throw notFound('La foto');
    return foto;
  },

  async guardarFoto(id: number, datos: unknown): Promise<Agente> {
    await this.existente(id);
    if (!Buffer.isBuffer(datos) || datos.length === 0) throw solicitudInvalida('No llegó ninguna foto.');
    if (datos.length > MAX_FOTO_BYTES) throw solicitudInvalida('La foto pesa demasiado (máximo 2 MB).');
    const tipo = tipoReal(datos);
    if (!tipo) throw solicitudInvalida('El archivo no es una foto JPG, PNG o WEBP.');
    await agentesRepository.guardarFoto(id, { tipo, datos });
    return (await agentesRepository.buscar(id))!;
  },

  async quitarFoto(id: number): Promise<Agente> {
    await this.existente(id);
    await agentesRepository.quitarFoto(id);
    return (await agentesRepository.buscar(id))!;
  },
};
