import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { SedeRol } from '../../../core/models/dominio';
import { Icono } from '../../../core/ui/icono';

export interface OpcionesGenerar {
  sedeId?: number;
  sobrescribir: boolean;
}

/** Explica y confirma el llenado automático del mes según el patrón semanal de cada agente. */
@Component({
  selector: 'app-dialogo-generar',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialogo class="dialogo" aria-labelledby="generar-titulo" (close)="abierto.set(false)">
      @if (abierto()) {
        <form method="dialog" (submit)="confirmar($event)">
          <h2 id="generar-titulo">Llenar {{ nombreMes() }} automáticamente</h2>
          <p class="explicacion">
            Cada agente recibe su turno habitual y su día libre de la semana, tal como está en su patrón
            (pantalla <strong>Personal</strong>). Luego usted solo corrige los cambios del mes.
          </p>

          <label class="campo">
            <span>¿Qué sedes?</span>
            <select class="entrada" #sede>
              <option value="">Todas las sedes</option>
              @for (s of sedes(); track s.id) {
                <option [value]="s.id" [selected]="s.id === sedeInicial()">{{ s.nombre }}</option>
              }
            </select>
          </label>

          <fieldset class="opciones">
            <legend>¿Qué hacer con lo que ya está marcado?</legend>
            <label class="opcion">
              <input type="radio" name="modo" value="vacios" checked #soloVacios />
              <span>
                <strong>Respetarlo</strong> y llenar solo los casilleros vacíos
                <small>Recomendado. No se pierde nada de lo que ya marcó.</small>
              </span>
            </label>
            <label class="opcion">
              <input type="radio" name="modo" value="todo" />
              <span>
                <strong>Reemplazarlo</strong> todo según el patrón
                <small>Las faltas, vacaciones y permisos ya registrados se mantienen.</small>
              </span>
            </label>
          </fieldset>

          <div class="acciones">
            <button type="button" class="boton" (click)="cerrar()">Cancelar</button>
            <button type="submit" class="boton boton--primario">
              <app-icono nombre="CalendarCheck" [tamano]="18" />
              Llenar el mes
            </button>
          </div>
        </form>
      }
    </dialog>
  `,
  styles: `
    .dialogo {
      width: min(580px, calc(100vw - 32px));
      padding: var(--e-6);
      border: 0;
      border-radius: 26px;
      background: var(--superficie);
      box-shadow: var(--sombra-flotante);
      transition: opacity 260ms var(--ease-out), transform 380ms var(--resorte), filter 260ms var(--ease-out),
        overlay 260ms allow-discrete, display 260ms allow-discrete;

      @starting-style {
        opacity: 0;
        filter: blur(8px);
        transform: translateY(24px) scale(0.97);
      }

      &::backdrop {
        background: rgb(0 0 0 / 0.3);
        backdrop-filter: blur(8px);
      }
    }

    form {
      display: grid;
      gap: var(--e-5);
    }

    h2 {
      font-size: var(--t-xl);
      font-weight: 700;
      letter-spacing: -0.028em;
    }

    .explicacion {
      margin-top: calc(var(--e-3) * -1);
      color: var(--texto-2);
    }

    .opciones {
      display: grid;
      gap: var(--e-2);
      margin: 0;
      padding: 0;
      border: 0;

      legend {
        margin-bottom: var(--e-2);
        padding-left: 4px;
        font-weight: 600;
        font-size: var(--t-xs);
        color: var(--texto-2);
      }
    }

    .opcion {
      display: flex;
      gap: var(--e-3);
      align-items: flex-start;
      padding: var(--e-4);
      border-radius: var(--radio-l);
      background: var(--relleno-suave);
      box-shadow: inset 0 0 0 1.5px transparent;
      cursor: pointer;
      transition: background-color 200ms ease, box-shadow 200ms ease, transform 160ms var(--ease-out);

      &:active {
        transform: scale(0.99);
      }

      &:has(input:checked) {
        background: var(--azul-velo);
        box-shadow: inset 0 0 0 1.5px var(--azul);
      }

      input {
        width: 20px;
        height: 20px;
        margin-top: 2px;
        accent-color: var(--azul);
      }

      small {
        display: block;
        color: var(--texto-2);
        font-size: var(--t-xs);
      }
    }

    .acciones {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: var(--e-2);
    }
  `,
})
export class DialogoGenerar {
  readonly sedes = input.required<SedeRol[]>();
  readonly sedeInicial = input<number | null>(null);
  readonly nombreMes = input.required<string>();
  readonly generar = output<OpcionesGenerar>();

  protected readonly abierto = signal(false);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private readonly sede = viewChild<ElementRef<HTMLSelectElement>>('sede');
  private readonly soloVacios = viewChild<ElementRef<HTMLInputElement>>('soloVacios');

  abrir(): void {
    this.abierto.set(true);
    this.dialogo().nativeElement.showModal();
  }

  protected cerrar(): void {
    this.dialogo().nativeElement.close();
  }

  protected confirmar(evento: Event): void {
    evento.preventDefault();
    const sedeId = Number(this.sede()?.nativeElement.value) || undefined;
    this.generar.emit({ sedeId, sobrescribir: !this.soloVacios()?.nativeElement.checked });
    this.cerrar();
  }
}
