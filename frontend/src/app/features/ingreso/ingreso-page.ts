import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Sesion } from '../../core/services/sesion';
import { Icono } from '../../core/ui/icono';

const LARGO_PIN = 6;
const AVISO_DESPERTAR_MS = 4000;
/** Render (plan gratuito) duerme el servidor tras 15 min sin uso: mientras esta pantalla esté abierta, se mantiene despierto. */
const MANTENER_DESPIERTO_MS = 4 * 60_000;
/** Lo que dura la cascada verde antes de entrar: suficiente para verla, no para esperarla. */
const CELEBRACION_MS = 520;
/** Lo que se ven los casilleros en rojo antes de vaciarse. */
const ERROR_MS = 760;
/** Lo que dura la coreografía de entrada de la pantalla. */
const DURACION_ENTRADA_MS = 1500;

type Estado = 'escribiendo' | 'verificando' | 'error' | 'bloqueado' | 'correcto';

/**
 * Pantalla de acceso: seis casilleros que se ponen verdes si el PIN es correcto o rojos si no,
 * sobre la foto del equipo y con los logos de las empresas.
 */
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

  /**
   * Página a la que se vuelve después de ingresar (viene en ?volver=).
   * Ojo: si la dirección no trae ?volver=, el router la pone en undefined (no usa un valor por defecto).
   */
  readonly volver = input<string | undefined>();

  protected readonly digitos = signal<string[]>([]);
  protected readonly estado = signal<Estado>('escribiendo');
  protected readonly mensaje = signal('');
  protected readonly despertando = signal(false);
  /** true durante la coreografía de entrada (luego los casilleros solo reaccionan al estado). */
  protected readonly entrando = signal(true);

  protected readonly casilleros = Array.from({ length: LARGO_PIN }, (_, i) => i);
  protected readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  protected readonly bloqueado = computed(() => ['verificando', 'bloqueado', 'correcto'].includes(this.estado()));
  /** El casillero que recibe el próximo dígito (lleva el cursor). */
  protected readonly siguiente = computed(() => (this.estado() === 'escribiendo' ? this.digitos().length : -1));

  constructor() {
    // Mientras se escribe el PIN, se despierta el servidor y se trae la pantalla del rol:
    // así, al acertar, se entra al instante en vez de esperar a que todo arranque.
    this.despertarServidor();
    void import('../rol/rol-page').catch(() => undefined);
    setTimeout(() => this.entrando.set(false), DURACION_ENTRADA_MS);
    const latido = setInterval(() => this.despertarServidor(), MANTENER_DESPIERTO_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(latido));
  }

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
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (/^\d$/.test(evento.key)) {
      evento.preventDefault();
      this.pulsar(evento.key);
    } else if (evento.key === 'Backspace') {
      evento.preventDefault();
      this.borrar();
    }
  }

  private vaciado: ReturnType<typeof setTimeout> | undefined;

  private limpiarError(): void {
    clearTimeout(this.vaciado);
    this.estado.set('escribiendo');
    this.mensaje.set('');
    this.digitos.set([]);
  }

  private async enviar(): Promise<void> {
    this.estado.set('verificando');
    const aviso = setTimeout(() => this.despertando.set(true), AVISO_DESPERTAR_MS);
    try {
      await this.sesion.ingresar(this.digitos().join(''));
      this.estado.set('correcto');
      setTimeout(() => void this.entrar(), CELEBRACION_MS);
    } catch (error) {
      const http = error instanceof HttpErrorResponse ? error : null;
      this.estado.set(http?.status === 429 ? 'bloqueado' : 'error');
      this.mensaje.set(
        http?.error?.mensaje ??
          (http?.status === 0 ? 'Sin conexión. Revise el internet e intente de nuevo.' : 'No se pudo verificar el PIN.'),
      );
      // Los casilleros quedan en rojo un momento y luego se vacían para volver a escribir.
      this.vaciado = setTimeout(() => this.digitos.set([]), ERROR_MS);
      if (http?.status === 429) setTimeout(() => this.limpiarError(), 60_000);
    } finally {
      clearTimeout(aviso);
      this.despertando.set(false);
    }
  }

  /**
   * Entra al sistema. Si la navegación interna no avanza (p. ej. se publicó una versión nueva
   * mientras esta pantalla estaba abierta), se entra recargando la página: la sesión ya está guardada.
   */
  private async entrar(): Promise<void> {
    const destino = this.destino();
    const respaldo = setTimeout(() => window.location.assign(destino), 6000);
    try {
      const ok = await this.router.navigateByUrl(destino, { replaceUrl: true });
      if (!ok) window.location.assign(destino);
    } catch {
      window.location.assign(destino);
    } finally {
      clearTimeout(respaldo);
    }
  }

  private despertarServidor(): void {
    fetch('/api/salud', { cache: 'no-store' }).catch(() => undefined);
  }

  /** Solo se permite volver a rutas internas (nunca a otro sitio). */
  private destino(): string {
    const v = this.volver() ?? '';
    return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/ingresar') ? v : '/rol';
  }
}
