import { Injectable, computed, inject, signal } from '@angular/core';
import { ImportacionApi, SedesApi } from '../../core/api/api';
import type {
  AnalisisImportacion,
  BloquePrevio,
  PlanImportacion,
  ResultadoImportacion,
  Sede,
} from '../../core/models/dominio';
import { Avisos } from '../../core/services/avisos';
import { MesSeleccionado } from '../../core/services/mes-seleccionado';

const MAX_BYTES = 10 * 1024 * 1024;

export type Paso = 'elegir' | 'leyendo' | 'revisar' | 'guardando' | 'listo';

/** Lo que el usuario decide sobre cada tabla del Excel. */
export interface EleccionBloque {
  incluir: boolean;
  sedeId: number | null;
}

/** Días que tiene un mes AAAA-MM. */
const diasDelMes = (mes: string) => {
  const [anio, m] = mes.split('-').map(Number) as [number, number];
  return new Date(anio, m, 0).getDate();
};

/** Revisa el archivo antes de enviarlo; devuelve el motivo si no sirve. */
function problemaDelArchivo(archivo: File): string | null {
  const nombre = archivo.name.toLowerCase();
  if (nombre.endsWith('.xls')) {
    return 'Ese archivo es de un Excel antiguo (.xls). Ábralo en Excel y use «Guardar como → Libro de Excel (.xlsx)».';
  }
  if (!nombre.endsWith('.xlsx')) return 'Elija un archivo de Excel (.xlsx).';
  if (archivo.size > MAX_BYTES) return 'El archivo pesa más de 10 MB. ¿Es el rol del mes?';
  if (archivo.size === 0) return 'El archivo está vacío.';
  return null;
}

/**
 * Importar el rol desde un Excel, en tres pasos: elegir el archivo, revisar lo que se encontró
 * (y a qué sede va cada tabla) y guardar. Nada se guarda sin pasar por la revisión.
 */
@Injectable()
export class ImportarStore {
  private readonly api = inject(ImportacionApi);
  private readonly avisos = inject(Avisos);
  readonly mes = inject(MesSeleccionado);

  readonly paso = signal<Paso>('elegir');
  readonly archivo = signal<string>('');
  readonly analisis = signal<AnalisisImportacion | null>(null);
  readonly elecciones = signal<Map<number, EleccionBloque>>(new Map());
  /** true: lo que está vacío en el Excel también queda vacío en el sistema. */
  readonly reemplazar = signal(true);
  readonly resultado = signal<ResultadoImportacion | null>(null);
  readonly sedes = signal<Sede[]>([]);

  readonly bloquesIncluidos = computed(() =>
    (this.analisis()?.bloques ?? []).filter((b) => this.elecciones().get(b.id)?.incluir),
  );

  /** Sedes elegidas por más de una tabla (no se permite: se pisarían). */
  readonly sedesRepetidas = computed(() => {
    const vistas = new Set<number>();
    const repetidas = new Set<number>();
    for (const b of this.bloquesIncluidos()) {
      const sedeId = this.elecciones().get(b.id)?.sedeId;
      if (!sedeId) continue;
      if (vistas.has(sedeId)) repetidas.add(sedeId);
      vistas.add(sedeId);
    }
    return repetidas;
  });

  readonly sinSede = computed(() => this.bloquesIncluidos().filter((b) => !this.elecciones().get(b.id)?.sedeId).length);

  readonly cuenta = computed(() => {
    const bloques = this.bloquesIncluidos();
    const filas = bloques.flatMap((b) => b.filas);
    return {
      tablas: bloques.length,
      agentes: filas.length,
      nuevos: new Set(filas.filter((f) => f.agenteId === null).map((f) => f.nombres)).size,
    };
  });

  /** Motivo por el que todavía no se puede importar (null = listo). */
  readonly impedimento = computed(() => {
    if (this.cuenta().tablas === 0) return 'Marque al menos una tabla para importar.';
    if (this.sinSede() > 0) return 'Elija la sede de cada tabla marcada.';
    if (this.sedesRepetidas().size > 0) return 'Dos tablas van a la misma sede. Cambie una de ellas.';
    return null;
  });

  constructor() {
    inject(SedesApi)
      .listar()
      .subscribe((sedes) => this.sedes.set(sedes));
  }

  analizar(archivo: File): void {
    const problema = problemaDelArchivo(archivo);
    if (problema) {
      this.avisos.error(problema);
      return;
    }
    this.archivo.set(archivo.name);
    this.paso.set('leyendo');
    this.api.analizar(archivo).subscribe({
      next: (analisis) => {
        this.analisis.set(analisis);
        this.elecciones.set(
          new Map(analisis.bloques.map((b) => [b.id, { incluir: b.sedeId !== null && b.filas.length > 0, sedeId: b.sedeId }])),
        );
        if (analisis.mes) this.mes.irA(analisis.mes);
        this.paso.set('revisar');
      },
      // El interceptor ya mostró el motivo (p. ej. "no se encontró ninguna tabla de días").
      error: () => this.paso.set('elegir'),
    });
  }

  elegir(bloqueId: number, cambio: Partial<EleccionBloque>): void {
    this.elecciones.update((mapa) => {
      const actual = mapa.get(bloqueId) ?? { incluir: false, sedeId: null };
      const siguiente = { ...actual, ...cambio };
      // Elegir una sede marca la tabla para importar: es lo que se espera.
      if (cambio.sedeId) siguiente.incluir = true;
      return new Map(mapa).set(bloqueId, siguiente);
    });
  }

  importar(): void {
    if (this.impedimento()) return;
    const mes = this.mes.mes();
    const dias = diasDelMes(mes);
    const plan: PlanImportacion = {
      mes,
      reemplazar: this.reemplazar(),
      bloques: this.bloquesIncluidos().map((b) => ({
        sedeId: this.elecciones().get(b.id)!.sedeId!,
        filas: b.filas.map((f) => ({
          nombres: f.nombres,
          cargo: f.cargo,
          agenteId: f.agenteId,
          // Mismo largo que el mes elegido: lo que falta queda vacío, lo que sobra no se usa.
          marcas: Array.from({ length: dias }, (_, i) => f.marcas[i] ?? null),
        })),
      })),
    };
    this.paso.set('guardando');
    this.api.aplicar(plan).subscribe({
      next: (resultado) => {
        this.resultado.set(resultado);
        this.paso.set('listo');
      },
      error: () => this.paso.set('revisar'),
    });
  }

  reiniciar(): void {
    this.analisis.set(null);
    this.elecciones.set(new Map());
    this.resultado.set(null);
    this.archivo.set('');
    this.paso.set('elegir');
  }

  /** Nombre de la sede para mostrar. */
  nombreSede(sedeId: number | null): string {
    return this.sedes().find((s) => s.id === sedeId)?.nombre ?? '';
  }

  /** Cuenta de marcas de una tabla, para el resumen de la tarjeta. */
  marcasDe(bloque: BloquePrevio): number {
    return bloque.filas.reduce((n, f) => n + f.marcas.filter(Boolean).length, 0);
  }
}
