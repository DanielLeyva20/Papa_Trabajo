import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AgentesApi, AsignacionesApi, SedesApi, type AgenteDatos } from '../../core/api/api';
import { esDescansero, type Agente, type Asignacion, type Cargo, type PatronSemanal, type Sede } from '../../core/models/dominio';
import { Avisos } from '../../core/services/avisos';
import { IndicadorGuardado } from '../../core/services/estado-guardado';
import { prepararFoto } from '../../core/services/imagen';
import { MesSeleccionado } from '../../core/services/mes-seleccionado';

/** Semana inicial al asignar un agente a una sede. */
export function patronInicial(cargo: Cargo): PatronSemanal {
  // Los descanseros solo cubren días sueltos: su semana se arma tocando los días que cubren.
  if (esDescansero(cargo)) return [null, null, null, null, null, null, null];
  return ['D', 'D', 'D', 'D', 'D', 'D', 'L'];
}

@Injectable()
export class PersonalStore {
  private readonly agentesApi = inject(AgentesApi);
  private readonly asignacionesApi = inject(AsignacionesApi);
  private readonly sedesApi = inject(SedesApi);
  private readonly avisos = inject(Avisos);
  private readonly indicador = inject(IndicadorGuardado);
  readonly mes = inject(MesSeleccionado);

  readonly agentes = signal<Agente[]>([]);
  readonly sedes = signal<Sede[]>([]);
  readonly cargando = signal(true);
  readonly busqueda = signal('');
  readonly verBajas = signal(false);

  /** null = nada abierto; 'nuevo' = formulario vacío. */
  readonly seleccion = signal<number | 'nuevo' | null>(null);
  readonly asignaciones = signal<Asignacion[]>([]);

  readonly subiendoFoto = signal(false);
  readonly guardando = signal(false);
  /** Campo que el servidor rechazó (p. ej. DNI repetido), para marcarlo en el formulario. */
  readonly errorCampo = signal<{ campo: string; mensaje: string } | null>(null);
  /** Foto elegida para un agente que todavía no se guarda; se sube al crearlo. */
  readonly fotoNueva = signal<{ blob: Blob; url: string } | null>(null);

  readonly agenteSeleccionado = computed(() => {
    const id = this.seleccion();
    return typeof id === 'number' ? (this.agentes().find((a) => a.id === id) ?? null) : null;
  });

  readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toUpperCase();
    return this.agentes().filter(
      (a) => (this.verBajas() || a.activo) && (!texto || a.nombres.includes(texto) || a.sedes.join(' ').toUpperCase().includes(texto)),
    );
  });

  readonly sedesDisponibles = computed(() => {
    const ocupadas = new Set(this.asignaciones().map((a) => a.sedeId));
    return this.sedes().filter((s) => s.activa && !ocupadas.has(s.id));
  });

  private readonly patronesPendientes = new Map<number, ReturnType<typeof setTimeout>>();

  constructor() {
    this.sedesApi.listar().subscribe((sedes) => this.sedes.set(sedes));
    effect(() => {
      const mes = this.mes.mes();
      untracked(() => {
        this.cargarAgentes(mes);
        const id = this.seleccion();
        if (typeof id === 'number') this.cargarAsignaciones(id);
      });
    });
  }

  cargarAgentes(mes = this.mes.mes()): void {
    this.agentesApi.listar(mes, true).subscribe({
      next: (agentes) => {
        this.agentes.set(agentes);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  seleccionar(id: number | 'nuevo' | null): void {
    this.seleccion.set(id);
    this.asignaciones.set([]);
    this.descartarFotoNueva();
    if (typeof id === 'number') this.cargarAsignaciones(id);
  }

  guardarAgente(datos: AgenteDatos): void {
    const id = this.seleccion();
    const peticion = typeof id === 'number' ? this.agentesApi.actualizar(id, datos) : this.agentesApi.crear(datos);
    this.guardando.set(true);
    this.errorCampo.set(null);
    peticion.subscribe({
      next: (agente) => {
        this.guardando.set(false);
        this.avisos.exito(typeof id === 'number' ? 'Datos del agente guardados.' : `${agente.nombres} fue agregado. Ahora asígnelo a una sede.`);
        const foto = this.fotoNueva()?.blob;
        this.seleccionar(agente.id);
        if (foto) this.subir(agente.id, foto);
        else this.cargarAgentes();
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        // Si el servidor dice qué campo falló (p. ej. DNI repetido), se marca ese campo.
        const cuerpo = error instanceof HttpErrorResponse ? error.error : null;
        if (cuerpo?.campo) this.errorCampo.set({ campo: cuerpo.campo, mensaje: cuerpo.mensaje });
        else if (cuerpo?.mensaje?.includes('DNI')) this.errorCampo.set({ campo: 'dni', mensaje: cuerpo.mensaje });
        else if (cuerpo?.mensaje?.includes('agente activo llamado')) this.errorCampo.set({ campo: 'nombres', mensaje: cuerpo.mensaje });
      },
    });
  }

  /** Recibe la foto elegida, la prepara y la guarda (o la deja lista si el agente aún es nuevo). */
  async cambiarFoto(archivo: File): Promise<void> {
    let blob: Blob;
    try {
      blob = await prepararFoto(archivo);
    } catch (error) {
      this.avisos.error(error instanceof Error ? error.message : 'No se pudo usar esa foto.');
      return;
    }
    const id = this.seleccion();
    if (typeof id === 'number') {
      this.subir(id, blob);
      return;
    }
    this.descartarFotoNueva();
    this.fotoNueva.set({ blob, url: URL.createObjectURL(blob) });
  }

  quitarFoto(): void {
    const id = this.seleccion();
    if (typeof id !== 'number') {
      this.descartarFotoNueva();
      return;
    }
    this.agentesApi.quitarFoto(id).subscribe((agente) => {
      this.actualizarEnLista(agente);
      this.avisos.info('Foto quitada.');
    });
  }

  private subir(id: number, blob: Blob): void {
    this.subiendoFoto.set(true);
    this.agentesApi.subirFoto(id, blob).subscribe({
      next: (agente) => {
        this.subiendoFoto.set(false);
        this.cargarAgentes();
        this.actualizarEnLista(agente);
        this.avisos.exito(`Foto de ${agente.nombres} guardada.`);
      },
      error: () => this.subiendoFoto.set(false),
    });
  }

  private actualizarEnLista(agente: Agente): void {
    this.agentes.update((lista) =>
      lista.map((a) => (a.id === agente.id ? { ...a, fotoVersion: agente.fotoVersion } : a)),
    );
  }

  private descartarFotoNueva(): void {
    const actual = this.fotoNueva();
    if (actual) URL.revokeObjectURL(actual.url);
    this.fotoNueva.set(null);
  }

  darDeBaja(id: number): void {
    this.agentesApi.darDeBaja(id, this.mes.mes()).subscribe((agente) => {
      this.avisos.info(`${agente.nombres} ya no aparecerá desde ${this.mes.nombre()}. Su historial se conserva.`);
      this.cargarAgentes();
      this.cargarAsignaciones(id);
    });
  }

  reactivar(id: number): void {
    this.agentesApi.reactivar(id).subscribe(() => {
      this.avisos.exito('Agente reactivado. Asígnelo a una sede para que aparezca en el rol.');
      this.cargarAgentes();
    });
  }

  asignar(sedeId: number, cargo: Cargo): void {
    const agenteId = this.seleccion();
    if (typeof agenteId !== 'number') return;
    this.asignacionesApi
      .crear({ agenteId, sedeId, desde: this.mes.mes(), patron: patronInicial(cargo) })
      .subscribe(() => {
        this.cargarAsignaciones(agenteId);
        this.cargarAgentes();
      });
  }

  /** Cambia la semana al instante y la guarda poco después (varios toques = un solo guardado). */
  cambiarPatron(asignacionId: number, patron: PatronSemanal): void {
    this.asignaciones.update((lista) => lista.map((a) => (a.id === asignacionId ? { ...a, patron } : a)));
    clearTimeout(this.patronesPendientes.get(asignacionId));
    this.indicador.guardando();
    this.patronesPendientes.set(
      asignacionId,
      setTimeout(() => {
        this.patronesPendientes.delete(asignacionId);
        this.asignacionesApi.cambiarPatron(asignacionId, patron).subscribe({
          next: () => this.indicador.guardado(),
          error: () => this.indicador.fallo(),
        });
      }, 600),
    );
  }

  retirar(asignacion: Asignacion): void {
    this.asignacionesApi.retirar(asignacion.id, this.mes.mes()).subscribe(() => {
      this.avisos.info(`Retirado de esa sede desde ${this.mes.nombre()}.`);
      this.cargarAsignaciones(asignacion.agenteId);
      this.cargarAgentes();
    });
  }

  private cargarAsignaciones(agenteId: number): void {
    this.asignacionesApi.delAgente(agenteId, this.mes.mes()).subscribe((lista) => this.asignaciones.set(lista));
  }
}
