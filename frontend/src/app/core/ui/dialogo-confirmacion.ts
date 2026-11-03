import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { Confirmacion } from '../services/confirmacion';

/** Alerta de confirmación al estilo de macOS/iOS: centrada, compacta, el fondo se atenúa y difumina. */
@Component({
  selector: 'app-dialogo-confirmacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialogo class="alerta" (cancel)="responder(false)" aria-labelledby="confirmacion-titulo">
      @if (confirmacion.activo(); as pedido) {
        <h2 id="confirmacion-titulo">{{ pedido.titulo }}</h2>
        <p>{{ pedido.mensaje }}</p>
        <div class="alerta__acciones">
          <button type="button" class="boton" (click)="responder(false)">Cancelar</button>
          <button
            type="button"
            class="boton"
            [class.boton--peligro]="pedido.peligro"
            [class.boton--primario]="!pedido.peligro"
            (click)="responder(true)"
          >
            {{ pedido.aceptar }}
          </button>
        </div>
      }
    </dialog>
  `,
  styles: `
    .alerta {
      width: min(440px, calc(100vw - 32px));
      padding: var(--e-6) var(--e-5) var(--e-5);
      border: 0;
      border-radius: var(--radio-xl);
      background: color-mix(in srgb, var(--superficie) 92%, transparent);
      backdrop-filter: blur(30px) saturate(180%);
      box-shadow: var(--sombra-flotante);
      text-align: center;
      opacity: 1;
      transform: none;
      filter: none;
      transition: opacity 240ms var(--ease-out), transform 320ms var(--resorte), filter 240ms var(--ease-out),
        overlay 240ms allow-discrete, display 240ms allow-discrete;

      @starting-style {
        opacity: 0;
        filter: blur(8px);
        transform: scale(1.06);
      }

      &::backdrop {
        background: rgb(0 0 0 / 0.28);
        backdrop-filter: blur(6px);
        transition: opacity 240ms ease, overlay 240ms allow-discrete, display 240ms allow-discrete;
      }

      h2 {
        font-size: var(--t-lg);
        margin-bottom: var(--e-2);
      }

      p {
        color: var(--texto-2);
        font-size: var(--t-sm);
      }
    }

    .alerta__acciones {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--e-2);
      margin-top: var(--e-5);
    }
  `,
})
export class DialogoConfirmacion {
  protected readonly confirmacion = inject(Confirmacion);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    effect(() => {
      const el = this.dialogo().nativeElement;
      if (this.confirmacion.activo() && !el.open) el.showModal();
      if (!this.confirmacion.activo() && el.open) el.close();
    });
  }

  protected responder(respuesta: boolean): void {
    this.confirmacion.activo()?.responder(respuesta);
  }
}
