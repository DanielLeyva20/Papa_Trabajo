import { AfterViewInit, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Mueve el indicador (`.segmentado__indicador`) bajo la opción activa de un control segmentado,
 * como en iOS. La primera posición se coloca sin animación; las siguientes se deslizan.
 */
@Directive({ selector: '[appDeslizante]' })
export class Deslizante implements AfterViewInit {
  /** Selector de la opción activa; vacío (`appDeslizante` sin valor) usa el de por defecto. */
  readonly appDeslizante = input('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private cuadro = 0;
  private ultimo = '';

  ngAfterViewInit(): void {
    const programar = () => {
      cancelAnimationFrame(this.cuadro);
      this.cuadro = requestAnimationFrame(() => this.colocar());
    };
    // Solo los cambios de selección o de opciones; nunca el estilo que escribe la propia directiva.
    const mutaciones = new MutationObserver(programar);
    mutaciones.observe(this.host, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-pressed', 'aria-current', 'class'],
    });
    const tamanos = new ResizeObserver(programar);
    tamanos.observe(this.host);

    this.colocar();
    requestAnimationFrame(() => this.host.setAttribute('data-deslizante-listo', ''));

    this.destroyRef.onDestroy(() => {
      mutaciones.disconnect();
      tamanos.disconnect();
      cancelAnimationFrame(this.cuadro);
    });
  }

  private colocar(): void {
    const selector = this.appDeslizante() || '[aria-current], [aria-pressed="true"]';
    const activo = this.host.querySelector<HTMLElement>(selector);
    const valor = activo ? `${activo.offsetLeft}:${activo.offsetWidth}` : 'ninguno';
    if (valor === this.ultimo) return;
    this.ultimo = valor;

    const estilo = this.host.style;
    if (!activo) {
      estilo.setProperty('--ind-o', '0');
      return;
    }
    estilo.setProperty('--ind-x', `${activo.offsetLeft}px`);
    estilo.setProperty('--ind-w', `${activo.offsetWidth}px`);
    estilo.setProperty('--ind-o', '1');
  }
}
