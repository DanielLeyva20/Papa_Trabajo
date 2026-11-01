import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** Tonos suaves para las iniciales cuando el agente no tiene foto (siempre el mismo por persona). */
const TONOS = [
  ['#e8f0fe', '#1a56b8'],
  ['#e6f6ec', '#1f7a3a'],
  ['#fff2d9', '#8a5a00'],
  ['#f3e8fd', '#7a3fa3'],
  ['#ffe9e7', '#b42318'],
  ['#e5f6f8', '#0e6f7c'],
  ['#efeff4', '#48484f'],
] as const;

/** Foto del agente o, si no tiene, sus iniciales en un círculo de color. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (url() && !fallo()) {
      <img [src]="url()" [alt]="'Foto de ' + nombres()" loading="lazy" decoding="async" (error)="fallo.set(true)" />
    } @else {
      <span aria-hidden="true">{{ iniciales() }}</span>
    }
  `,
  host: {
    '[style.--tam.px]': 'tamano()',
    '[style.background]': 'tono()[0]',
    '[style.color]': 'tono()[1]',
    '[attr.role]': '"img"',
    '[attr.aria-label]': 'nombres()',
  },
  styles: `
    :host {
      position: relative;
      display: inline-grid;
      flex: none;
      place-items: center;
      width: var(--tam);
      height: var(--tam);
      border-radius: 50%;
      overflow: hidden;
      font-size: calc(var(--tam) * 0.38);
      font-weight: 650;
      letter-spacing: -0.02em;
      user-select: none;
      box-shadow: inset 0 0 0 0.5px rgb(0 0 0 / 0.08);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      animation: revelar 360ms var(--ease-out);
    }

    @keyframes revelar {
      from {
        opacity: 0;
        transform: scale(1.06);
      }
    }
  `,
})
export class Avatar {
  readonly agenteId = input.required<number>();
  readonly nombres = input.required<string>();
  readonly fotoVersion = input<string | null>(null);
  readonly tamano = input(36);

  protected readonly fallo = signal(false);

  protected readonly url = computed(() => {
    const version = this.fotoVersion();
    return version ? `/api/agentes/${this.agenteId()}/foto?v=${version}` : null;
  });

  protected readonly iniciales = computed(() => {
    const partes = this.nombres().trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
  });

  protected readonly tono = computed(() => {
    const suma = [...this.nombres()].reduce((n, c) => n + c.charCodeAt(0), 0);
    return TONOS[suma % TONOS.length]!;
  });
}
