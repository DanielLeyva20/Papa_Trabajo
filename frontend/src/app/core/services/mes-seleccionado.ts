import { Injectable, computed, signal } from '@angular/core';
import { desplazarMes, mesActual, nombreMes } from './calendario';

const CLAVE = 'rol-turnos:mes';

/** Mes con el que se está trabajando; se comparte entre todas las pantallas. */
@Injectable({ providedIn: 'root' })
export class MesSeleccionado {
  private readonly _mes = signal(this.leerGuardado());

  readonly mes = this._mes.asReadonly();
  readonly nombre = computed(() => nombreMes(this._mes()));
  readonly esActual = computed(() => this._mes() === mesActual());

  /** -1 al pasar a un mes anterior, 1 al siguiente: orienta la animación de la hoja. */
  readonly direccion = signal<-1 | 0 | 1>(0);

  irA(mes: string): void {
    if (mes === this._mes()) return;
    this.direccion.set(mes > this._mes() ? 1 : -1);
    this._mes.set(mes);
    try {
      sessionStorage.setItem(CLAVE, mes);
    } catch {
      /* almacenamiento no disponible: no pasa nada */
    }
  }

  anterior(): void {
    this.irA(desplazarMes(this._mes(), -1));
  }

  siguiente(): void {
    this.irA(desplazarMes(this._mes(), 1));
  }

  hoy(): void {
    this.irA(mesActual());
  }

  private leerGuardado(): string {
    try {
      const guardado = sessionStorage.getItem(CLAVE);
      if (guardado && /^\d{4}-\d{2}$/.test(guardado)) return guardado;
    } catch {
      /* sin almacenamiento */
    }
    return mesActual();
  }
}
