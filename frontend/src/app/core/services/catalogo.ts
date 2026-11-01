import { Injectable, computed, inject, signal } from '@angular/core';
import { CatalogoApi } from '../api/api';
import type { CategoriaCodigo, CodigoTurno } from '../models/dominio';

/** Marcas de turno disponibles; se cargan una vez y se comparten. */
@Injectable({ providedIn: 'root' })
export class Catalogo {
  private readonly api = inject(CatalogoApi);

  readonly codigos = signal<CodigoTurno[]>([]);

  readonly porCodigo = computed(() => new Map(this.codigos().map((c) => [c.codigo, c])));
  readonly porTecla = computed(() => new Map(this.codigos().map((c) => [c.tecla.toUpperCase(), c])));
  readonly categorias = computed(
    () => new Map<string, CategoriaCodigo>(this.codigos().map((c) => [c.codigo, c.categoria])),
  );

  constructor() {
    this.cargar();
  }

  /** Vuelve a pedir las marcas (p. ej. si el servidor no estaba listo al abrir). */
  cargar(): void {
    this.api.codigos().subscribe({
      next: (codigos) => this.codigos.set(codigos),
      error: () => {
        /* el aviso ya lo muestra el interceptor */
      },
    });
  }
}
