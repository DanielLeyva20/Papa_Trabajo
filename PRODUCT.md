# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Angular (frontend, standalone components, signals) + Node.js/Express (backend) + SQLite (base de datos local, archivo único). Exportación a Excel (.xlsx) y PDF generada en el backend. Elegido por el usuario: Angular; backend y base de datos delegados ("si usarás backend hazlo").

## Users

Un único usuario: el supervisor de agentes de seguridad (el padre del solicitante) del distrito fiscal de Cañete. Persona mayor, acostumbrada a llenar el rol en Excel a mano. Usa el sistema en su PC personal, solo cuando la PC está encendida, para registrar el turno de cada agente por día y por sede.

## Product Purpose

Reemplazar el Excel "ROL DF" mensual: registrar día a día qué agente cubre turno de día (D), noche (N), está libre (L) o ausente, en cada una de las 9 sedes, con los totales por día calculados solos. Exportar en cualquier momento el rol en Excel (avance a la fecha o mes completo) y en PDF. Éxito = el rol del mes se llena más rápido que en Excel y sin errores de totales.

## Operating Context

- Sedes (9): Sede Principal Cañete – Día 7; Almacén Bienes Incautos Archivo Cañete; Almacén de Bienes Incautos y Cochera Institucional; Fiscalía Familia y Prevención del Delito Cañete; Transitoria de Prevención del Delito; Fiscalía Especial Anticorrupción Cañete; Dependencias Administrativas; Fiscalía Provincial de Mala; Fiscalía Provincial de Yauyos.
- Cargos: Supervisor, Armado, Simple, Fémina, Fémina descansera (cubre descansos rotando entre sedes).
- Encabezado del documento: "DISTRIBUCIÓN DE AGENTES – TURNO DIURNO", "SUP. LEYVA PARIONA EDER".
- Rol mensual: columnas 1..último día del mes con la letra del día (L M X J V S D), una fila por agente, fila "TOTAL DÍA" por sede.
- Corre en localhost; se abre con doble clic en un acceso directo del escritorio que levanta el servidor y abre el navegador. Sin contraseña.

## Capabilities and Constraints

- Marcas: D (día), N (noche), L (libre), F (falta), V (vacaciones), DM (descanso médico), P (permiso).
- Un agente puede aparecer en varias sedes (fémina descansera).
- Exportaciones: Excel del mes hasta la fecha, Excel del mes completo, PDF del mes; de cualquier mes registrado.
- Sin internet requerido. Datos en un archivo SQLite local respaldable.

## Product Principles

1. Llenar el rol debe ser tan directo como escribir una letra en una celda.
2. Nada que obligue a recordar: totales, días de la semana y cuadro resumen se calculan solos.
3. Lo que sale impreso (Excel/PDF) debe verse como el documento oficial que ya usa.
4. Nunca perder datos: guardado automático y respaldos simples.

## Accessibility & Inclusion

Usuario mayor: texto grande, alto contraste, objetivos de clic amplios, lenguaje en español sencillo, sin jerga técnica, confirmación clara de cada guardado.
