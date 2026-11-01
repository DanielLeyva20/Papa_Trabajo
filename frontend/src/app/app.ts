import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IndicadorGuardado } from './core/services/estado-guardado';
import { Confirmacion } from './core/services/confirmacion';
import { Sesion } from './core/services/sesion';
import { CapaAvisos } from './core/ui/capa-avisos';
import { Deslizante } from './core/ui/deslizante';
import { DialogoConfirmacion } from './core/ui/dialogo-confirmacion';
import { Icono, type NombreIcono } from './core/ui/icono';

interface EnlaceNav {
  ruta: string;
  texto: string;
  icono: NombreIcono;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono, CapaAvisos, DialogoConfirmacion, Deslizante],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly indicador = inject(IndicadorGuardado);
  private readonly confirmacion = inject(Confirmacion);
  protected readonly sesion = inject(Sesion);

  protected readonly enlaces: EnlaceNav[] = [
    { ruta: '/rol', texto: 'Rol del mes', icono: 'CalendarDays' },
    { ruta: '/personal', texto: 'Personal', icono: 'Users' },
    { ruta: '/sedes', texto: 'Sedes', icono: 'Building2' },
    { ruta: '/feriados', texto: 'Feriados', icono: 'CalendarHeart' },
    { ruta: '/descargas', texto: 'Descargas', icono: 'Download' },
  ];

  protected readonly estado = this.indicador.estado;
  protected readonly textoEstado = computed(() => {
    switch (this.estado()) {
      case 'guardando':
        return 'Guardando…';
      case 'error':
        return 'Sin guardar';
      default: {
        const hora = this.indicador.ultimaVez();
        return hora
          ? `Guardado ${hora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
          : 'Guardado';
      }
    }
  });

  protected async salir(): Promise<void> {
    const ok = await this.confirmacion.preguntar({
      titulo: '¿Salir del sistema?',
      mensaje: 'Para volver a entrar tendrá que escribir el PIN.',
      aceptar: 'Salir',
    });
    if (ok) await this.sesion.salir();
  }
}
