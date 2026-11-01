import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Agente,
  Asignacion,
  CambioMarca,
  Cargo,
  CodigoTurno,
  Configuracion,
  Feriado,
  PatronSemanal,
  InfoRespaldo,
  ResumenMensual,
  RolMensual,
  Sede,
} from '../models/dominio';

const BASE = '/api';

export interface AgenteDatos {
  nombres: string;
  cargo: Cargo;
  dni: string | null;
  telefono: string | null;
}

export type AlcanceReporte = 'completo' | 'hasta-hoy';

/** Acceso con PIN: la sesión vive en una cookie que el navegador envía sola. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  sesion(): Observable<{ activa: boolean }> {
    return this.http.get<{ activa: boolean }>(`${BASE}/auth/sesion`);
  }

  ingresar(pin: string): Observable<{ activa: boolean }> {
    return this.http.post<{ activa: boolean }>(`${BASE}/auth/ingresar`, { pin });
  }

  salir(): Observable<{ activa: boolean }> {
    return this.http.post<{ activa: boolean }>(`${BASE}/auth/salir`, {});
  }
}

/** Cliente de catálogos: marcas, sedes y datos del documento. */
@Injectable({ providedIn: 'root' })
export class CatalogoApi {
  private readonly http = inject(HttpClient);

  codigos(): Observable<CodigoTurno[]> {
    return this.http.get<CodigoTurno[]>(`${BASE}/codigos`);
  }

  configuracion(): Observable<Configuracion> {
    return this.http.get<Configuracion>(`${BASE}/configuracion`);
  }

  guardarConfiguracion(datos: Configuracion): Observable<Configuracion> {
    return this.http.put<Configuracion>(`${BASE}/configuracion`, datos);
  }
}

@Injectable({ providedIn: 'root' })
export class SedesApi {
  private readonly http = inject(HttpClient);

  listar(todas = false): Observable<Sede[]> {
    return this.http.get<Sede[]>(`${BASE}/sedes`, { params: { todas } });
  }

  crear(datos: Omit<Sede, 'id' | 'orden'>): Observable<Sede> {
    return this.http.post<Sede>(`${BASE}/sedes`, datos);
  }

  actualizar(id: number, datos: Omit<Sede, 'id' | 'orden'>): Observable<Sede> {
    return this.http.put<Sede>(`${BASE}/sedes/${id}`, datos);
  }

  ordenar(ids: number[]): Observable<Sede[]> {
    return this.http.put<Sede[]>(`${BASE}/sedes/orden`, { ids });
  }
}

@Injectable({ providedIn: 'root' })
export class AgentesApi {
  private readonly http = inject(HttpClient);

  listar(mes: string, todos = false): Observable<Agente[]> {
    return this.http.get<Agente[]>(`${BASE}/agentes`, { params: { mes, todos } });
  }

  crear(datos: AgenteDatos): Observable<Agente> {
    return this.http.post<Agente>(`${BASE}/agentes`, datos);
  }

  actualizar(id: number, datos: AgenteDatos): Observable<Agente> {
    return this.http.put<Agente>(`${BASE}/agentes/${id}`, datos);
  }

  darDeBaja(id: number, desde: string): Observable<Agente> {
    return this.http.post<Agente>(`${BASE}/agentes/${id}/baja`, { desde });
  }

  reactivar(id: number): Observable<Agente> {
    return this.http.post<Agente>(`${BASE}/agentes/${id}/reactivar`, {});
  }

  /** La imagen ya va recortada y comprimida desde el navegador. */
  subirFoto(id: number, imagen: Blob): Observable<Agente> {
    return this.http.put<Agente>(`${BASE}/agentes/${id}/foto`, imagen, {
      headers: { 'Content-Type': imagen.type },
    });
  }

  quitarFoto(id: number): Observable<Agente> {
    return this.http.delete<Agente>(`${BASE}/agentes/${id}/foto`);
  }
}

@Injectable({ providedIn: 'root' })
export class FeriadosApi {
  private readonly http = inject(HttpClient);

  delAnio(anio: number): Observable<Feriado[]> {
    return this.http.get<Feriado[]>(`${BASE}/feriados`, { params: { anio } });
  }

  agregar(fecha: string, nombre: string): Observable<Feriado[]> {
    return this.http.post<Feriado[]>(`${BASE}/feriados`, { fecha, nombre });
  }

  quitar(fecha: string): Observable<Feriado[]> {
    return this.http.delete<Feriado[]>(`${BASE}/feriados/${fecha}`);
  }
}

@Injectable({ providedIn: 'root' })
export class AsignacionesApi {
  private readonly http = inject(HttpClient);

  delAgente(agenteId: number, mes: string): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(`${BASE}/asignaciones`, { params: { agenteId, mes } });
  }

  deSede(sedeId: number, mes: string): Observable<Asignacion[]> {
    return this.http.get<Asignacion[]>(`${BASE}/asignaciones`, { params: { sedeId, mes } });
  }

  crear(datos: { agenteId: number; sedeId: number; desde: string; patron: PatronSemanal }): Observable<Asignacion> {
    return this.http.post<Asignacion>(`${BASE}/asignaciones`, datos);
  }

  cambiarPatron(id: number, patron: PatronSemanal): Observable<Asignacion> {
    return this.http.put<Asignacion>(`${BASE}/asignaciones/${id}/patron`, { patron });
  }

  ordenar(ids: number[]): Observable<void> {
    return this.http.put<void>(`${BASE}/asignaciones/orden`, { ids });
  }

  retirar(id: number, desde: string): Observable<void> {
    return this.http.post<void>(`${BASE}/asignaciones/${id}/retirar`, { desde });
  }
}

@Injectable({ providedIn: 'root' })
export class RolApi {
  private readonly http = inject(HttpClient);

  obtener(mes: string): Observable<RolMensual> {
    return this.http.get<RolMensual>(`${BASE}/rol`, { params: { mes } });
  }

  resumen(mes: string): Observable<ResumenMensual> {
    return this.http.get<ResumenMensual>(`${BASE}/rol/resumen`, { params: { mes } });
  }

  guardarMarcas(cambios: CambioMarca[]): Observable<void> {
    return this.http.put<void>(`${BASE}/rol/marcas`, { cambios });
  }

  generar(mes: string, opciones: { sedeId?: number; sobrescribir: boolean }): Observable<{ marcados: number }> {
    return this.http.post<{ marcados: number }>(`${BASE}/rol/generar`, { mes, ...opciones });
  }

  limpiar(mes: string, sedeId?: number): Observable<{ borrados: number }> {
    return this.http.post<{ borrados: number }>(`${BASE}/rol/limpiar`, { mes, sedeId });
  }
}

@Injectable({ providedIn: 'root' })
export class ReportesApi {
  private readonly http = inject(HttpClient);

  /** URL directa: el navegador descarga el archivo con el nombre que envía el servidor. */
  url(formato: 'excel' | 'pdf', mes: string, alcance: AlcanceReporte): string {
    return `${BASE}/reportes/${formato}?mes=${mes}&alcance=${alcance}`;
  }

  respaldo(): Observable<InfoRespaldo> {
    return this.http.get<InfoRespaldo>(`${BASE}/respaldo`);
  }

  readonly urlRespaldo = `${BASE}/respaldo/descargar`;
}
