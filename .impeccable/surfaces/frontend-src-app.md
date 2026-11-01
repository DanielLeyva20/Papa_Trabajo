---
version: 1
slug: "frontend-src-app"
primary_target: "frontend/src/app"
related_targets: []
---

Scope: aplicación Angular completa (Rol del mes, Personal, Sedes, Feriados, Descargas). Mode: Operate.
Audience: supervisor mayor, una PC, de día. Task: marcar turnos por agente/día/sede, generar el mes, fotos del personal, feriados, descargar Excel/PDF.

## Direction contract

THESIS: Herramienta de escritorio con oficio Apple (pin del usuario, 2026-11-01: "moderno tipo Apple, premium, interactivo, con animaciones"). Rechaza el panel administrativo genérico y el almanaque rojo anterior: el rojo queda reservado solo para feriados y alertas.

OWN-WORLD: Fondo #F5F5F7, superficies blancas con radio 18–22px y sombras suaves; tinta #1D1D1F, secundario #6E6E73; acento azul #0071E3 para acciones; rojo #D70015 solo para feriados y faltas de personal. Inter con tamaño óptico (sustituto abierto de SF Pro), títulos grandes con tracking negativo. Barra superior translúcida (backdrop-filter), controles segmentados con indicador deslizante, marcas como pastillas de color.

STORY: Abre, ve el mes y la sede, marca con sellos desde un Dock flotante, ve totales que avisan solo en días completos, sube fotos, descarga.

FIRST VIEWPORT: Barra translúcida con navegación segmentada; título grande "Noviembre 2026" con flechas circulares y acciones en píldora (Llenar mes en azul); control segmentado de sedes; tarjeta blanca con la cuadrícula (avatar + nombre fijo a la izquierda, hoy en círculo azul, feriados en rojo); Dock de sellos flotante, de vidrio, centrado abajo.

FORM: Dirección fijada por el usuario (pin), no por sorteo; mundo anterior "Almanaque de pared" (seed df4c4520) reemplazado. Signature interaction: Dock de sellos con selección elástica + marcas que aparecen con pop al pintar; "Llenar mes" cae como una ola por columnas; transiciones de vista entre pantallas.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
