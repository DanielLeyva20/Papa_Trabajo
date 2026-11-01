# Rol de Turnos — Distrito Fiscal de Cañete

Sistema web para llenar el **ROL DF** mensual: qué agente cubre día (D), noche (N), está libre (L) o ausente (F, V, DM, P) en cada una de las 9 sedes, con totales automáticos, fotos del personal, feriados del Perú y descarga en **Excel** y **PDF**.

Corre en la nube: **Render** (servidor + pantalla) y **Turso** (base de datos SQLite). El acceso está protegido con un **PIN de 6 dígitos**.

➡️ **Para publicarlo, siga [DESPLIEGUE.md](DESPLIEGUE.md).**

---

## Uso diario

Abra la dirección del sistema (p. ej. `https://rol-turnos.onrender.com`), escriba el PIN y listo: el navegador lo recuerda 30 días.

| Pantalla | Para qué sirve |
| --- | --- |
| **Rol del mes** | Elegir el mes con las flechas, elegir la sede y marcar. **Llenar mes automático** pone a cada agente su turno habitual y su día libre; después solo se corrigen las excepciones. |
| **Personal** | Agregar agentes, **subir su foto** (botón de cámara o arrastrar la imagen al círculo), cambiar su cargo, asignarlos a sedes y definir su **semana habitual**. Dar de baja sin perder historial. |
| **Sedes** | Nombre oficial, nombre corto de la pestaña, orden de sedes y de agentes, **mínimo de agentes de día** y el encabezado/firma de los documentos. |
| **Feriados** | Feriados nacionales del Perú (se calculan solos cada año, incluida Semana Santa) y feriados locales que se agreguen a mano. Solo estos días se ven en rojo. |
| **Descargas** | Excel o PDF del mes: **avance hasta hoy** o **mes completo**. Resumen por agente, cuadro de distribución y copia de seguridad. |

**Marcar:** elija un sello (D, N, L, F, V, DM, P) en la barra inferior y haga clic o arrastre sobre los casilleros. También funciona como Excel: escriba la letra (`M` = descanso médico), muévase con las flechas, `Supr` borra, `Ctrl+Z` deshace. Todo se guarda solo.

**Avisos automáticos:** el TOTAL DÍA se pinta de rojo cuando un día ya **completo** queda por debajo del mínimo de la sede; mientras el día está a medio llenar se ve con contorno. Un punto rojo en un casillero indica un agente marcado en dos sedes el mismo día.

**Colores del calendario:** hoy va en un círculo azul; los feriados en rojo; los domingos son días normales.

## Datos y copias de seguridad

- Todo vive en Turso, **incluidas las fotos** (recortadas y comprimidas, ~30 KB cada una). Turso guarda copias automáticas.
- En **Descargas → Copia de seguridad** se baja un `.json` con todos los datos para guardarlo aparte.

---

## Para el desarrollador

```
backend/                 API Express 5 + Turso/libSQL (@libsql/client)
  src/config/env.ts        variables de entorno validadas con zod (falla con un mensaje claro si falta algo)
  src/database/            cliente único, migraciones versionadas y datos iniciales (un lote atómico)
  src/shared/              calendario (feriados de Perú), dominio, errores, validaciones reutilizables
  src/modules/<tema>/      mismo patrón en todos:
      <tema>.repository.ts   solo SQL
      <tema>.service.ts      reglas de negocio (duplicados, existencia, estados)
      <tema>.schemas.ts      validación de entrada (zod)
      <tema>.routes.ts       endpoints delgados
    auth/ sedes/ agentes/ asignaciones/ rol/ feriados/ reportes/ (Excel y PDF) respaldo/ codigos/ configuracion/
frontend/                Angular 22 (standalone, signals, sin zone.js)
  src/app/core/            API, sesión y guardián de rutas, interceptor de errores, validaciones, UI base
  src/app/features/        ingreso/ (PIN) rol/ personal/ sedes/ feriados/ descargas/
  src/styles/              tokens del sistema visual (ver DESIGN.md)
render.yaml              Blueprint de Render (build, start, health check, variables)
```

**Seguridad:** PIN comparado en tiempo constante; sesión en cookie `httpOnly` + `secure` firmada con HMAC (30 días; cambiar el PIN invalida todas); bloqueo de 15 min tras 5 intentos fallidos por IP y tope global por hora; cabeceras Helmet con CSP estricta (sin scripts en línea); toda la API exige sesión salvo `/api/salud` y `/api/auth/*`.

**Validaciones:** el servidor valida todo con zod (fechas reales, DNI de 8 dígitos, teléfono, nombres solo con letras, rangos de año) y reglas de negocio (DNI y nombres duplicados, sede/agente existentes y activos, marcas válidas, fotos verificadas por sus bytes). El frontend repite las mismas reglas (`core/validacion/reglas.ts`) para avisar antes de enviar y marca el campo que el servidor rechace.

**Modelo:** `asignaciones` vincula agente ↔ sede por rango de meses con un `patron` semanal de 7 casilleros. `turnos` guarda una marca por agente/sede/fecha. Los tipos de marca viven en `codigos`; los feriados locales en `feriados` (los nacionales los calcula `shared/calendar.ts`); las fotos en `agente_fotos` (BLOB, servidas con `?v=<versión>` para caché).

**Desarrollo local:**

```bash
cp backend/.env.example backend/.env   # y complete APP_PIN y SESSION_SECRET
npm run dev            # API (4800) + Angular (4200) juntos → abrir http://localhost:4200
npm run verificar      # revisa tipos del backend y compila el frontend
```

Sin `DATABASE_URL`, la PC usa el archivo `datos/rol-turnos.db`. Para probar contra Turso, ponga su URL y token en `backend/.env`.

**Cambios de esquema:** agregue una migración al final de `backend/src/database/migrations.ts`; se aplica sola al iniciar (también en Turso).

**API principal:** `POST /api/auth/ingresar|salir` · `GET /api/rol?mes=AAAA-MM` · `PUT /api/rol/marcas` · `POST /api/rol/generar` · `GET /api/rol/resumen` · `GET /api/reportes/excel|pdf?mes=&alcance=completo|hasta-hoy` · CRUD en `/api/sedes`, `/api/agentes`, `/api/asignaciones` · `PUT|DELETE /api/agentes/:id/foto` · `GET|POST|DELETE /api/feriados` · `GET /api/respaldo/descargar`.

**Modo local sin nube (opcional):** `INSTALAR.bat` instala y crea un acceso directo que abre el sistema en esta PC. Requiere `backend/.env` con el PIN.
