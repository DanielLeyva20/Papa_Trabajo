import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CARGO_ETIQUETA, type CodigoTurno, type DiaDelMes, type SedeRol, type Turno } from '../../../core/models/dominio';
import { Avatar } from '../../../core/ui/avatar';
import { Icono } from '../../../core/ui/icono';
import type { Celda, MapaConflictos, TotalesSede } from '../rol.store';

export interface PedidoMarca {
  celdas: Celda[];
  codigo: string | null;
}

interface Posicion {
  fila: number;
  dia: number;
}

/**
 * Cuadrícula de una sede: una fila por agente y una columna por día.
 * Se marca con clic, arrastrando, o escribiendo la letra como en Excel.
 */
@Component({
  selector: 'app-cuadricula-rol',
  imports: [Avatar, Icono, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cuadricula-rol.html',
  styleUrl: './cuadricula-rol.scss',
  host: {
    // Las marcas puestas con el ratón "saltan"; las del teclado aparecen sin animación (se repiten mucho).
    '[attr.data-modo]': 'modo()',
    '[class.oleada]': 'oleada()',
    '(pointerleave)': 'columna.set(-1)',
  },
})
export class CuadriculaRol {
  readonly sede = input.required<SedeRol>();
  readonly dias = input.required<DiaDelMes[]>();
  readonly hoy = input.required<string>();
  readonly totales = input.required<TotalesSede | undefined>();
  readonly conflictos = input.required<MapaConflictos>();
  readonly codigos = input.required<Map<string, CodigoTurno>>();
  readonly porTecla = input.required<Map<string, CodigoTurno>>();
  readonly sello = input.required<string | null>();
  readonly oleada = input(false);
  /** Turno del cuadro: null = día y noche juntos (los totales muestran ambos). */
  readonly turno = input<Turno | null>(null);
  readonly mensajeVacio = input('Esta sede todavía no tiene agentes. Agréguelos desde Personal.');

  readonly marcar = output<PedidoMarca>();
  readonly inicioTrazo = output<void>();
  readonly finTrazo = output<void>();

  protected readonly etiquetaCargo = CARGO_ETIQUETA;
  protected readonly activa = signal<Posicion>({ fila: 0, dia: 0 });
  /** Columna bajo el puntero, para resaltar el día completo. */
  protected readonly columna = signal(-1);
  protected readonly modo = signal<'puntero' | 'teclado'>('puntero');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private trazo: { codigo: string | null; visitadas: Set<string> } | null = null;

  /** Grupo que nombra la cabecera: el del cuadro, o el de su primer agente si están juntos. */
  protected readonly turnoCabecera = computed<Turno>(() => this.turno() ?? this.sede().filas[0]?.turno ?? 'DIA');

  /** En la vista juntos, antes del primer nocturno va otra fila con las fechas (para no perderse al bajar). */
  protected readonly inicioNoche = computed(() => {
    const filas = this.sede().filas;
    const i = filas.findIndex((f) => f.turno === 'NOCHE');
    return this.turno() === null && i > 0 ? i : -1;
  });

  protected readonly indiceHoy = computed(() => this.dias().findIndex((d) => d.fecha === this.hoy()));

  /** Día completo y por debajo del mínimo: el único caso que merece rojo. */
  protected falta(dia: number): boolean {
    const t = this.totales();
    if (this.turno() === 'NOCHE') return false;
    return !!t?.completos[dia] && (t.dia[dia] ?? 0) < this.sede().minimoDia;
  }

  // ---------- Ratón y pantalla táctil ----------

  protected alPresionar(evento: PointerEvent, fila: number, dia: number): void {
    if (evento.button !== 0) return;
    this.modo.set('puntero');
    evento.preventDefault();
    (evento.target as Element).releasePointerCapture?.(evento.pointerId);
    this.activa.set({ fila, dia });
    this.enfocar(fila, dia);

    // Si se presiona sobre un casillero que ya tiene el mismo sello, el trazo borra.
    const actual = this.sede().filas[fila]?.marcas[dia] ?? null;
    const codigo = actual === this.sello() ? null : this.sello();
    this.trazo = { codigo, visitadas: new Set() };
    this.inicioTrazo.emit();
    this.pintar(fila, dia);

    const mover = (e: PointerEvent) => {
      const celda = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>(
        '[data-celda]',
      );
      if (!celda || !this.host.nativeElement.contains(celda)) return;
      this.pintar(Number(celda.dataset['fila']), Number(celda.dataset['dia']));
    };
    const soltar = () => {
      this.trazo = null;
      this.finTrazo.emit();
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  }

  private pintar(fila: number, dia: number): void {
    if (!this.trazo) return;
    const clave = `${fila}:${dia}`;
    if (this.trazo.visitadas.has(clave)) return;
    this.trazo.visitadas.add(clave);
    this.emitir([{ fila, dia }], this.trazo.codigo);
  }

  // ---------- Teclado ----------

  protected alTeclear(evento: KeyboardEvent): void {
    this.modo.set('teclado');
    const { fila, dia } = this.activa();
    const filas = this.sede().filas.length;
    const columnas = this.dias().length;
    const mover = (f: number, d: number) => {
      evento.preventDefault();
      const destino = { fila: Math.max(0, Math.min(filas - 1, f)), dia: Math.max(0, Math.min(columnas - 1, d)) };
      this.activa.set(destino);
      this.enfocar(destino.fila, destino.dia);
    };

    switch (evento.key) {
      case 'ArrowRight':
        return mover(fila, dia + 1);
      case 'ArrowLeft':
        return mover(fila, dia - 1);
      case 'ArrowDown':
        return mover(fila + 1, dia);
      case 'ArrowUp':
        return mover(fila - 1, dia);
      case 'Home':
        return mover(fila, 0);
      case 'End':
        return mover(fila, columnas - 1);
      case 'Delete':
      case 'Backspace':
        evento.preventDefault();
        this.emitir([{ fila, dia }], null);
        return;
      case 'Enter':
      case ' ':
        evento.preventDefault();
        this.emitir([{ fila, dia }], this.sello());
        return mover(fila, dia + 1);
    }

    if (evento.ctrlKey || evento.metaKey || evento.altKey || evento.key.length !== 1) return;
    const codigo = this.porTecla().get(evento.key.toUpperCase());
    if (!codigo) return;
    evento.preventDefault();
    this.emitir([{ fila, dia }], codigo.codigo);
    mover(fila, dia + 1); // como en Excel: se escribe y se avanza
  }

  protected alEnfocar(fila: number, dia: number): void {
    this.activa.set({ fila, dia });
  }

  private enfocar(fila: number, dia: number): void {
    this.host.nativeElement
      .querySelector<HTMLElement>(`[data-fila="${fila}"][data-dia="${dia}"]`)
      ?.focus({ preventScroll: false });
  }

  private emitir(posiciones: Posicion[], codigo: string | null): void {
    const sede = this.sede();
    const celdas = posiciones
      .map(({ fila, dia }) => ({ agenteId: sede.filas[fila]?.agenteId, dia }))
      .filter((c): c is { agenteId: number; dia: number } => c.agenteId !== undefined)
      .map((c) => ({ ...c, sedeId: sede.id }));
    this.marcar.emit({ celdas, codigo });
  }

  // ---------- Presentación ----------

  protected esClaro(codigo: string | null): boolean {
    return !!codigo && this.codigos().get(codigo)?.colorFondo.toUpperCase() === '#FFFFFF';
  }

  protected conflicto(agenteId: number, dia: number): string[] | undefined {
    return this.conflictos().get(`${agenteId}:${dia}`);
  }

  protected descripcion(nombres: string, dia: DiaDelMes, codigo: string | null): string {
    const marca = codigo ? (this.codigos().get(codigo)?.nombre ?? codigo) : 'sin marcar';
    return `${nombres}, ${dia.dia} (${dia.letra}): ${marca}`;
  }
}
