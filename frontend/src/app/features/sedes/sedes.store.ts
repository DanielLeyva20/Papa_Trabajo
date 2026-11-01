import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { AsignacionesApi, CatalogoApi, SedesApi } from '../../core/api/api';
import type { Asignacion, Configuracion, Sede } from '../../core/models/dominio';
import { Avisos } from '../../core/services/avisos';
import { MesSeleccionado } from '../../core/services/mes-seleccionado';

@Injectable()
export class SedesStore {
  private readonly sedesApi = inject(SedesApi);
  private readonly asignacionesApi = inject(AsignacionesApi);
  private readonly catalogoApi = inject(CatalogoApi);
  private readonly avisos = inject(Avisos);
  readonly mes = inject(MesSeleccionado);

  readonly sedes = signal<Sede[]>([]);
  readonly abierta = signal<number | null>(null);
  readonly agentes = signal<Asignacion[]>([]);
  readonly configuracion = signal<Configuracion | null>(null);

  constructor() {
    this.cargar();
    this.catalogoApi.configuracion().subscribe((c) => this.configuracion.set(c));
    effect(() => {
      this.mes.mes();
      untracked(() => {
        const id = this.abierta();
        if (id) this.cargarAgentes(id);
      });
    });
  }

  cargar(): void {
    this.sedesApi.listar(true).subscribe((sedes) => this.sedes.set(sedes));
  }

  crear(nombre: string, nombreCorto: string): void {
    this.sedesApi.crear({ nombre, nombreCorto, activa: true, minimoDia: 1 }).subscribe((sede) => {
      this.avisos.exito(`Sede "${sede.nombre}" agregada. Ahora asigne agentes desde Personal.`);
      this.cargar();
    });
  }

  actualizar(sede: Sede, cambios: Partial<Pick<Sede, 'nombre' | 'nombreCorto' | 'activa' | 'minimoDia'>>): void {
    const datos = {
      nombre: sede.nombre,
      nombreCorto: sede.nombreCorto,
      activa: sede.activa,
      minimoDia: sede.minimoDia,
      ...cambios,
    };
    this.sedesApi.actualizar(sede.id, datos).subscribe(() => {
      this.avisos.exito('Sede guardada.');
      this.cargar();
    });
  }

  /** Sube o baja el mínimo al instante; se guarda poco después. */
  cambiarMinimo(sede: Sede, delta: -1 | 1): void {
    const minimoDia = Math.max(0, sede.minimoDia + delta);
    this.sedes.update((lista) => lista.map((s) => (s.id === sede.id ? { ...s, minimoDia } : s)));
    clearTimeout(this.minimoPendiente);
    this.minimoPendiente = setTimeout(() => {
      const actual = this.sedes().find((s) => s.id === sede.id);
      if (actual) this.sedesApi.actualizar(actual.id, actual).subscribe();
    }, 500);
  }

  private minimoPendiente?: ReturnType<typeof setTimeout>;

  mover(indice: number, delta: -1 | 1): void {
    const lista = [...this.sedes()];
    const destino = indice + delta;
    if (destino < 0 || destino >= lista.length) return;
    [lista[indice], lista[destino]] = [lista[destino]!, lista[indice]!];
    this.sedes.set(lista);
    this.sedesApi.ordenar(lista.map((s) => s.id)).subscribe();
  }

  alternar(id: number): void {
    const nueva = this.abierta() === id ? null : id;
    this.abierta.set(nueva);
    this.agentes.set([]);
    if (nueva) this.cargarAgentes(nueva);
  }

  moverAgente(indice: number, delta: -1 | 1): void {
    const lista = [...this.agentes()];
    const destino = indice + delta;
    if (destino < 0 || destino >= lista.length) return;
    [lista[indice], lista[destino]] = [lista[destino]!, lista[indice]!];
    this.agentes.set(lista);
    this.asignacionesApi.ordenar(lista.map((a) => a.id)).subscribe();
  }

  guardarConfiguracion(datos: Configuracion): void {
    this.catalogoApi.guardarConfiguracion(datos).subscribe((c) => {
      this.configuracion.set(c);
      this.avisos.exito('Encabezado de los documentos guardado.');
    });
  }

  private cargarAgentes(sedeId: number): void {
    this.asignacionesApi.deSede(sedeId, this.mes.mes()).subscribe((lista) => this.agentes.set(lista));
  }
}
