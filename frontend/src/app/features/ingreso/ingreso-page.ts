import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Sesion } from '../../core/services/sesion';
import { Icono } from '../../core/ui/icono';

const LARGO_PIN = 6;
const AVISO_DESPERTAR_MS = 4000;

type Estado = 'escribiendo' | 'verificando' | 'error' | 'bloqueado' | 'correcto';

/** Pantalla de bloqueo: PIN de 6 dígitos con teclado numérico, como en el iPhone. */
@Component({
  selector: 'app-ingreso-page',
  imports: [Icono],
  templateUrl: './ingreso-page.html',
  styleUrl: './ingreso-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'alTeclear($event)' },
})
export class IngresoPage {
  private readonly sesion = inject(Sesion);
  private readonly router = inject(Router);

  /** Página a la que se vuelve después de ingresar (viene en ?volver=). */
  readonly volver = input<string>('/rol');

  protected readonly digitos = signal<string[]>([]);
  protected readonly estado = signal<Estado>('escribiendo');
  protected readonly mensaje = signal('');
  protected readonly despertando = signal(false);

  protected readonly puntos = Array.from({ length: LARGO_PIN }, (_, i) => i);
  protected readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  protected readonly bloqueado = computed(() => ['verificando', 'bloqueado', 'correcto'].includes(this.estado()));

  protected pulsar(digito: string): void {
    if (this.bloqueado() || this.digitos().length >= LARGO_PIN) return;
    if (this.estado() === 'error') this.limpiarError();
    this.digitos.update((d) => [...d, digito]);
    if (this.digitos().length === LARGO_PIN) void this.enviar();
  }

  protected borrar(): void {
    if (this.bloqueado()) return;
    if (this.estado() === 'error') this.limpiarError();
    this.digitos.update((d) => d.slice(0, -1));
  }

  protected alTeclear(evento: KeyboardEvent): void {
    if (/^\d$/.test(evento.key)) {
      evento.preventDefault();
      this.pulsar(evento.key);
    } else if (evento.key === 'Backspace') {
      evento.preventDefault();
      this.borrar();
    }
  }

  private limpiarError(): void {
    this.estado.set('escribiendo');
    this.mensaje.set('');
  }

  private async enviar(): Promise<void> {
    this.estado.set('verificando');
    // En el plan gratuito, Render "duerme" el servidor: la primera vez puede tardar.
    const aviso = setTimeout(() => this.despertando.set(true), AVISO_DESPERTAR_MS);
    try {
      await this.sesion.ingresar(this.digitos().join(''));
      this.estado.set('correcto');
      setTimeout(() => void this.router.navigateByUrl(this.destino()), 650);
    } catch (error) {
      this.digitos.set([]);
      const http = error instanceof HttpErrorResponse ? error : null;
      this.estado.set(http?.status === 429 ? 'bloqueado' : 'error');
      this.mensaje.set(
        http?.error?.mensaje ??
          (http?.status === 0 ? 'Sin conexión. Revise el internet e intente de nuevo.' : 'No se pudo verificar el PIN.'),
      );
      if (http?.status === 429) setTimeout(() => this.limpiarError(), 60_000);
    } finally {
      clearTimeout(aviso);
      this.despertando.set(false);
    }
  }

  /** Solo se permite volver a rutas internas (nunca a otro sitio). */
  private destino(): string {
    const v = this.volver();
    return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/ingresar') ? v : '/rol';
  }
}
