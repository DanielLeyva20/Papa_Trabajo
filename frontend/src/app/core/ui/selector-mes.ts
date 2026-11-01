import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MesSeleccionado } from '../services/mes-seleccionado';
import { Icono } from './icono';

/** Selector compacto del mes de trabajo, compartido por todas las pantallas. */
@Component({
  selector: 'app-selector-mes',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="selector" role="group" aria-label="Mes de trabajo">
      <button type="button" class="boton boton--icono" (click)="mes.anterior()" aria-label="Mes anterior">
        <app-icono nombre="ChevronLeft" [tamano]="20" [trazo]="2.5" />
      </button>
      @for (nombre of [mes.nombre()]; track nombre) {
        <span class="selector__mes" [attr.data-dir]="mes.direccion()" aria-live="polite">{{ nombre }}</span>
      }
      <button type="button" class="boton boton--icono" (click)="mes.siguiente()" aria-label="Mes siguiente">
        <app-icono nombre="ChevronRight" [tamano]="20" [trazo]="2.5" />
      </button>
    </div>
  `,
  styles: `
    .selector {
      display: inline-flex;
      align-items: center;
      gap: var(--e-2);
    }

    .selector__mes {
      min-width: 10.5ch;
      text-align: center;
      font-size: var(--t-md);
      font-weight: 650;
      animation: rodar 360ms var(--resorte);
    }

    .selector__mes[data-dir='-1'] {
      --desde: -10px;
    }

    @keyframes rodar {
      from {
        opacity: 0;
        filter: blur(3px);
        transform: translateY(var(--desde, 10px));
      }
    }
  `,
})
export class SelectorMes {
  protected readonly mes = inject(MesSeleccionado);
}
