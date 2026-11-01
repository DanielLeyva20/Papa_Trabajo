import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CARGOS_DESCANSEROS, CARGOS_FIJOS, CARGO_ETIQUETA, type Asignacion, type Cargo } from '../../../core/models/dominio';
import { Confirmacion } from '../../../core/services/confirmacion';
import { reglas, soloDigitos } from '../../../core/validacion/reglas';
import { Avatar } from '../../../core/ui/avatar';
import { Icono } from '../../../core/ui/icono';
import { PersonalStore } from '../personal.store';
import { EditorPatron } from './editor-patron';

interface Formulario {
  nombres: string;
  cargo: Cargo;
  dni: string;
  telefono: string;
}

const VACIO: Formulario = { nombres: '', cargo: 'SIMPLE', dni: '', telefono: '' };

@Component({
  selector: 'app-editor-agente',
  imports: [Icono, Avatar, EditorPatron],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './editor-agente.html',
  styleUrl: './editor-agente.scss',
})
export class EditorAgente {
  protected readonly store = inject(PersonalStore);
  private readonly confirmacion = inject(Confirmacion);

  /** Los descanseros cubren los días libres de los fijos; van aparte para no confundirlos. */
  protected readonly gruposCargo = [
    { titulo: 'Fijos', cargos: CARGOS_FIJOS },
    { titulo: 'Descanseros (cubren días libres)', cargos: CARGOS_DESCANSEROS },
  ];
  protected readonly etiquetaCargo = CARGO_ETIQUETA;
  protected readonly form = signal<Formulario>({ ...VACIO });
  protected readonly sedeNueva = signal<number | null>(null);

  protected readonly agente = this.store.agenteSeleccionado;
  protected readonly esNuevo = computed(() => this.store.seleccion() === 'nuevo');
  /** Campos que el usuario ya tocó: sus errores se muestran desde ese momento. */
  protected readonly tocados = signal<Set<keyof Formulario>>(new Set());
  protected readonly errores = computed(() => {
    const f = this.form();
    const servidor = this.store.errorCampo();
    return {
      nombres: reglas.nombrePersona(f.nombres) ?? (servidor?.campo === 'nombres' ? servidor.mensaje : null),
      dni: reglas.dni(f.dni) ?? (servidor?.campo === 'dni' ? servidor.mensaje : null),
      telefono: reglas.telefono(f.telefono) ?? (servidor?.campo === 'telefono' ? servidor.mensaje : null),
    };
  });
  protected readonly formularioValido = computed(() => Object.values(this.errores()).every((e) => e === null));
  protected readonly tieneFoto = computed(() => !!this.store.fotoNueva() || !!this.agente()?.fotoVersion);
  protected readonly arrastrando = signal(false);

  // ---------- Foto ----------

  protected alElegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    if (archivo) void this.store.cambiarFoto(archivo);
    entrada.value = ''; // permite volver a elegir el mismo archivo
  }

  protected alArrastrar(evento: DragEvent, encima: boolean): void {
    evento.preventDefault();
    this.arrastrando.set(encima);
  }

  protected alSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    const archivo = evento.dataTransfer?.files[0];
    if (archivo) void this.store.cambiarFoto(archivo);
  }

  constructor() {
    effect(() => {
      const agente = this.agente();
      this.form.set(
        agente
          ? { nombres: agente.nombres, cargo: agente.cargo, dni: agente.dni ?? '', telefono: agente.telefono ?? '' }
          : { ...VACIO },
      );
      this.sedeNueva.set(null);
      this.tocados.set(new Set());
      this.store.errorCampo.set(null);
    });
  }

  protected editar<K extends keyof Formulario>(campo: K, valor: Formulario[K]): void {
    // DNI y teléfono solo aceptan dígitos mientras se escribe.
    const limpio = campo === 'dni' ? soloDigitos(String(valor), 8) : campo === 'telefono' ? soloDigitos(String(valor), 9) : valor;
    this.form.update((f) => ({ ...f, [campo]: limpio }));
    if (this.store.errorCampo()?.campo === campo) this.store.errorCampo.set(null);
  }

  protected tocar(campo: keyof Formulario): void {
    this.tocados.update((t) => new Set(t).add(campo));
  }

  /** Error visible de un campo: solo si ya se tocó o si el servidor lo rechazó. */
  protected error(campo: 'nombres' | 'dni' | 'telefono'): string | null {
    const visible = this.tocados().has(campo) || this.store.errorCampo()?.campo === campo;
    return visible ? this.errores()[campo] : null;
  }

  protected guardar(evento: Event): void {
    evento.preventDefault();
    this.tocados.set(new Set(['nombres', 'dni', 'telefono']));
    if (!this.formularioValido() || this.store.guardando()) return;
    const f = this.form();
    this.store.guardarAgente({
      nombres: f.nombres.trim().replace(/\s+/g, ' ').toUpperCase(),
      cargo: f.cargo,
      dni: f.dni.trim() || null,
      telefono: f.telefono.trim() || null,
    });
  }

  protected asignar(): void {
    const sedeId = this.sedeNueva();
    if (sedeId) this.store.asignar(sedeId, this.form().cargo);
    this.sedeNueva.set(null);
  }

  protected async retirar(asignacion: Asignacion): Promise<void> {
    const sede = this.store.sedes().find((s) => s.id === asignacion.sedeId)?.nombre ?? 'esta sede';
    const ok = await this.confirmacion.preguntar({
      titulo: '¿Quitar de esta sede?',
      mensaje: `${asignacion.nombres} dejará de aparecer en "${sede}" desde ${this.store.mes.nombre()}. Los meses anteriores no cambian.`,
      aceptar: 'Sí, quitar',
      peligro: true,
    });
    if (ok) this.store.retirar(asignacion);
  }

  protected async darDeBaja(): Promise<void> {
    const agente = this.agente();
    if (!agente) return;
    const ok = await this.confirmacion.preguntar({
      titulo: `¿Dar de baja a ${agente.nombres}?`,
      mensaje: `Dejará de aparecer en todas las sedes desde ${this.store.mes.nombre()}. Lo ya registrado en meses anteriores se conserva.`,
      aceptar: 'Sí, dar de baja',
      peligro: true,
    });
    if (ok) this.store.darDeBaja(agente.id);
  }

  protected nombreSede(sedeId: number): string {
    return this.store.sedes().find((s) => s.id === sedeId)?.nombre ?? '';
  }
}
