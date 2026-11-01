import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { RolApi, ReportesApi, type AlcanceReporte, type TipoReporte } from '../../core/api/api';
import { CARGO_ETIQUETA, type CargoBase, type VistaTurno } from '../../core/models/dominio';
import { Avisos } from '../../core/services/avisos';
import { Catalogo } from '../../core/services/catalogo';
import { MesSeleccionado } from '../../core/services/mes-seleccionado';
import { Deslizante } from '../../core/ui/deslizante';
import { Icono, type NombreIcono } from '../../core/ui/icono';
import { SelectorMes } from '../../core/ui/selector-mes';

type Formato = 'excel' | 'pdf';

interface Reporte {
  id: TipoReporte;
  titulo: string;
  descripcion: string;
  icono: NombreIcono;
}

const REPORTES: Reporte[] = [
  {
    id: 'rol',
    titulo: 'Rol del mes',
    descripcion: 'El documento oficial: el cuadro de cada sede con sus colores, TOTAL DÍA, la distribución de agentes y la línea de firma.',
    icono: 'CalendarDays',
  },
  {
    id: 'general',
    titulo: 'Reporte general · día y noche',
    descripcion: 'Promedio de agentes por día en cada sede, días por debajo del mínimo y lo que trabajó cada agente diurno y nocturno.',
    icono: 'SunMoon',
  },
  {
    id: 'ausencias',
    titulo: 'Faltas, descansos médicos y permisos',
    descripcion: 'Cuántas faltas, descansos médicos, permisos y vacaciones tuvo cada agente, con el detalle de cada fecha.',
    icono: 'UserMinus',
  },
];

const VISTAS: { valor: VistaTurno; etiqueta: string }[] = [
  { valor: 'juntos', etiqueta: 'Todos juntos' },
  { valor: 'separados', etiqueta: 'Día y noche separados' },
  { valor: 'dia', etiqueta: 'Solo día' },
  { valor: 'noche', etiqueta: 'Solo noche' },
];

@Component({
  selector: 'app-descargas-page',
  imports: [Icono, SelectorMes, Deslizante, RouterLink],
  templateUrl: './descargas-page.html',
  styleUrl: './descargas-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DescargasPage {
  private readonly rolApi = inject(RolApi);
  protected readonly reportes = inject(ReportesApi);
  private readonly avisos = inject(Avisos);
  protected readonly catalogo = inject(Catalogo);
  protected readonly mes = inject(MesSeleccionado);

  protected readonly etiquetaCargo = CARGO_ETIQUETA;
  protected readonly cargosCuadro: CargoBase[] = ['ARMADO', 'SIMPLE', 'FEMINA', 'SUPERVISOR'];
  protected readonly lista = REPORTES;
  protected readonly vistas = VISTAS;

  /** Solo el mes en curso puede descargarse "hasta hoy"; los demás siempre van completos. */
  private readonly alcanceElegido = signal<AlcanceReporte>('completo');
  protected readonly alcance = computed<AlcanceReporte>(() => (this.mes.esActual() ? this.alcanceElegido() : 'completo'));
  protected readonly vista = signal<VistaTurno>('juntos');

  protected readonly resumen = rxResource({
    params: () => this.mes.mes(),
    stream: ({ params: mes }) => this.rolApi.resumen(mes),
  });

  protected readonly respaldo = rxResource({ stream: () => this.reportes.respaldo() });

  protected elegirAlcance(alcance: AlcanceReporte): void {
    this.alcanceElegido.set(alcance);
  }

  protected url(reporte: TipoReporte, formato: Formato): string {
    return this.reportes.url(reporte, formato, this.mes.mes(), this.alcance(), this.vista());
  }

  protected avisarDescarga(): void {
    this.avisos.info('Preparando el archivo… se guardará en su carpeta de Descargas.');
  }
}
