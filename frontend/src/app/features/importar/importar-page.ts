import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CARGO_ETIQUETA, type BloquePrevio } from '../../core/models/dominio';
import { Catalogo } from '../../core/services/catalogo';
import { Icono } from '../../core/ui/icono';
import { SelectorMes } from '../../core/ui/selector-mes';
import { ImportarStore } from './importar.store';

@Component({
  selector: 'app-importar-page',
  imports: [Icono, SelectorMes, RouterLink],
  providers: [ImportarStore],
  templateUrl: './importar-page.html',
  styleUrl: './importar-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportarPage {
  protected readonly store = inject(ImportarStore);
  protected readonly catalogo = inject(Catalogo);
  private readonly router = inject(Router);

  protected readonly etiquetaCargo = CARGO_ETIQUETA;
  /** true mientras se arrastra un archivo sobre la zona. */
  protected readonly encima = signal(false);

  protected alElegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = ''; // permite volver a elegir el mismo archivo
    if (archivo) this.store.analizar(archivo);
  }

  protected alSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.encima.set(false);
    const archivo = evento.dataTransfer?.files[0];
    if (archivo) this.store.analizar(archivo);
  }

  protected alArrastrar(evento: DragEvent): void {
    evento.preventDefault();
    this.encima.set(true);
  }

  /** Una tabla se abre sola si necesita atención (sin sede o con avisos). */
  protected abierta(bloque: BloquePrevio): boolean {
    return !bloque.sedeId || bloque.avisos.length > 0 || bloque.filas.some((f) => f.avisos.length > 0);
  }

  protected esClaro(codigo: string): boolean {
    return this.catalogo.porCodigo().get(codigo)?.colorFondo.toUpperCase() === '#FFFFFF';
  }

  protected verRol(): void {
    void this.router.navigateByUrl('/rol');
  }
}
