# Subir el Rol de Turnos a la nube (Render + Turso)

El código ya está preparado. Solo falta crear las cuentas y conectar las piezas (≈ 20 minutos).

```
Navegador de su papá ──HTTPS──▶ Render (servidor Node + pantalla Angular) ──▶ Turso (base de datos SQLite)
```

---

## 1. Subir el proyecto a GitHub

Render publica desde un repositorio de GitHub.

1. Abra **GitHub Desktop** → *File → Add local repository* → elija la carpeta `PAPA`.
   Le dirá que no es un repositorio: pulse **create a repository** (deje marcado *Git ignore: None*; ya existe `.gitignore`).
2. Revise la lista de archivos: **no** deben aparecer `backend/.env`, `datos/` ni `node_modules/`.
3. Escriba un resumen (p. ej. «Primera versión») → **Commit to main** → **Publish repository**.
   Deje marcado **Keep this code private**.

## 2. Crear la base de datos en Turso

1. Entre a <https://app.turso.tech> y cree una cuenta (gratis).
2. **Create Database**:
   - Nombre: `rol-turnos`
   - Región: **AWS us-east-1 (Virginia)** — la misma que el servicio de Render.
3. Abra la base creada y copie:
   - **URL**: empieza con `libsql://rol-turnos-…turso.io` → será `DATABASE_URL`.
   - **Create Token** (permiso de lectura y escritura, sin vencimiento) → será `DATABASE_AUTH_TOKEN`.

> La base empieza vacía. Al primer arranque, el sistema crea las tablas y carga las 9 sedes y los 34 agentes iniciales.

## 3. Crear el servicio en Render

1. Entre a <https://dashboard.render.com> e inicie sesión con GitHub.
2. **New → Blueprint** → elija el repositorio `PAPA`. Render lee `render.yaml` solo.
3. Le pedirá estas variables (las demás ya vienen configuradas):

   | Variable | Valor |
   | --- | --- |
   | `APP_PIN` | el PIN de 6 dígitos de su papá (el mismo de `backend/.env`) |
   | `DATABASE_URL` | la URL `libsql://…` de Turso |
   | `DATABASE_AUTH_TOKEN` | el token de Turso |

   `SESSION_SECRET` la genera Render automáticamente.
4. **Apply**. La primera publicación tarda unos 3–5 minutos.
5. Al terminar verá la dirección, algo como `https://rol-turnos.onrender.com`. Ábrala: debe aparecer la pantalla del PIN.

## 4. Para su papá

- Guarde la dirección como **favorito** o cree un **acceso directo en el escritorio**
  (en Chrome/Edge: ⋮ → *Guardar y compartir* → *Crear acceso directo* → *Abrir como ventana*).
- Escribe el PIN una vez; el navegador lo recuerda **30 días**.
- Tras **5 intentos fallidos** el acceso se bloquea 15 minutos.

## Plan gratuito: qué esperar

- Render **duerme** el servidor tras 15 minutos sin uso. La primera vez que se abre después,
  tarda **hasta 1 minuto** en despertar (la pantalla del PIN avisa «Conectando con el servidor…»).
  Para que responda al instante siempre, cambie a un plan pago (*Starter*) en Render.
- Turso gratis alcanza de sobra para este sistema y guarda copias automáticas de la base.

## Cambiar el PIN

Render → servicio `rol-turnos` → **Environment** → edite `APP_PIN` → *Save*.
El servicio se reinicia y **todas las sesiones abiertas se cierran** (habrá que usar el PIN nuevo).

## Publicar cambios futuros

Haga commit y *Push* en GitHub Desktop: Render vuelve a publicar solo (`autoDeploy`).

## Copias de seguridad

- Turso guarda copias automáticas (restauración por punto en el tiempo desde su panel).
- Además, en **Descargas → Copia de seguridad** se baja un archivo `.json` con todo
  (agentes, fotos, marcas y feriados) para guardarlo en la PC o una USB.

## Si algo falla

| Síntoma | Causa probable |
| --- | --- |
| Render muestra *Configuración incompleta* en los logs | Falta una variable o el PIN no tiene 6 dígitos. |
| *DATABASE_AUTH_TOKEN: es obligatorio* | La URL es de Turso pero falta el token. |
| La página tarda ~1 minuto | El plan gratuito estaba dormido; es normal. |
| «Su sesión terminó» | Venció a los 30 días o se cambió el PIN: escriba el PIN de nuevo. |
