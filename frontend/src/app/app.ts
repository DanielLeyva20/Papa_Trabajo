import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IndicadorGuardado } from './core/services/estado-guardado';
import { Avisos } from './core/services/avisos';
import { Confirmacion } from './core/services/confirmacion';
import { Sesion } from './core/services/sesion';
import { TemaVisual } from './core/services/tema';
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
  host: {
    '(document:keydown)': 'atajos($event)',
    '(window:beforeunload)': 'alSalirDeLaPagina($event)',
  },
})
export class App {
  private readonly indicador = inject(IndicadorGuardado);
  private readonly confirmacion = inject(Confirmacion);
  private readonly avisos = inject(Avisos);
  protected readonly sesion = inject(Sesion);
  protected readonly tema = inject(TemaVisual);

  protected readonly enlaces: EnlaceNav[] = [
    { ruta: '/rol', texto: 'Rol del mes', icono: 'CalendarDays' },
    { ruta: '/personal', texto: 'Personal', icono: 'Users' },
    { ruta: '/sedes', texto: 'Sedes', icono: 'Building2' },
    { ruta: '/feriados', texto: 'Feriados', icono: 'CalendarHeart' },
    { ruta: '/descargas', texto: 'Descargas', icono: 'Download' },
  ];

  protected readonly estado = this.indicador.estado;
  private readonly hora = computed(() =>
    this.indicador.ultimaVez()?.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
  );

  protected readonly textoEstado = computed(() => {
    switch (this.estado()) {
      case 'pendiente':
        return 'Guardar cambios';
      case 'guardando':
        return 'Guardando…';
      case 'error':
        return 'Reintentar guardar';
      default:
        return 'Guardado';
    }
  });

  protected readonly tituloGuardar = computed(() => {
    if (this.estado() === 'listo') return this.hora() ? `Todo guardado (${this.hora()})` : 'Todo está guardado';
    return 'Guardar ahora (Ctrl+S). Si no lo pulsa, se guarda solo en unos segundos.';
  });

  /** Para lectores de pantalla: solo los momentos que importan. */
  protected readonly anuncioEstado = computed(() =>
    this.estado() === 'listo' && this.hora() ? 'Cambios guardados' : this.estado() === 'error' ? 'No se pudieron guardar los cambios' : '',
  );

  protected async guardar(): Promise<void> {
    if (this.estado() === 'listo') {
      this.avisos.info(this.hora() ? `Todo está guardado. Último guardado a las ${this.hora()}.` : 'Todo está guardado.');
      return;
    }
    // Si falla, la pantalla ya avisa y el botón queda en «Reintentar guardar».
    if (await this.indicador.guardarTodo()) this.avisos.exito('Cambios guardados.');
  }

  /** Ctrl+S (o Cmd+S) guarda, como en Excel; nunca abre el «Guardar página» del navegador. */
  protected atajos(evento: KeyboardEvent): void {
    if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 's') {
      evento.preventDefault();
      if (this.sesion.estado() === 'activa') void this.guardar();
    }
  }

  /** Si quedan cambios sin guardar, el navegador pregunta antes de cerrar la pestaña. */
  protected alSalirDeLaPagina(evento: BeforeUnloadEvent): void {
    if (this.estado() === 'listo') return;
    void this.indicador.guardarTodo();
    evento.preventDefault();
  }

  protected async salir(): Promise<void> {
    const ok = await this.confirmacion.preguntar({
      titulo: '¿Salir del sistema?',
      mensaje: 'Para volver a entrar tendrá que escribir el PIN.',
      aceptar: 'Salir',
    });
    if (ok) await this.sesion.salir();
  }
}
