import { Injectable, signal } from '@angular/core';

export type EstadoGuardado = 'listo' | 'guardando' | 'error';

/** Estado del guardado automático, visible en la cabecera de todas las pantallas. */
@Injectable({ providedIn: 'root' })
export class IndicadorGuardado {
  readonly estado = signal<EstadoGuardado>('listo');
  readonly ultimaVez = signal<Date | null>(null);

  guardando(): void {
    this.estado.set('guardando');
  }

  guardado(): void {
    this.estado.set('listo');
    this.ultimaVez.set(new Date());
  }

  fallo(): void {
    this.estado.set('error');
  }
}
