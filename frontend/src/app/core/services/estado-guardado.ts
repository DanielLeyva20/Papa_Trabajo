import { Injectable, computed, signal } from '@angular/core';

/**
 * listo: todo está en el servidor · pendiente: hay cambios que aún no se envían ·
 * guardando: se están enviando · error: no se pudieron guardar (se conservan para reintentar).
 */
export type EstadoGuardado = 'listo' | 'pendiente' | 'guardando' | 'error';

/** Lo que tarda el guardado automático en enviar los cambios cuando se deja de marcar. */
export const ESPERA_AUTOGUARDADO_MS = 3000;
/** Si el servidor no responde en este tiempo, «Guardar cambios» avisa en vez de quedarse esperando. */
const LIMITE_GUARDAR_MS = 20_000;

/**
 * Guardado de toda la aplicación.
 * Cada pantalla que edita algo registra cómo guardar lo suyo; el botón «Guardar cambios» de la
 * cabecera (o Ctrl+S) los guarda todos de inmediato. El guardado automático sigue como respaldo.
 */
@Injectable({ providedIn: 'root' })
export class IndicadorGuardado {
  readonly estado = signal<EstadoGuardado>('listo');
  readonly ultimaVez = signal<Date | null>(null);
  readonly hayCambios = computed(() => this.estado() === 'pendiente' || this.estado() === 'error');

  private readonly guardadores = new Set<() => void>();
  private esperas: ((ok: boolean) => void)[] = [];

  /** Registra cómo guardar lo pendiente de una pantalla. Devuelve la función para quitarlo. */
  registrar(guardar: () => void): () => void {
    this.guardadores.add(guardar);
    return () => this.guardadores.delete(guardar);
  }

  pendiente(): void {
    if (this.estado() !== 'guardando') this.estado.set('pendiente');
  }

  guardando(): void {
    this.estado.set('guardando');
  }

  guardado(): void {
    this.estado.set('listo');
    this.ultimaVez.set(new Date());
    this.resolver(true);
  }

  fallo(): void {
    this.estado.set('error');
    this.resolver(false);
  }

  /** Envía ya todo lo pendiente. Se resuelve en true cuando quedó guardado. */
  guardarTodo(): Promise<boolean> {
    if (this.estado() === 'listo') return Promise.resolve(true);
    const espera = new Promise<boolean>((resolve) => {
      this.esperas.push(resolve);
      setTimeout(() => resolve(false), LIMITE_GUARDAR_MS);
    });
    for (const guardar of this.guardadores) guardar();
    // Nadie tenía nada que enviar (p. ej. la pantalla ya se cerró y guardó al salir).
    if (this.estado() === 'pendiente') this.guardado();
    return espera;
  }

  private resolver(ok: boolean): void {
    const esperas = this.esperas;
    this.esperas = [];
    esperas.forEach((resolve) => resolve(ok));
  }
}
