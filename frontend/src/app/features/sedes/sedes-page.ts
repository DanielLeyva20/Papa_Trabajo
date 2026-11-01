import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CARGO_ETIQUETA, type Sede } from '../../core/models/dominio';
import { Icono } from '../../core/ui/icono';
import { SelectorMes } from '../../core/ui/selector-mes';
import { SedesStore } from './sedes.store';

interface Borrador {
  nombre: string;
  nombreCorto: string;
}

@Component({
  selector: 'app-sedes-page',
  imports: [Icono, SelectorMes],
  providers: [SedesStore],
  templateUrl: './sedes-page.html',
  styleUrl: './sedes-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SedesPage {
  protected readonly store = inject(SedesStore);
  protected readonly etiquetaCargo = CARGO_ETIQUETA;

  protected readonly editando = signal<number | null>(null);
  protected readonly borrador = signal<Borrador>({ nombre: '', nombreCorto: '' });
  protected readonly nueva = signal<Borrador>({ nombre: '', nombreCorto: '' });

  protected editar(sede: Sede): void {
    this.editando.set(sede.id);
    this.borrador.set({ nombre: sede.nombre, nombreCorto: sede.nombreCorto });
  }

  protected guardar(sede: Sede, evento: Event): void {
    evento.preventDefault();
    const { nombre, nombreCorto } = this.borrador();
    if (!nombre.trim() || !nombreCorto.trim()) return;
    this.store.actualizar(sede, { nombre: nombre.trim(), nombreCorto: nombreCorto.trim() });
    this.editando.set(null);
  }

  protected crear(evento: Event): void {
    evento.preventDefault();
    const { nombre, nombreCorto } = this.nueva();
    if (!nombre.trim() || !nombreCorto.trim()) return;
    this.store.crear(nombre.trim(), nombreCorto.trim());
    this.nueva.set({ nombre: '', nombreCorto: '' });
  }

  protected guardarEncabezado(evento: Event, form: HTMLFormElement): void {
    evento.preventDefault();
    const datos = new FormData(form);
    this.store.guardarConfiguracion({
      titulo: String(datos.get('titulo') ?? '').trim(),
      entidad: String(datos.get('entidad') ?? '').trim(),
      supervisor: String(datos.get('supervisor') ?? '').trim(),
    });
  }
}
