import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RolApi, ReportesApi, type AlcanceReporte } from '../../core/api/api';
import { CARGO_ETIQUETA, type Cargo } from '../../core/models/dominio';
import { Avisos } from '../../core/services/avisos';
import { Catalogo } from '../../core/services/catalogo';
import { MesSeleccionado } from '../../core/services/mes-seleccionado';
import { Icono, type NombreIcono } from '../../core/ui/icono';
import { SelectorMes } from '../../core/ui/selector-mes';

interface Formato {
  id: 'excel' | 'pdf';
  titulo: string;
  descripcion: string;
  icono: NombreIcono;
}

@Component({
  selector: 'app-descargas-page',
  imports: [Icono, SelectorMes],
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
  protected readonly cargosCuadro: Cargo[] = ['ARMADO', 'SIMPLE', 'FEMINA', 'SUPERVISOR'];

  protected readonly formatos: Formato[] = [
    {
      id: 'excel',
      titulo: 'Excel',
      descripcion: 'El rol con colores y fórmulas de TOTAL DÍA, el cuadro de distribución y el resumen por agente. Se puede seguir editando en Excel.',
      icono: 'FileSpreadsheet',
    },
    {
      id: 'pdf',
      titulo: 'PDF',
      descripcion: 'Listo para imprimir o enviar por WhatsApp o correo. Incluye el cuadro de distribución y la línea de firma.',
      icono: 'FileText',
    },
  ];

  protected readonly resumen = rxResource({
    params: () => this.mes.mes(),
    stream: ({ params: mes }) => this.rolApi.resumen(mes),
  });

  protected readonly respaldo = rxResource({ stream: () => this.reportes.respaldo() });

  protected url(formato: Formato['id'], alcance: AlcanceReporte): string {
    return this.reportes.url(formato, this.mes.mes(), alcance);
  }

  protected avisarDescarga(): void {
    this.avisos.info('Preparando el archivo… se guardará en su carpeta de Descargas.');
  }
}
