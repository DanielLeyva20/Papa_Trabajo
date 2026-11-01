import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DIAS_SEMANA, LETRAS_SEMANA, type PatronSemanal } from '../../../core/models/dominio';
import { Catalogo } from '../../../core/services/catalogo';

/** Orden al tocar un día: Día → Noche → Libre → No viene a esta sede → Día. */
const CICLO: (string | null)[] = ['D', 'N', 'L', null];

/** Semana tipo de un agente en una sede: base del llenado automático del mes. */
@Component({
  selector: 'app-editor-patron',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="patron" role="group" [attr.aria-label]="'Semana habitual en ' + sede()">
      @for (codigo of patron(); track $index; let i = $index) {
        <button
          type="button"
          class="dia"
          [attr.aria-label]="nombres[i] + ': ' + nombre(codigo) + '. Toque para cambiar.'"
          (click)="cambiar(i)"
        >
          <span class="dia__letra">{{ letras[i] }}</span>
          @for (c of [codigo ?? '-']; track c) {
          <span
            class="dia__marca"
            [class.dia__marca--vacia]="!codigo"
            [class.dia__marca--clara]="esClaro(codigo)"
            [style.background]="codigo ? catalogo.porCodigo().get(codigo)?.colorFondo : null"
            [style.color]="codigo ? catalogo.porCodigo().get(codigo)?.colorTexto : null"
            >{{ codigo ?? '–' }}</span
          >
          }
        </button>
      }
    </div>
    <p class="resumen">{{ resumen() }}</p>
  `,
  styles: `
    .patron {
      display: grid;
      grid-template-columns: repeat(7, minmax(40px, 56px));
      gap: 6px;
    }

    .dia {
      display: grid;
      justify-items: center;
      gap: 6px;
      padding: 8px 0 10px;
      border: 0;
      border-radius: 14px;
      background: var(--superficie);
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
      transition: transform 160ms var(--ease-out), box-shadow 200ms ease;

      &:active {
        transform: scale(0.92);
      }

      @media (hover: hover) and (pointer: fine) {
        &:hover {
          box-shadow: 0 0 0 1.5px var(--azul), 0 4px 12px -4px rgb(0 113 227 / 0.4);
        }
      }
    }

    .dia__letra {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--texto-2);
    }

    .dia__marca {
      display: grid;
      place-items: center;
      width: 32px;
      height: 30px;
      border-radius: 9px;
      font-size: var(--t-sm);
      font-weight: 700;
      animation: cambiar 300ms var(--rebote);
    }

    @keyframes cambiar {
      from {
        transform: scale(0.6) rotateX(70deg);
        opacity: 0.3;
      }
    }

    .dia__marca--clara {
      background: var(--relleno-suave) !important;
    }

    .dia__marca--vacia {
      color: var(--texto-3);
      background: transparent;
      outline: 1.5px dashed var(--separador-fuerte);
      outline-offset: -1.5px;
    }

    .resumen {
      margin-top: var(--e-3);
      font-size: var(--t-xs);
      color: var(--texto-2);
    }
  `,
})
export class EditorPatron {
  readonly patron = input.required<PatronSemanal>();
  readonly sede = input('');
  readonly cambio = output<PatronSemanal>();

  protected readonly catalogo = inject(Catalogo);
  protected readonly letras = LETRAS_SEMANA;
  protected readonly nombres = DIAS_SEMANA;

  protected readonly resumen = computed(() => {
    const p = this.patron();
    const dias = (codigo: string) => p.map((c, i) => (c === codigo ? DIAS_SEMANA[i] : null)).filter(Boolean);
    const partes: string[] = [];
    const trabajo = p.filter((c) => c === 'D' || c === 'N').length;
    if (trabajo === 0) return 'No tiene días asignados en esta sede.';
    const noches = dias('N');
    partes.push(noches.length > dias('D').length ? `Turno noche ${trabajo} días` : `Turno día ${trabajo} días`);
    const libres = dias('L');
    if (libres.length) partes.push(`libre los ${libres.join(' y ').toLowerCase()}`);
    if (p.includes(null)) partes.push('el resto de días no viene a esta sede');
    return partes.join(', ') + '.';
  });

  protected cambiar(indice: number): void {
    const actual = this.patron()[indice] ?? null;
    const siguiente = CICLO[(CICLO.indexOf(actual) + 1) % CICLO.length] ?? 'D';
    const nuevo = [...this.patron()];
    nuevo[indice] = siguiente;
    this.cambio.emit(nuevo);
  }

  protected nombre(codigo: string | null): string {
    return codigo ? (this.catalogo.porCodigo().get(codigo)?.nombre ?? codigo) : 'no viene';
  }

  protected esClaro(codigo: string | null): boolean {
    return !!codigo && this.catalogo.porCodigo().get(codigo)?.colorFondo.toUpperCase() === '#FFFFFF';
  }
}
