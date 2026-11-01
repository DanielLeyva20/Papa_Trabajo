import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CodigoTurno } from '../../../core/models/dominio';
import { Deslizante } from '../../../core/ui/deslizante';
import { Icono } from '../../../core/ui/icono';

/**
 * Dock flotante de sellos (como el Dock de macOS): siempre a mano mientras se recorre el rol.
 * Los sellos pueden desplazarse de lado en pantallas chicas; "Borrar" queda fijo y siempre visible.
 */
@Component({
  selector: 'app-paleta-sellos',
  imports: [Icono, Deslizante],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dock" role="toolbar" aria-label="Sello para marcar">
      <div class="dock__sellos" appDeslizante='[aria-pressed="true"]'>
        <span class="segmentado__indicador dock__indicador" aria-hidden="true"></span>
        @for (codigo of codigos(); track codigo.codigo) {
          <button
            type="button"
            class="sello"
            [attr.aria-pressed]="activo() === codigo.codigo"
            [attr.title]="codigo.nombre + ' (tecla ' + codigo.tecla + ')'"
            (click)="elegir.emit(codigo.codigo)"
          >
            <span
              class="sello__marca"
              [style.background]="codigo.colorFondo"
              [style.color]="codigo.colorTexto"
              [class.sello__marca--clara]="codigo.colorFondo.toUpperCase() === '#FFFFFF'"
              >{{ codigo.codigo }}</span
            >
            <span class="sello__nombre">{{ codigo.nombre }}</span>
          </button>
        }
      </div>
      <span class="dock__separador" aria-hidden="true"></span>
      <button
        type="button"
        class="sello sello--borrador"
        [attr.aria-pressed]="activo() === null"
        title="Borrar marcas"
        (click)="elegir.emit(null)"
      >
        <span class="sello__marca sello__marca--borrador"><app-icono nombre="Eraser" [tamano]="17" /></span>
        <span class="sello__nombre">Borrar</span>
      </button>
    </div>
  `,
  styles: `
    /* Centrado con márgenes automáticos: así el Dock puede usar todo el ancho de la pantalla. */
    :host {
      position: fixed;
      left: 0;
      right: 0;
      bottom: var(--e-5);
      z-index: 30;
      width: max-content;
      max-width: calc(100vw - 24px);
      margin-inline: auto;
      animation: subir 620ms var(--resorte) 120ms both;
    }

    @keyframes subir {
      from {
        opacity: 0;
        transform: translateY(40px) scale(0.96);
      }
    }

    .dock {
      display: flex;
      align-items: center;
      padding: 6px;
      border-radius: 22px;
      /* Vidrio denso: lo de abajo se intuye pero no compite con los sellos */
      background: rgb(255 255 255 / 0.92);
      backdrop-filter: blur(28px) saturate(190%);
      border: 0.5px solid rgb(255 255 255 / 0.6);
      box-shadow: var(--sombra-flotante), inset 0 0.5px 0 rgb(255 255 255 / 0.8);
    }

    .dock__sellos {
      position: relative;
      display: flex;
      gap: 2px;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
      isolation: isolate;
    }

    .dock__indicador {
      top: 0;
      bottom: 0;
      border-radius: 16px;
      box-shadow: 0 2px 10px rgb(0 0 0 / 0.12), 0 0 0 0.5px rgb(0 0 0 / 0.06);
    }

    .dock__separador {
      flex: none;
      width: 1px;
      height: 28px;
      margin: 0 6px;
      background: var(--separador-fuerte);
    }

    .sello {
      display: inline-flex;
      flex: none;
      align-items: center;
      gap: 8px;
      min-height: 48px;
      padding: 0 14px 0 8px;
      border: 0;
      border-radius: 16px;
      background: transparent;
      color: var(--texto-2);
      font-size: var(--t-xs);
      font-weight: 600;
      transition: color 200ms ease, background-color 200ms ease, box-shadow 200ms ease;

      &[aria-pressed='true'] {
        color: var(--texto);

        .sello__marca {
          transform: scale(1.1);
        }
      }

      &:active .sello__marca {
        transform: scale(0.9);
        transition-duration: 80ms;
      }

      @media (hover: hover) and (pointer: fine) {
        &:hover .sello__marca {
          transform: translateY(-3px) scale(1.12);
        }
      }
    }

    /* El borrador está fuera del grupo deslizante: lleva su propia pastilla al estar activo */
    .sello--borrador[aria-pressed='true'] {
      background: var(--superficie);
      box-shadow: 0 2px 10px rgb(0 0 0 / 0.12), 0 0 0 0.5px rgb(0 0 0 / 0.06);
    }

    .sello__marca {
      display: inline-grid;
      place-items: center;
      min-width: 32px;
      height: 32px;
      padding: 0 4px;
      border-radius: 10px;
      font-size: var(--t-sm);
      font-weight: 700;
      box-shadow: 0 2px 6px rgb(0 0 0 / 0.12);
      transition: transform 360ms var(--rebote);
    }

    .sello__marca--clara {
      box-shadow: inset 0 0 0 1px var(--separador-fuerte), 0 2px 6px rgb(0 0 0 / 0.06);
    }

    .sello__marca--borrador {
      background: var(--relleno);
      color: var(--texto-2);
      box-shadow: none;
    }

    @media (max-width: 900px) {
      .sello__nombre {
        display: none;
      }

      .sello {
        padding: 0 8px;
      }
    }

    /* Celular: sellos un poco más compactos para que los 7 y "Borrar" quepan sin ocultarse */
    @media (max-width: 600px) {
      .dock {
        padding: 5px;
      }

      .sello {
        min-height: 44px;
        padding: 0 4px;
      }

      .sello__marca {
        min-width: 30px;
        height: 30px;
        font-size: var(--t-xs);
      }

      .dock__separador {
        margin: 0 3px;
      }
    }
  `,
})
export class PaletaSellos {
  readonly codigos = input.required<CodigoTurno[]>();
  readonly activo = input.required<string | null>();
  readonly elegir = output<string | null>();
}
