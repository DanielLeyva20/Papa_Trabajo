import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Avisos } from '../services/avisos';
import { Icono } from './icono';

/** Avisos tipo "pastilla" de vidrio oscuro que entran desde abajo con un leve rebote. */
@Component({
  selector: 'app-capa-avisos',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="capa" aria-live="polite" aria-label="Avisos">
      @for (aviso of avisos.lista(); track aviso.id) {
        <div class="aviso" [attr.data-tipo]="aviso.tipo" role="status">
          <span class="aviso__icono">
            <app-icono [nombre]="aviso.tipo === 'error' ? 'CircleAlert' : aviso.tipo === 'info' ? 'Info' : 'Check'" [tamano]="18" [trazo]="2.5" />
          </span>
          <p>{{ aviso.mensaje }}</p>
          @if (aviso.accion; as accion) {
            <button type="button" class="aviso__accion" (click)="accion.ejecutar(); avisos.cerrar(aviso.id)">
              {{ accion.texto }}
            </button>
          }
          <button type="button" class="aviso__cerrar" (click)="avisos.cerrar(aviso.id)" aria-label="Cerrar aviso">
            <app-icono nombre="X" [tamano]="16" />
          </button>
        </div>
      }
    </section>
  `,
  styles: `
    .capa {
      position: fixed;
      left: 50%;
      bottom: calc(var(--e-5) + var(--alto-dock, 0px));
      z-index: 60;
      display: grid;
      justify-items: center;
      gap: var(--e-2);
      width: min(520px, calc(100vw - 32px));
      transform: translateX(-50%);
      pointer-events: none;
    }

    .aviso {
      display: flex;
      align-items: center;
      gap: var(--e-3);
      max-width: 100%;
      padding: 10px 10px 10px 12px;
      border-radius: 20px;
      background: var(--vidrio-oscuro);
      backdrop-filter: blur(20px) saturate(180%);
      color: #fff;
      box-shadow: var(--sombra-flotante);
      pointer-events: auto;
      transition: opacity 260ms var(--ease-out), transform 420ms var(--rebote), filter 260ms var(--ease-out);

      @starting-style {
        opacity: 0;
        filter: blur(6px);
        transform: translateY(24px) scale(0.92);
      }

      p {
        flex: 1;
        font-size: var(--t-sm);
        font-weight: 500;
      }
    }

    .aviso__icono {
      display: grid;
      place-items: center;
      flex: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #30d158;
      color: #fff;
    }

    .aviso[data-tipo='error'] .aviso__icono { background: #ff453a; }
    .aviso[data-tipo='info'] .aviso__icono { background: #0a84ff; }

    .aviso__accion {
      min-height: 34px;
      padding: 0 var(--e-3);
      border: 0;
      border-radius: var(--pildora);
      background: rgb(255 255 255 / 0.16);
      color: #fff;
      font-weight: 600;
      font-size: var(--t-xs);
    }

    .aviso__cerrar {
      display: grid;
      place-items: center;
      flex: none;
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: rgb(255 255 255 / 0.7);
    }
  `,
})
export class CapaAvisos {
  protected readonly avisos = inject(Avisos);
}
