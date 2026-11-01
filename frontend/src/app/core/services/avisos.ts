import { Injectable, signal } from '@angular/core';

export type TipoAviso = 'exito' | 'error' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  mensaje: string;
  accion?: { texto: string; ejecutar: () => void };
}

/** Avisos breves en la esquina inferior (guardado, errores, descargas). */
@Injectable({ providedIn: 'root' })
export class Avisos {
  private siguienteId = 1;
  readonly lista = signal<Aviso[]>([]);

  exito(mensaje: string, accion?: Aviso['accion']): void {
    this.mostrar({ tipo: 'exito', mensaje, accion }, 4000);
  }

  info(mensaje: string): void {
    this.mostrar({ tipo: 'info', mensaje }, 4000);
  }

  /** Los errores duran más: el usuario debe alcanzar a leerlos. */
  error(mensaje: string, accion?: Aviso['accion']): void {
    this.mostrar({ tipo: 'error', mensaje, accion }, 9000);
  }

  cerrar(id: number): void {
    this.lista.update((avisos) => avisos.filter((a) => a.id !== id));
  }

  private mostrar(aviso: Omit<Aviso, 'id'>, duracion: number): void {
    // Varias peticiones fallando a la vez no deben apilar el mismo aviso.
    if (this.lista().some((a) => a.mensaje === aviso.mensaje)) return;
    const id = this.siguienteId++;
    this.lista.update((avisos) => [...avisos.slice(-2), { ...aviso, id }]);
    setTimeout(() => this.cerrar(id), duracion);
  }
}
