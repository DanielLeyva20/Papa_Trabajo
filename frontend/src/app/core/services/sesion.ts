import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../api/api';

export type EstadoSesion = 'desconocida' | 'activa' | 'inactiva';

/** Sabe si el usuario ya ingresó su PIN. La sesión real vive en una cookie del servidor. */
@Injectable({ providedIn: 'root' })
export class Sesion {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  readonly estado = signal<EstadoSesion>('desconocida');

  /** Pregunta al servidor solo la primera vez; después usa lo que ya sabe. */
  async verificar(): Promise<boolean> {
    if (this.estado() === 'desconocida') {
      try {
        const { activa } = await firstValueFrom(this.api.sesion());
        this.estado.set(activa ? 'activa' : 'inactiva');
      } catch {
        this.estado.set('inactiva');
      }
    }
    return this.estado() === 'activa';
  }

  async ingresar(pin: string): Promise<void> {
    await firstValueFrom(this.api.ingresar(pin));
    this.estado.set('activa');
  }

  async salir(): Promise<void> {
    try {
      await firstValueFrom(this.api.salir());
    } finally {
      this.estado.set('inactiva');
      await this.router.navigateByUrl('/ingresar');
    }
  }

  /** El servidor dijo que la sesión venció: se vuelve a pedir el PIN sin perder la página actual. */
  expirada(): void {
    if (this.estado() === 'inactiva') return;
    this.estado.set('inactiva');
    const volver = this.router.url.startsWith('/ingresar') ? '/rol' : this.router.url;
    void this.router.navigate(['/ingresar'], { queryParams: { volver } });
  }
}
