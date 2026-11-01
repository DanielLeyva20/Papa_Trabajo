---
name: Rol de Turnos
description: Una herramienta de escritorio con oficio Apple para marcar el rol mensual de turnos, sede por sede.
colors:
  fondo: "#f5f5f7"
  superficie: "#ffffff"
  superficie-2: "#fbfbfd"
  relleno: "rgb(118 118 128 / 0.12)"
  relleno-suave: "rgb(118 118 128 / 0.07)"
  separador: "rgb(60 60 67 / 0.12)"
  separador-fuerte: "rgb(60 60 67 / 0.22)"
  vidrio: "rgb(255 255 255 / 0.72)"
  vidrio-oscuro: "rgb(29 29 31 / 0.86)"
  texto: "#1d1d1f"
  texto-2: "#5f5f64"
  texto-3: "#6e6e73"
  azul: "#0071e3"
  azul-hondo: "#0062c4"
  azul-velo: "rgb(0 113 227 / 0.1)"
  rojo: "#d70015"
  rojo-velo: "rgb(215 0 21 / 0.07)"
  verde: "#248a3d"
  verde-velo: "rgb(36 138 61 / 0.1)"
  amarillo: "#ffcc00"
  indigo: "#5856d6"
typography:
  display:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.028em"
  title:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.022em"
  body:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: "-0.011em"
    fontFeature: "\"tnum\""
  control:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.47
    letterSpacing: "-0.011em"
  label:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.011em"
  caption:
    fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0"
rounded:
  s: "8px"
  segmento: "9px"
  m: "12px"
  l: "18px"
  xl: "22px"
  pildora: "999px"
spacing:
  e-1: "4px"
  e-2: "8px"
  e-3: "12px"
  e-4: "16px"
  e-5: "24px"
  e-6: "32px"
  e-7: "48px"
  e-8: "64px"
components:
  button:
    backgroundColor: "{colors.relleno}"
    textColor: "{colors.texto}"
    typography: "{typography.control}"
    rounded: "{rounded.pildora}"
    padding: "0 24px"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.azul}"
    textColor: "{colors.superficie}"
    typography: "{typography.control}"
    rounded: "{rounded.pildora}"
    padding: "0 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.azul-hondo}"
  button-dark:
    backgroundColor: "{colors.texto}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.pildora}"
    height: "44px"
  button-plain:
    backgroundColor: "transparent"
    textColor: "{colors.azul}"
    rounded: "{rounded.pildora}"
    height: "44px"
  button-plain-hover:
    backgroundColor: "{colors.azul-velo}"
  button-danger:
    backgroundColor: "{colors.rojo-velo}"
    textColor: "{colors.rojo}"
    rounded: "{rounded.pildora}"
    height: "44px"
  button-icon:
    backgroundColor: "{colors.relleno}"
    textColor: "{colors.texto}"
    rounded: "{rounded.pildora}"
    size: "44px"
  input:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    rounded: "{rounded.m}"
    padding: "0 16px"
    height: "44px"
  segmented-track:
    backgroundColor: "{colors.relleno}"
    rounded: "{rounded.m}"
    padding: "3px"
  segmented-option:
    backgroundColor: "transparent"
    textColor: "{colors.texto-2}"
    typography: "{typography.control}"
    rounded: "{rounded.segmento}"
    padding: "0 16px"
    height: "36px"
  segmented-option-active:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
  chip:
    backgroundColor: "{colors.relleno-suave}"
    textColor: "{colors.texto-2}"
    typography: "{typography.label}"
    rounded: "{rounded.pildora}"
    padding: "0 10px"
    height: "26px"
  card:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.xl}"
    padding: "16px"
  grid-frame:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.l}"
  day-today:
    backgroundColor: "{colors.azul}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.pildora}"
    size: "30px"
  day-holiday-today:
    backgroundColor: "{colors.rojo}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.pildora}"
    size: "30px"
  mark:
    typography: "{typography.control}"
    rounded: "{rounded.segmento}"
    height: "32px"
    width: "40px"
  total-pending:
    backgroundColor: "transparent"
    textColor: "{colors.texto-2}"
    typography: "{typography.label}"
    rounded: "{rounded.pildora}"
    height: "26px"
  total-complete:
    backgroundColor: "{colors.relleno-suave}"
    textColor: "{colors.texto}"
    typography: "{typography.label}"
    rounded: "{rounded.pildora}"
    height: "26px"
  total-short:
    backgroundColor: "{colors.rojo}"
    textColor: "{colors.superficie}"
    typography: "{typography.label}"
    rounded: "{rounded.pildora}"
    height: "26px"
  dock:
    backgroundColor: "rgb(255 255 255 / 0.92)"
    rounded: "{rounded.xl}"
    padding: "6px"
  toast:
    backgroundColor: "{colors.vidrio-oscuro}"
    textColor: "{colors.superficie}"
    rounded: "20px"
    padding: "10px 10px 10px 12px"
  dialog:
    backgroundColor: "rgb(255 255 255 / 0.92)"
    textColor: "{colors.texto}"
    rounded: "{rounded.xl}"
    padding: "32px 24px 24px"
    width: "440px"
---

# Design System: Rol de Turnos

## Overview

**Creative North Star: "The Quiet Pro Tool"**

Rol de Turnos is a desktop tool built with Apple's craft. The world is a pale warm-grey desk (#f5f5f7) with white sheets on it. The sheets have soft, generous corners and barely-there shadows. The chrome is translucent glass: the top bar, the sticky sede bar, the floating Dock of stamps, toasts and dialogs all let the content blur through underneath. The month grid is the product and everything else stays out of its way. Ink is near-black, secondary text is a measured grey, and one blue is for action. Red is reserved for meaning and never used for decoration.

The density is calm, but the grid is a working instrument. Agent names stay pinned to the left, day columns have a fixed width, and only the mark inside each cell changes. Segmented controls with a sliding white pill do all the switching: navigation, sede, and the stamp in hand. Motion is lively on purpose, because the user asked for "premium, interactive, with animations". Springs carry state changes, a small bounce answers a tap, and filling the month arrives as a wave. Reduced-motion and reduced-transparency preferences are honored everywhere.

This world replaces the previous "Almanaque de pared" world (red wall-calendar, condensed display type). Nothing from that world carries over. Calendar red now marks only holidays and staffing shortfall, and Sundays are neutral.

**Key Characteristics:**
- Pale warm-grey ground, white sheets with 18–22px corners, hairline separators at 0.5px.
- Translucent glass for every floating or sticky layer (backdrop blur 20–30px, saturate 180–190%).
- One blue for action and "today"; red only for holidays, staffing shortfall, and error alerts.
- Segmented controls with a sliding white indicator on a grey track, driven by one shared directive.
- Inter Variable with optical sizing standing in for SF Pro; large bold titles with tight negative tracking.
- Spring-curve motion with a recorded bounce exception for tap feedback.

## Colors

The palette is Apple's neutral greys with two meaning-bearing hues: blue acts, red warns.

### Primary
- **Action Blue** (azul): Primary buttons ("Llenar mes automático"), link color, focus rings, the selected nav icon, the "today" circle and its weekday letter. Pressed and hovered it deepens to **Deep Action Blue** (azul-hondo). **Blue Veil** (azul-velo) is the hover wash of plain buttons and the backing of the empty-month icon tile.

### Secondary
- **Signal Red** (rojo): Holiday day numbers and letters, the holiday dot under a day number, the solid shortfall pill in TOTAL DÍA, the pulsing dot on a sede tab that has a shortfall, the double-booking dot in a cell, destructive buttons and save errors. **Red Veil** (rojo-velo) tints holiday columns, holiday chips and alert banners.

### Tertiary
- **Grass Green** (verde): Excel format icon and success states. The save-status dot and toast success icon use Apple's system green (#30d158) inline.
- **Night Indigo** (indigo): Night-shift totals text and the "N" stamp.
- **Sun Yellow** (amarillo): The "L" (Libre) stamp.

Stamp colors are data, not tokens. Each shift code carries its own background and text color from the database (D white, N #5856D6, L #FFCC00, F #D70015, V #248A3D, DM #8944AB, P #FF9500). The frontend renders whatever the code row says.

### Neutral
- **Desk Grey** (fondo): The page ground behind every sheet.
- **Sheet White** (superficie): Cards, the grid frame, inputs, the sliding segmented indicator, the pinned agent column.
- **Sheet Tint** (superficie-2): Total rows, table headers, hovered agent cells.
- **Control Fill** (relleno): Segmented tracks, default buttons, the eraser stamp, a hovered day-number backing.
- **Soft Fill** (relleno-suave): Chips, complete-day total pills, light marks, table row hover.
- **Hairline** (separador) / **Strong Hairline** (separador-fuerte): 0.5px row and column rules, input borders, the pending-total outline.
- **Glass** (vidrio) / **Dark Glass** (vidrio-oscuro): The top bar / toasts.
- **Ink** (texto), **Secondary Ink** (texto-2, at least 6:1 on white), **Tertiary Ink** (texto-3, at least 4.5:1 on white and on Desk Grey): Primary text, labels and metadata, and hints and placeholders (including the year beside the month title).

### Named Rules
**The Meaningful Red Rule.** On the calendar, red means a holiday or a staffing shortfall, nothing else. Sundays are neutral and get the same ink as every other day. Today is a blue filled circle; a holiday that is today is a red filled circle. Outside the grid, red is limited to errors and destructive actions.

**The Judge-When-Complete Rule.** A day's TOTAL DÍA is not judged until every agent in the day has a mark. A pending day is a hairline-outlined pill in Secondary Ink. A complete day that meets the minimum is a filled Soft Fill pill. A complete day below the sede's minimoDia is a solid red pill, scaled 1.08. The sede tab dot follows the same rule: it pulses red only when a complete day is short.

## Typography

**Display Font:** Inter Variable (with -apple-system, BlinkMacSystemFont, Segoe UI Variable, system-ui)
**Body Font:** the same family
**Label/Mono Font:** the same family, with tabular figures throughout

**Character:** A single optical-sized grotesque standing in for SF Pro. Weight and tracking create the hierarchy, not a second family. Numbers are tabular everywhere, so day columns and totals align.

### Hierarchy
- **Display** (700, clamp(2.25rem, 4vw, 3.25rem), 1.05, -0.035em): The month title ("Noviembre 2026") and page titles. The year is set in Tertiary Ink.
- **Headline** (700, 1.75rem, -0.028em): Section titles inside pages.
- **Title** (700, 1.3125rem, 1.12): Sede names above each grid, dialog titles, Descargas format names.
- **Body** (400, 1rem on a 17px root, 1.47, -0.011em): Running text; help paragraphs cap at 62–70ch.
- **Control** (600, 0.9375rem): Buttons, segmented options, day numbers, marks (700).
- **Label** (600, 0.8125rem): Field labels, chips, agent names in the grid, totals.
- **Caption** (600, 0.75rem): Weekday letters, agent role lines, table headers, mobile nav labels under the icons.

### Named Rules
**The One Family Rule.** Hierarchy comes from size, weight (400/600/700) and negative tracking within Inter Variable. Don't introduce a second display face.

## Layout

The app is a sticky glass top bar (64px minimum height) over a padded content well (32px; 16px at 1180px and below). The bottom padding is enlarged so the floating Dock never covers the last row. Rol del mes runs up to 1760px wide and Descargas caps at 1240px. Spacing steps in multiples of 4 (4, 8, 12, 16, 24, 32, 48, 64). Page sections stack in a single-column grid with 24px gaps.

The month grid is a fixed-layout table. The agent column is 248px (158px at 600px and below, where the avatar hides) and stays sticky on horizontal scroll. Day columns are at least 34px and rows are 52px tall (62px on mobile). Hovering a row tints it; hovering a column scales its day number and tints its cells.

Breakpoints:
- **Above 1180px:** The sede bar is sticky under the top bar. When the large month title scrolls away, the bar gains a glass background and shows the month name at its left.
- **1180px and below:** The top bar wraps and the nav moves onto its own scrollable row.
- **900px and below:** Stamp names hide in the Dock, the primary action spans full width, and sede card padding tightens to 8px.
- **600px and below:** The nav becomes a tab bar with icons over 0.75rem labels, the Dock compacts so all seven stamps plus Borrar fit at 390px, and grid rows grow to 62px.

### Named Rules
**The Day-Row-Stays-Visible Rule.** Only the sede bar may stick. Sticky per-sede headers were tried and rejected because they covered the day-number row.

## Elevation & Depth

Depth is a hybrid. Resting sheets sit almost flat on the grey desk with a whisper shadow. Floating layers (the Dock, toasts, dialogs) lift with a long, soft drop shadow and frosted glass. Hairlines (0.5px) do most of the structural separation inside sheets.

### Shadow Vocabulary
- **Rest** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.04), 0 2px 10px rgb(0 0 0 / 0.04)`): Every card (tarjeta).
- **Raised** (`box-shadow: 0 2px 6px rgb(0 0 0 / 0.05), 0 18px 40px -16px rgb(0 0 0 / 0.16)`): Lifted panels.
- **Floating** (`box-shadow: 0 10px 30px rgb(0 0 0 / 0.12), 0 30px 70px -20px rgb(0 0 0 / 0.3)`): The Dock, toasts, dialogs.
- **Indicator** (`box-shadow: 0 3px 8px rgb(0 0 0 / 0.12), 0 3px 1px rgb(0 0 0 / 0.04)`): The sliding white pill in segmented controls.
- **Action Glow** (`box-shadow: 0 4px 14px -4px rgb(0 113 227 / 0.55)`): The primary blue button only.

### Named Rules
**The Glass-For-What-Floats Rule.** Anything that floats or sticks over content is translucent with backdrop blur. This covers the top bar, the stuck sede bar, the Dock, toasts, dialogs and the dialog scrim. Under prefers-reduced-transparency the glass turns opaque white.

## Shapes

Corners are continuous and generous, and they nest by size. Cards are 22px, the grid frame and banners 18px, inputs and segmented tracks 12px, segment pills and marks 9px, and small tiles 8px. Every button and chip is a full pill (999px). Today and holiday day numbers are 30px circles, and avatars are circles. Borders are 0.5px hairlines; the only 1px stroke is on inputs and the pending-total outline. Touch targets are at least 44px.

## Components

### Buttons
Soft, pill-shaped and pressable.
- **Shape:** Full pill (999px), 44px tall, 24px horizontal padding; icon buttons are 44px circles.
- **Default:** Control Fill on Ink, 600 weight. Hover darkens the fill to rgb(118 118 128 / 0.18).
- **Primary:** Action Blue with white text and the Action Glow; hover goes to Deep Action Blue. "Llenar mes automático" uses the CalendarCheck icon.
- **Dark / Plain / Danger:** Ink with white text; transparent with blue text and a Blue Veil hover; Red Veil with red text.
- **Press / Disabled:** Every button scales to 0.96 on press, in 80ms. Disabled buttons drop to 40% opacity.

### Segmented Controls
The signature switcher, used for the nav, the sede bar and the Dock.
- **Track:** Control Fill, 12px radius, 3px padding.
- **Indicator:** A white pill (9px radius, Indicator shadow) positioned by the Deslizante directive. It slides on the --resorte curve over 420ms, and transitions are enabled only after the first measurement.
- **Options:** 36px tall, Secondary Ink, turning Ink when current or pressed. In the nav, the current icon turns Action Blue.
- **Mobile nav (600px and below):** Each option stacks its icon over a 0.75rem label, iPhone tab-bar style. Icons are never left alone without labels.

### Chips
- **Style:** Soft Fill, Secondary Ink, 0.8125rem/600, 26px pill.
- **Holiday chip:** A Red Veil pill with a 26px solid red day circle and the holiday name in red.

### Cards / Containers
- **Corner Style:** 22px.
- **Background:** Sheet White on Desk Grey.
- **Shadow Strategy:** Rest.
- **Internal Padding:** 16px for grid sheets, 24–32px for content blocks.
- **Grouped lists:** Descargas puts its formats in one flat list separated by hairlines inside a single card. Cards never sit inside cards.

### Inputs / Fields
- **Style:** Sheet White, a 1px Strong Hairline border, 12px radius, 44px tall. The label above is 0.8125rem/600 in Secondary Ink.
- **Focus:** The border turns Action Blue with a 4px rgb(0 113 227 / 0.16) halo. The global focus-visible ring elsewhere is 3px rgb(0 113 227 / 0.55) with a 2px offset.

### Navigation
A sticky top bar in Glass (backdrop blur 20px, saturate 180%) with a 0.5px bottom hairline. It holds the app mark, the segmented nav centered, and the save status at the right: a green dot, a pulsing blue dot while saving, and red on error. The bar is a named view-transition element, so it stays put while pages crossfade beneath it.

### The Month Grid
- **Day header:** A weekday letter in Caption over a 30px day number. Today is a blue filled circle; a holiday is red text with a 4px red dot beneath; a holiday that is today is a red filled circle. Sundays are styled like any other day.
- **Cells:** Each mark is a pill up to 40px wide and 32px tall with a 9px radius, colored from the shift code's data. White marks render on Soft Fill. Holiday columns carry Red Veil, and today's column has a faint blue wash. An agent booked in two sedes on the same day gets an 8px red dot in the cell corner.
- **Totals:** 26px pills following the Judge-When-Complete Rule; night totals use Night Indigo text.
- **Keyboard focus:** A 2.5px inset blue ring on the cell.

### Dock of Stamps
A floating glass toolbar centered at the bottom (rgb(255 255 255 / 0.92), blur 28px, saturate 190%, 22px radius, Floating shadow).
- The seven stamps live in a horizontally scrollable group with its own sliding indicator.
- Borrar sits outside the scroll area, behind a 1px separator, and draws its own white pill when active.
- Each stamp is a 32px colored tile plus its name; the name hides at 900px and below.
- The active tile scales to 1.1, a hovered tile lifts 3px, and a pressed tile shrinks to 0.9.
- At 600px and below, tiles are 30px and padding tightens, so all seven stamps plus Borrar fit at 390px.
- The Dock rises in on load (620ms, spring).

### Avatars
Avatars are circles. A photo is cropped to a centered square and compressed client-side to 400×400 WEBP (JPEG fallback). It fades in at 360ms. With no photo, the avatar shows initials (650 weight, 38% of size) in one of seven deterministic pastel/ink pairs, chosen from the name.

### Toasts and Dialogs
- **Toasts:** Dark Glass pills (20px radius) stacked above the Dock with a colored 28px status circle and an optional white-veil action. They enter with blur, rise and scale on a 420ms bounce.
- **Dialogs:** Native dialogs in white glass (blur 30px), 22px radius, max 440px, centered text, and two equal-width actions. They materialize from blur(8px) and scale(1.06) over a scrim of rgb(0 0 0 / 0.28) with a 6px backdrop blur.

### Motion
- **Curves:**
  - Resorte (cubic-bezier(.32,.72,0,1)) is the default for state changes, indicators, entrances and route changes.
  - Rebote (cubic-bezier(.34,1.28,.64,1)) is a recorded exception, used only for tap and press feedback: stamps, day numbers, totals, icons and toasts.
  - Ease-out (cubic-bezier(.23,1,.32,1)) is for exits and fades.
- **Marking:**
  - A stamp placed with the pointer pops in from scale 0.6 (280ms, rebote).
  - Keyboard marks are not animated.
  - After "Llenar mes", marks arrive as a wave cascading by day column: 22ms per day, 620ms each, dropping from blur and -10px.
- **Pages and lists:**
  - Route changes use View Transitions. The old view fades and blurs out in 180ms; the new one rises from a 6px blur in 360ms.
  - The month title rolls in from the direction of travel, and the previous month's sheets slide out toward the side that was left.
  - Lists enter with a stagger: 520ms each, 28ms between items.
- **Reduced motion:** prefers-reduced-motion collapses every duration to 1ms and disables view transitions.

## Do's and Don'ts

### Do:
- **Do** keep calendar red to holidays and staffing shortfall; mark today with a blue filled circle (red filled when today is a holiday).
- **Do** judge TOTAL DÍA only on complete days: outlined pending pill in Secondary Ink, Soft Fill pill when met, solid red pill when below minimoDia; mirror the same rule on the sede tab dot.
- **Do** switch between peers with a segmented control and the Deslizante sliding white pill on a Control Fill track.
- **Do** make every floating or sticky layer glass, and provide the opaque fallback under prefers-reduced-transparency.
- **Do** use --resorte for state and entrance motion; reserve --rebote for tap and press feedback.
- **Do** animate stamp pops only for pointer marks, never for keyboard marks.
- **Do** keep nav labels visible under icons on mobile (0.75rem).
- **Do** keep secondary text at Secondary Ink or Tertiary Ink (at least 4.5:1); never lighter.
- **Do** crop agent photos square and compress to 400px WEBP before upload; fall back to tinted initials.

### Don't:
- **Don't** color Sundays; they are neutral by the user's explicit request.
- **Don't** make per-sede grid headers sticky; they cover the day-number row.
- **Don't** put kickers or eyebrow labels above headings; titles stand alone.
- **Don't** nest cards inside cards; group related rows in one card with hairline separators.
- **Don't** use sparkle or "AI" glyphs for automatic fill; "Llenar mes" uses CalendarCheck.
- **Don't** let the Dock hide Borrar; it is pinned outside the scrolling stamp group.
- **Don't** reintroduce the "Almanaque de pared" world's condensed display face or red-dominant chrome.
