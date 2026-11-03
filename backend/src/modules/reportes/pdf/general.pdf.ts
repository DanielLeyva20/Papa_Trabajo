import { CARGO_ETIQUETA } from '../../../shared/domain.js';
import type { AgenteGeneral, SedeGeneral } from '../datos/general.js';
import type { DatosGeneral } from '../reportes.types.js';
import { cifras, crearDocumento, encabezado, tabla, type ColumnaPdf } from './comun.js';

/** Reporte general en PDF: cifras clave, tabla por sede y listas de diurnos y nocturnos. */
export function construirGeneralPdf(datos: DatosGeneral): Promise<Buffer> {
  const { general } = datos;
  const { doc, terminar } = crearDocumento(`Reporte general – ${datos.nombreMes}`, datos.config.supervisor);

  encabezado(
    doc,
    `REPORTE GENERAL – ${datos.nombreMes.toUpperCase()}`,
    `${datos.config.entidad.toUpperCase()}  ·  SUP. ${datos.config.supervisor.toUpperCase()}  ·  ${datos.corte}  ·  ${general.diasConsiderados} días`,
  );
  cifras(doc, [
    { etiqueta: 'Agentes de día', valor: String(general.diurnos.length) },
    { etiqueta: 'Agentes de noche', valor: String(general.nocturnos.length) },
    { etiqueta: 'Promedio de día por jornada', valor: String(general.totales.promedioDia) },
    { etiqueta: 'Promedio de noche por jornada', valor: String(general.totales.promedioNoche) },
    { etiqueta: 'Días bajo el mínimo', valor: String(general.totales.diasBajoMinimo) },
  ]);

  const colSedes: ColumnaPdf<SedeGeneral>[] = [
    { titulo: 'N.º', peso: 3, valor: (_s, i) => String(i + 1) },
    { titulo: 'Sede / Dependencia', peso: 30, valor: (s) => s.nombre, alinear: 'left', negrita: true },
    { titulo: 'Agentes día', peso: 7, valor: (s) => String(s.agentesDia), numerica: true },
    { titulo: 'Agentes noche', peso: 7, valor: (s) => String(s.agentesNoche), numerica: true },
    { titulo: 'Turnos día', peso: 7, valor: (s) => String(s.turnosDia), numerica: true },
    { titulo: 'Turnos noche', peso: 7, valor: (s) => String(s.turnosNoche), numerica: true },
    { titulo: 'Prom. día', peso: 7, valor: (s) => String(s.promedioDia), numerica: true, negrita: true },
    { titulo: 'Prom. noche', peso: 7, valor: (s) => String(s.promedioNoche), numerica: true, negrita: true },
    { titulo: 'Mínimo', peso: 6, valor: (s) => String(s.minimoDia), numerica: true },
    { titulo: 'Días bajo mín.', peso: 8, valor: (s) => String(s.diasBajoMinimo), numerica: true, alerta: (s) => s.diasBajoMinimo > 0 },
  ];
  tabla(doc, colSedes, general.sedes, {
    titulo: 'Por sede',
    totales: [
      '', 'TOTAL', String(general.diurnos.length), String(general.nocturnos.length),
      String(general.totales.turnosDia), String(general.totales.turnosNoche),
      String(general.totales.promedioDia), String(general.totales.promedioNoche), '', String(general.totales.diasBajoMinimo),
    ],
  });

  const colAgentes: ColumnaPdf<AgenteGeneral>[] = [
    { titulo: 'N.º', peso: 3, valor: (_a, i) => String(i + 1) },
    { titulo: 'Apellidos y nombres', peso: 24, valor: (a) => a.nombres, alinear: 'left', negrita: true },
    { titulo: 'Cargo', peso: 13, valor: (a) => CARGO_ETIQUETA[a.cargo], alinear: 'left' },
    { titulo: 'Sedes', peso: 16, valor: (a) => a.sedes.join(', '), alinear: 'left' },
    ...datos.codigos.map(
      (t): ColumnaPdf<AgenteGeneral> => ({
        titulo: t.codigo,
        peso: 4,
        valor: (a) => String(a.conteos[t.codigo] ?? 0),
        numerica: true,
        cabecera: { fondo: t.colorFondo, texto: t.colorTexto },
      }),
    ),
    { titulo: 'Trabajados', peso: 7, valor: (a) => String(a.turnosDia + a.turnosNoche), negrita: true, numerica: true },
  ];
  tabla(doc, colAgentes, general.diurnos, { titulo: 'Agentes de día (diurnos)', vacio: 'No hay agentes en este turno.' });
  tabla(doc, colAgentes, general.nocturnos, { titulo: 'Agentes de noche (nocturnos)', vacio: 'No hay agentes en este turno.' });

  return terminar(`Generado el ${datos.generadoEn}`);
}
