import { CARGO_ETIQUETA } from '../../../shared/domain.js';
import type { Ausencia, AusenciasAgente } from '../datos/ausencias.js';
import type { DatosAusencias } from '../reportes.types.js';
import { cifras, crearDocumento, encabezado, tabla, type ColumnaPdf } from './comun.js';

/** Faltas, descansos médicos, permisos y vacaciones en PDF: cifras, resumen por agente y detalle. */
export function construirAusenciasPdf(datos: DatosAusencias): Promise<Buffer> {
  const { ausencias } = datos;
  const { doc, terminar } = crearDocumento(`Ausencias – ${datos.nombreMes}`, datos.config.supervisor);

  encabezado(
    doc,
    `FALTAS, DESCANSOS MÉDICOS Y PERMISOS – ${datos.nombreMes.toUpperCase()}`,
    `${datos.config.entidad.toUpperCase()}  ·  SUP. ${datos.config.supervisor.toUpperCase()}  ·  ${datos.corte}`,
  );
  cifras(doc, [
    ...ausencias.tipos.map((t) => ({ etiqueta: t.nombre, valor: String(ausencias.totales[t.codigo] ?? 0) })),
    { etiqueta: 'Total', valor: String(ausencias.totales.total) },
  ]);

  const vacio = 'No se registraron ausencias en este período.';
  const colResumen: ColumnaPdf<AusenciasAgente>[] = [
    { titulo: 'N.º', peso: 3, valor: (_a, i) => String(i + 1) },
    { titulo: 'Apellidos y nombres', peso: 24, valor: (a) => a.nombres, alinear: 'left', negrita: true },
    { titulo: 'Cargo', peso: 13, valor: (a) => CARGO_ETIQUETA[a.cargo] },
    { titulo: 'Sedes', peso: 16, valor: (a) => a.sedes.join(', '), alinear: 'left' },
    ...ausencias.tipos.map(
      (t): ColumnaPdf<AusenciasAgente> => ({
        titulo: t.nombre,
        peso: 9,
        valor: (a) => String(a.conteos[t.codigo] ?? 0),
        cabecera: { fondo: t.colorFondo, texto: t.colorTexto },
      }),
    ),
    { titulo: 'Total', peso: 6, valor: (a) => String(a.total), negrita: true },
  ];
  tabla(doc, colResumen, ausencias.porAgente, {
    titulo: 'Resumen por agente',
    vacio,
    totales: ['', 'TOTAL', '', '', ...ausencias.tipos.map((t) => String(ausencias.totales[t.codigo] ?? 0)), String(ausencias.totales.total)],
  });

  const colDetalle: ColumnaPdf<Ausencia>[] = [
    { titulo: 'Fecha', peso: 8, valor: (a) => a.fecha.split('-').reverse().join('/') },
    { titulo: 'Día', peso: 4, valor: (a) => a.letra },
    { titulo: 'Apellidos y nombres', peso: 26, valor: (a) => a.nombres, alinear: 'left', negrita: true },
    { titulo: 'Cargo', peso: 14, valor: (a) => CARGO_ETIQUETA[a.cargo] },
    { titulo: 'Sede', peso: 12, valor: (a) => a.sede },
    { titulo: 'Marca', peso: 5, valor: (a) => a.codigo, negrita: true },
    { titulo: 'Tipo', peso: 14, valor: (a) => a.tipo, alinear: 'left' },
  ];
  tabla(doc, colDetalle, ausencias.detalle, { titulo: 'Detalle día por día', vacio });

  return terminar(`Generado el ${datos.generadoEn}`);
}
