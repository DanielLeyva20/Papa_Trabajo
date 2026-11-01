import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { RolApi } from '../../core/api/api';
import type {
  CambioMarca,
  CategoriaCodigo,
  DiaDelMes,
  FilaRol,
  RolMensual,
  SedeRol,
  Turno,
  VistaTurno,
} from '../../core/models/dominio';
import { Avisos } from '../../core/services/avisos';
import { Catalogo } from '../../core/services/catalogo';
import { ESPERA_AUTOGUARDADO_MS, IndicadorGuardado } from '../../core/services/estado-guardado';
import { MesSeleccionado } from '../../core/services/mes-seleccionado';

export interface Celda {
  sedeId: number;
  agenteId: number;
  dia: number; // índice 0 = día 1
}

export interface TotalesSede {
  dia: number[];
  noche: number[];
  conNoche: boolean;
  /** completos[i]: todos los que debían venir ese día ya tienen marca. */
  completos: boolean[];
}

/** Agentes marcados de turno en dos sedes el mismo día → clave `agenteId:índiceDía`. */
export type MapaConflictos = Map<string, string[]>;

const MAX_HISTORIAL = 50;
const CLAVE_SEDE = 'rol-turnos:sede';
const CLAVE_VISTA = 'rol-turnos:vista';
const VISTAS: readonly VistaTurno[] = ['juntos', 'separados', 'dia', 'noche'];

/** Un cuadro de la pantalla: una sede entera, o solo su turno de día o de noche. */
export interface BloqueRol {
  clave: string;
  sede: SedeRol;
  /** null = día y noche en el mismo cuadro. */
  turno: Turno | null;
  totales: TotalesSede;
}

/** Cuenta cuántos hay de día y de noche cada día, y qué días ya están completos. */
export function calcularTotales(filas: FilaRol[], dias: DiaDelMes[], categorias: Map<string, CategoriaCodigo>): TotalesSede {
  const dia = dias.map(() => 0);
  const noche = dias.map(() => 0);
  let conNoche = false;
  for (const fila of filas) {
    if (fila.turno === 'NOCHE' || fila.patron?.some((c) => c && categorias.get(c) === 'NOCHE')) conNoche = true;
    fila.marcas.forEach((codigo, i) => {
      const categoria = codigo ? categorias.get(codigo) : undefined;
      if (categoria === 'DIA') dia[i]!++;
      if (categoria === 'NOCHE') {
        noche[i]!++;
        conNoche = true;
      }
    });
  }
  // Un día solo se juzga cuando está completo: así no se pinta de rojo lo que aún no se llenó.
  const completos = dias.map((d, i) => {
    const esperados = filas.filter((f) => f.patron?.[d.indiceSemana]);
    return esperados.length > 0 && esperados.every((f) => f.marcas[i] !== null);
  });
  return { dia, noche, conNoche, completos };
}

function guardar(clave: string, valor: string): void {
  try {
    sessionStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento */
  }
}

function leerVista(): VistaTurno {
  try {
    const guardada = sessionStorage.getItem(CLAVE_VISTA) as VistaTurno | null;
    if (guardada && VISTAS.includes(guardada)) return guardada;
  } catch {
    /* sin almacenamiento */
  }
  return 'juntos';
}

const claveCambio = (c: CambioMarca) => `${c.agenteId}:${c.sedeId}:${c.fecha}`;

/**
 * Estado de la pantalla Rol del mes.
 * Las marcas se aplican al instante en pantalla y se guardan por lotes en segundo plano.
 */
@Injectable()
export class RolStore {
  private readonly api = inject(RolApi);
  private readonly catalogo = inject(Catalogo);
  private readonly indicador = inject(IndicadorGuardado);
  private readonly avisos = inject(Avisos);
  readonly mesSeleccionado = inject(MesSeleccionado);

  readonly rol = signal<RolMensual | null>(null);
  readonly cargando = signal(true);
  readonly fallo = signal(false);
  readonly sedeActiva = signal<number | 'todas'>(this.leerSede());
  readonly vista = signal<VistaTurno>(leerVista());
  /** Marca que se aplica al hacer clic; null = borrador. */
  readonly sello = signal<string | null>('D');

  private readonly historial = signal<CambioMarca[][]>([]);
  readonly puedeDeshacer = computed(() => this.historial().length > 0);

  private pendientes = new Map<string, CambioMarca>();
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private grupoActual: number | null = null;

  readonly sedesVisibles = computed<SedeRol[]>(() => {
    const rol = this.rol();
    if (!rol) return [];
    const activa = this.sedeActiva();
    if (activa === 'todas') return rol.sedes;
    return rol.sedes.filter((s) => s.id === activa);
  });

  readonly totales = computed(() => {
    const rol = this.rol();
    const mapa = new Map<number, TotalesSede>();
    if (!rol) return mapa;
    for (const sede of rol.sedes) mapa.set(sede.id, calcularTotales(sede.filas, rol.dias, this.catalogo.categorias()));
    return mapa;
  });

  /** Cuadros que se ven, según la sede elegida y la vista de turnos (juntos, separados, solo día o solo noche). */
  readonly bloques = computed<BloqueRol[]>(() => {
    const rol = this.rol();
    if (!rol) return [];
    const vista = this.vista();
    const categorias = this.catalogo.categorias();
    const bloque = (sede: SedeRol, turno: Turno | null, filas = sede.filas): BloqueRol => ({
      clave: `${sede.id}:${turno ?? 'todos'}`,
      sede: filas === sede.filas ? sede : { ...sede, filas },
      turno,
      totales: turno === null ? this.totales().get(sede.id)! : calcularTotales(filas, rol.dias, categorias),
    });
    return this.sedesVisibles().flatMap((sede) => {
      const deDia = sede.filas.filter((f) => f.turno === 'DIA');
      const deNoche = sede.filas.filter((f) => f.turno === 'NOCHE');
      switch (vista) {
        case 'juntos':
          return [bloque(sede, null, deNoche.length && deDia.length ? [...deDia, ...deNoche] : sede.filas)];
        case 'separados':
          // Una sede sin agentes igual muestra su cuadro (con el aviso para agregarlos).
          return [
            ...(deDia.length || !deNoche.length ? [bloque(sede, 'DIA', deDia)] : []),
            ...(deNoche.length ? [bloque(sede, 'NOCHE', deNoche)] : []),
          ];
        case 'dia':
          return deDia.length ? [bloque(sede, 'DIA', deDia)] : [];
        case 'noche':
          return deNoche.length ? [bloque(sede, 'NOCHE', deNoche)] : [];
      }
    });
  });

  /** Cuántos agentes de día y de noche hay en las sedes que se ven. */
  readonly conteoTurnos = computed(() => {
    const filas = this.sedesVisibles().flatMap((s) => s.filas);
    const dia = filas.filter((f) => f.turno === 'DIA').length;
    return { dia, noche: filas.length - dia };
  });

  readonly conflictos = computed<MapaConflictos>(() => {
    const rol = this.rol();
    const categorias = this.catalogo.categorias();
    const vistos = new Map<string, string[]>();
    if (!rol) return vistos;
    for (const sede of rol.sedes) {
      for (const fila of sede.filas) {
        fila.marcas.forEach((codigo, i) => {
          const categoria = codigo ? categorias.get(codigo) : undefined;
          if (categoria !== 'DIA' && categoria !== 'NOCHE') return;
          const clave = `${fila.agenteId}:${i}`;
          vistos.set(clave, [...(vistos.get(clave) ?? []), sede.nombreCorto]);
        });
      }
    }
    return new Map([...vistos].filter(([, sedes]) => sedes.length > 1));
  });

  /** Lista legible de conflictos para el aviso superior. */
  readonly listaConflictos = computed(() => {
    const rol = this.rol();
    if (!rol) return [];
    const nombres = new Map(rol.sedes.flatMap((s) => s.filas.map((f) => [f.agenteId, f.nombres] as const)));
    return [...this.conflictos()].map(([clave, sedes]) => {
      const [agenteId, dia] = clave.split(':').map(Number) as [number, number];
      return { nombres: nombres.get(agenteId) ?? '', dia: dia + 1, sedes };
    });
  });

  /** Sedes con algún día ya completo que quedó por debajo de su mínimo de agentes de día. */
  readonly sedesConHuecos = computed(() => {
    const rol = this.rol();
    const huecos = new Set<number>();
    if (!rol) return huecos;
    for (const sede of rol.sedes) {
      const t = this.totales().get(sede.id);
      if (t?.dia.some((n, i) => t.completos[i] && n < sede.minimoDia)) huecos.add(sede.id);
    }
    return huecos;
  });

  /** true durante la animación de "ola" que sigue a Llenar mes automático. */
  readonly oleada = signal(false);

  /** Feriados del mes (nacionales y locales). */
  readonly feriados = computed(() => (this.rol()?.dias ?? []).filter((d) => d.feriado));

  readonly mesVacio = computed(() => {
    const rol = this.rol();
    return !!rol && rol.sedes.every((s) => s.filas.every((f) => f.marcas.every((m) => m === null)));
  });

  constructor() {
    effect(() => {
      const mes = this.mesSeleccionado.mes();
      untracked(() => this.cargar(mes));
    });

    const alSalir = () => this.guardarAhora();
    window.addEventListener('beforeunload', alSalir);
    const quitarGuardador = this.indicador.registrar(() => this.guardarAhora());
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('beforeunload', alSalir);
      quitarGuardador();
      this.guardarAhora();
    });
  }

  cargar(mes = this.mesSeleccionado.mes()): void {
    this.guardarAhora();
    this.cargando.set(true);
    this.fallo.set(false);
    if (this.catalogo.codigos().length === 0) this.catalogo.cargar();
    this.api.obtener(mes).subscribe({
      next: (rol) => {
        this.rol.set(rol);
        this.historial.set([]);
        const activa = this.sedeActiva();
        if (activa !== 'todas' && !rol.sedes.some((s) => s.id === activa)) {
          this.elegirSede(rol.sedes[0]?.id ?? 'todas');
        }
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.fallo.set(true);
      },
    });
  }

  elegirSede(sede: number | 'todas'): void {
    this.sedeActiva.set(sede);
    guardar(CLAVE_SEDE, String(sede));
  }

  elegirVista(vista: VistaTurno): void {
    this.vista.set(vista);
    guardar(CLAVE_VISTA, vista);
  }

  /** Abre un grupo: todo lo marcado hasta `cerrarGrupo` se deshace de una sola vez (p. ej. un arrastre). */
  abrirGrupo(): void {
    this.grupoActual = Date.now();
    this.historial.update((h) => [...h, []].slice(-MAX_HISTORIAL));
  }

  cerrarGrupo(): void {
    this.grupoActual = null;
    this.historial.update((h) => (h.at(-1)?.length === 0 ? h.slice(0, -1) : h));
  }

  marcar(celdas: Celda[], codigo: string | null): void {
    const rol = this.rol();
    if (!rol || celdas.length === 0) return;

    const anteriores: CambioMarca[] = [];
    const nuevos: CambioMarca[] = [];
    for (const celda of celdas) {
      const fila = rol.sedes.find((s) => s.id === celda.sedeId)?.filas.find((f) => f.agenteId === celda.agenteId);
      const actual = fila?.marcas[celda.dia] ?? null;
      if (!fila || actual === codigo) continue;
      const fecha = rol.dias[celda.dia]!.fecha;
      anteriores.push({ agenteId: celda.agenteId, sedeId: celda.sedeId, fecha, codigo: actual });
      nuevos.push({ agenteId: celda.agenteId, sedeId: celda.sedeId, fecha, codigo });
    }
    if (nuevos.length === 0) return;

    this.aplicar(nuevos);
    if (this.grupoActual !== null) {
      this.historial.update((h) => [...h.slice(0, -1), [...(h.at(-1) ?? []), ...anteriores]]);
    } else {
      this.historial.update((h) => [...h, anteriores].slice(-MAX_HISTORIAL));
    }
  }

  deshacer(): void {
    const ultimo = this.historial().at(-1);
    if (!ultimo) return;
    this.historial.update((h) => h.slice(0, -1));
    this.aplicar([...ultimo].reverse());
  }

  generar(opciones: { sedeId?: number; sobrescribir: boolean }): void {
    this.guardarAhora();
    this.api.generar(this.mesSeleccionado.mes(), opciones).subscribe(({ marcados }) => {
      this.avisos.exito(
        marcados > 0
          ? `Listo: se marcaron ${marcados} casilleros según el patrón de cada agente.`
          : 'No había casilleros por llenar: el mes ya estaba completo.',
      );
      if (marcados > 0) {
        this.oleada.set(true);
        setTimeout(() => this.oleada.set(false), 1800);
      }
      this.cargar();
    });
  }

  limpiar(sedeId?: number): void {
    this.guardarAhora();
    this.api.limpiar(this.mesSeleccionado.mes(), sedeId).subscribe(({ borrados }) => {
      this.avisos.info(`Se borraron ${borrados} marcas.`);
      this.cargar();
    });
  }

  /** Envía de inmediato lo pendiente (al cambiar de mes, de pantalla o cerrar). */
  guardarAhora(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    if (this.pendientes.size === 0) return;

    const lote = [...this.pendientes.values()];
    this.pendientes.clear();
    this.indicador.guardando();
    this.api.guardarMarcas(lote).subscribe({
      next: () => {
        this.indicador.guardado();
        if (this.pendientes.size > 0) this.indicador.pendiente(); // se marcó algo más mientras se enviaba
      },
      error: () => {
        // Se conservan para reintentar sin perder lo marcado.
        for (const c of lote) if (!this.pendientes.has(claveCambio(c))) this.pendientes.set(claveCambio(c), c);
        this.indicador.fallo();
        this.avisos.error('No se pudieron guardar los últimos cambios.', {
          texto: 'Reintentar',
          ejecutar: () => this.guardarAhora(),
        });
      },
    });
  }

  private aplicar(cambios: CambioMarca[]): void {
    this.rol.update((rol) => {
      if (!rol) return rol;
      const indiceDia = new Map(rol.dias.map((d, i) => [d.fecha, i]));
      const sedes = rol.sedes.map((sede) => {
        const propios = cambios.filter((c) => c.sedeId === sede.id);
        if (propios.length === 0) return sede;
        return {
          ...sede,
          filas: sede.filas.map((fila) => {
            const deFila = propios.filter((c) => c.agenteId === fila.agenteId);
            if (deFila.length === 0) return fila;
            const marcas = [...fila.marcas];
            for (const c of deFila) marcas[indiceDia.get(c.fecha)!] = c.codigo;
            return { ...fila, marcas };
          }),
        };
      });
      return { ...rol, sedes };
    });

    for (const c of cambios) this.pendientes.set(claveCambio(c), c);
    this.indicador.pendiente();
    // Guardado automático de respaldo: si no se pulsa «Guardar cambios», se envía solo al dejar de marcar.
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.guardarAhora(), ESPERA_AUTOGUARDADO_MS);
  }

  private leerSede(): number | 'todas' {
    try {
      const guardada = sessionStorage.getItem(CLAVE_SEDE);
      if (guardada === 'todas') return 'todas';
      if (guardada && Number(guardada) > 0) return Number(guardada);
    } catch {
      /* sin almacenamiento */
    }
    return 'todas';
  }
}
