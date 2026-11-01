import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { partesMes } from '../../core/services/calendario';
import { Catalogo } from '../../core/services/catalogo';
import { Confirmacion } from '../../core/services/confirmacion';
import { Deslizante } from '../../core/ui/deslizante';
import { Icono } from '../../core/ui/icono';
import { CuadriculaRol, type PedidoMarca } from './componentes/cuadricula-rol';
import { DialogoGenerar, type OpcionesGenerar } from './componentes/dialogo-generar';
import { PaletaSellos } from './componentes/paleta-sellos';
import { RolStore } from './rol.store';

@Component({
  selector: 'app-rol-page',
  imports: [RouterLink, Icono, Deslizante, CuadriculaRol, PaletaSellos, DialogoGenerar],
  providers: [RolStore],
  templateUrl: './rol-page.html',
  styleUrl: './rol-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'atajos($event)' },
})
export class RolPage {
  protected readonly store = inject(RolStore);
  protected readonly catalogo = inject(Catalogo);
  private readonly confirmacion = inject(Confirmacion);
  private readonly dialogoGenerar = viewChild.required(DialogoGenerar);

  protected readonly mes = this.store.mesSeleccionado;

  /** false cuando el título grande del mes salió de la pantalla al bajar. */
  protected readonly tituloVisible = signal(true);
  private readonly centinela = viewChild.required<ElementRef<HTMLElement>>('centinela');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observador = new IntersectionObserver(([e]) => this.tituloVisible.set(e!.isIntersecting), {
        rootMargin: '-72px 0px 0px 0px',
      });
      observador.observe(this.centinela().nativeElement);
      destroyRef.onDestroy(() => observador.disconnect());
    });
  }
  protected readonly partes = computed(() => partesMes(this.mes.mes()));
  protected readonly sedeActivaRol = computed(() => {
    const activa = this.store.sedeActiva();
    return activa === 'todas' ? null : activa;
  });

  protected marcar(pedido: PedidoMarca): void {
    this.store.marcar(pedido.celdas, pedido.codigo);
  }

  protected abrirGenerar(): void {
    this.dialogoGenerar().abrir();
  }

  protected generar(opciones: OpcionesGenerar): void {
    this.store.generar(opciones);
  }

  protected async limpiar(): Promise<void> {
    const sedeId = this.sedeActivaRol() ?? undefined;
    const sede = this.store.rol()?.sedes.find((s) => s.id === sedeId);
    const ok = await this.confirmacion.preguntar({
      titulo: `¿Borrar las marcas de ${this.mes.nombre()}?`,
      mensaje: sede
        ? `Se borrarán todas las marcas de "${sede.nombre}" en este mes. Los agentes no se borran.`
        : 'Se borrarán las marcas de TODAS las sedes en este mes. Los agentes no se borran.',
      aceptar: 'Sí, borrar marcas',
      peligro: true,
    });
    if (ok) this.store.limpiar(sedeId);
  }

  /** Ctrl+Z deshace la última marca (fuera de campos de texto). */
  protected atajos(evento: KeyboardEvent): void {
    const enCampo = (evento.target as HTMLElement).closest('input, textarea, select');
    if (enCampo) return;
    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'z') {
      evento.preventDefault();
      this.store.deshacer();
    }
  }
}
