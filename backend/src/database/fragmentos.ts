import { cargoBase, esDescansero, type Cargo } from '../shared/domain.js';

/**
 * Fragmentos SQL compartidos entre repositorios.
 *
 * En la base el cargo se guarda en dos columnas (`cargo` base + `descansero` 0/1);
 * la app trabaja con el cargo completo (p. ej. `SIMPLE_DESC`). Estas piezas hacen la conversión.
 */

/** Cargo completo desde la tabla `agentes` con alias `a`. */
export const CARGO_SQL = "CASE WHEN a.descansero = 1 THEN a.cargo || '_DESC' ELSE a.cargo END";

/** Columnas a guardar a partir del cargo completo. */
export const columnasCargo = (cargo: Cargo) => ({ base: cargoBase(cargo), descansero: esDescansero(cargo) ? 1 : 0 });
