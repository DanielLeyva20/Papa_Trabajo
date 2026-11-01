import { conflicto, notFound, solicitudInvalida } from '../../shared/errors.js';
import { sedesRepository, type Sede, type SedeDatos } from './sedes.repository.js';

async function sinDuplicados(datos: SedeDatos, exceptoId?: number): Promise<void> {
  const otra = await sedesRepository.buscarDuplicada(datos.nombre, datos.nombreCorto, exceptoId);
  if (!otra) return;
  throw conflicto(
    otra.nombre.toLowerCase() === datos.nombre.toLowerCase()
      ? `Ya existe una sede llamada «${otra.nombre}».`
      : `El nombre corto «${datos.nombreCorto}» ya lo usa «${otra.nombre}».`,
  );
}

export const sedesService = {
  listar: (soloActivas: boolean) => sedesRepository.listar(soloActivas),

  async existente(id: number): Promise<Sede> {
    const sede = await sedesRepository.buscar(id);
    if (!sede) throw notFound('La sede');
    return sede;
  },

  async crear(datos: SedeDatos): Promise<Sede> {
    await sinDuplicados(datos);
    return (await sedesRepository.buscar(await sedesRepository.crear(datos)))!;
  },

  async actualizar(id: number, datos: SedeDatos): Promise<Sede> {
    await this.existente(id);
    await sinDuplicados(datos, id);
    await sedesRepository.actualizar(id, datos);
    return (await sedesRepository.buscar(id))!;
  },

  /** El nuevo orden debe incluir exactamente las sedes que existen, sin repetir. */
  async ordenar(ids: number[]): Promise<Sede[]> {
    const actuales = await sedesRepository.listar(false);
    const mismas = ids.length === actuales.length && new Set(ids).size === ids.length && actuales.every((s) => ids.includes(s.id));
    if (!mismas) throw solicitudInvalida('La lista de sedes cambió. Recargue la página e intente de nuevo.');
    await sedesRepository.ordenar(ids);
    return sedesRepository.listar(false);
  },
};
