import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FeriadosApi } from '../../core/api/api';
import type { Feriado } from '../../core/models/dominio';
import { Avisos } from '../../core/services/avisos';
import { MESES, hoyEnPeru } from '../../core/services/calendario';
import { Confirmacion } from '../../core/services/confirmacion';
import { Icono } from '../../core/ui/icono';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MS_DIA = 86_400_000;

interface FeriadoVista extends Feriado {
  dia: number;
  mesCorto: string;
  diaSemana: string;
  pasado: boolean;
}

@Component({
  selector: 'app-feriados-page',
  imports: [Icono],
  templateUrl: './feriados-page.html',
  styleUrl: './feriados-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeriadosPage {
  private readonly api = inject(FeriadosApi);
  private readonly avisos = inject(Avisos);
  private readonly confirmacion = inject(Confirmacion);

  private readonly hoy = hoyEnPeru();
  protected readonly anio = signal(Number(this.hoy.slice(0, 4)));
  protected readonly nueva = signal({ fecha: '', nombre: '' });

  protected readonly feriados = rxResource({
    params: () => this.anio(),
    stream: ({ params: anio }) => this.api.delAnio(anio),
  });

  private readonly lista = computed<FeriadoVista[]>(() =>
    (this.feriados.hasValue() ? this.feriados.value() : []).map((f) => {
      const [y, m, d] = f.fecha.split('-').map(Number) as [number, number, number];
      return {
        ...f,
        dia: d,
        mesCorto: MESES[m - 1]!.slice(0, 3).toUpperCase(),
        diaSemana: DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!,
        pasado: f.fecha < this.hoy,
      };
    }),
  );

  /** Feriados agrupados por mes, en orden. */
  protected readonly porMes = computed(() => {
    const grupos = new Map<number, FeriadoVista[]>();
    for (const f of this.lista()) {
      const mes = Number(f.fecha.slice(5, 7));
      grupos.set(mes, [...(grupos.get(mes) ?? []), f]);
    }
    return [...grupos].map(([mes, items]) => ({ nombre: MESES[mes - 1]!, items }));
  });

  protected readonly proximo = computed(() => {
    const siguiente = this.lista().find((f) => f.fecha >= this.hoy);
    if (!siguiente) return null;
    const dias = Math.round((Date.parse(siguiente.fecha) - Date.parse(this.hoy)) / MS_DIA);
    return { ...siguiente, faltan: dias };
  });

  protected readonly cuentaLocales = computed(() => this.lista().filter((f) => f.tipo === 'LOCAL').length);

  protected cambiarAnio(delta: number): void {
    this.anio.update((a) => a + delta);
  }

  protected agregar(evento: Event): void {
    evento.preventDefault();
    const { fecha, nombre } = this.nueva();
    if (!fecha || !nombre.trim()) return;
    this.api.agregar(fecha, nombre.trim()).subscribe(() => {
      this.avisos.exito(`Feriado «${nombre.trim()}» agregado. Se verá en rojo en el rol.`);
      this.nueva.set({ fecha: '', nombre: '' });
      if (Number(fecha.slice(0, 4)) === this.anio()) this.feriados.reload();
      else this.anio.set(Number(fecha.slice(0, 4)));
    });
  }

  protected async quitar(feriado: Feriado): Promise<void> {
    const ok = await this.confirmacion.preguntar({
      titulo: `¿Quitar «${feriado.nombre}»?`,
      mensaje: 'Ese día volverá a verse como un día normal en el rol.',
      aceptar: 'Quitar feriado',
      peligro: true,
    });
    if (!ok) return;
    this.api.quitar(feriado.fecha).subscribe(() => {
      this.avisos.info('Feriado quitado.');
      this.feriados.reload();
    });
  }
}
