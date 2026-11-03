import { Injectable, effect, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro';

const CLAVE = 'rol-turnos:tema';
const COLOR_BARRA: Record<Tema, string> = { claro: '#f5f5f7', oscuro: '#0d0d0f' };

/**
 * Modo claro u oscuro de todo el sistema.
 * Mientras no se elija uno, sigue al de la computadora; al elegirlo con el botón, se recuerda.
 */
@Injectable({ providedIn: 'root' })
export class TemaVisual {
  private readonly sistema = matchMedia('(prefers-color-scheme: dark)');
  private elegido = leerGuardado();

  readonly actual = signal<Tema>(this.elegido ?? this.delSistema());

  constructor() {
    effect(() => aplicar(this.actual()));
    this.sistema.addEventListener('change', () => {
      if (!this.elegido) this.actual.set(this.delSistema());
    });
  }

  alternar(): void {
    const siguiente: Tema = this.actual() === 'oscuro' ? 'claro' : 'oscuro';
    this.elegido = siguiente;
    try {
      localStorage.setItem(CLAVE, siguiente);
    } catch {
      /* sin almacenamiento: dura hasta cerrar la pestaña */
    }
    // Un fundido corto en vez de que cada color cambie por su cuenta (la clase evita la animación de cambio de pantalla).
    const raiz = document.documentElement;
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.actual.set(siguiente);
      return;
    }
    raiz.classList.add('cambiando-tema');
    const transicion = document.startViewTransition(() => this.actual.set(siguiente));
    void transicion.finished.finally(() => raiz.classList.remove('cambiando-tema'));
  }

  private delSistema(): Tema {
    return this.sistema.matches ? 'oscuro' : 'claro';
  }
}

function aplicar(tema: Tema): void {
  document.documentElement.dataset['tema'] = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema]);
}

function leerGuardado(): Tema | null {
  try {
    const guardado = localStorage.getItem(CLAVE);
    return guardado === 'claro' || guardado === 'oscuro' ? guardado : null;
  } catch {
    return null;
  }
}
