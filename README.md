# Portal de Operaciones — SMARTANS GROUP

Backend + frontend del portal interno de fichas de inversión, ABM de
usuarios, notificaciones y monitoreo de SMARTANS. Reemplaza la versión
anterior (un único `index.html` + Google Apps Script + Google Sheets) por
una arquitectura Node/Express + SQLite en varios archivos, con foco en
seguridad (ver `docs/ARCHITECTURE.md` para el "por qué" de cada decisión).

## Estado del proyecto (leé esto primero)

| Parte | Estado |
|---|---|
| Backend (Express + SQLite) | ✅ Completo — Auth, ABM Usuarios, Fichas+imágenes, PDF con link firmado, Notificaciones (Slack/Telegram server-side), Monitoreo (cron server-side), placeholders RPA/Agentes protegidos |
| Tests del backend (Vitest) | ✅ Cobertura de lo crítico: login, rate limiting, captcha, autorización por rol/módulo, CRUD de fichas, upload de PDF, upgrade de password legacy |
| Script de migración Sheets→SQLite | ✅ Completo (`scripts/migrate-from-sheets/`) |
| Docs de arquitectura y deploy | ✅ `docs/ARCHITECTURE.md`, `docs/DEPLOY.md` |
| Frontend (Vite) | ✅ Completo — login con captcha, sidebar con permisos por módulo, listado + editores de Canje y Crédito (con vista previa en vivo, exactamente igual a los del portal viejo), PDF con modal de confirmación antes de generar/subir, ABM de Usuarios, Notificaciones, Monitoreo. |

**Simplificaciones conocidas** (no bloquean el uso, quedan para una vuelta futura):
- La ficha de Canje ya no permite subir un logo *distinto* al de SMARTANS por ficha (antes existía esa opción) — usa siempre el logo estándar (`client/public/logo.png`). Si hace falta recuperar esa opción, el patrón ya está en `canje.js` (mismo mecanismo que `heroDataURL`).
- No se portó la "ficha semilla" de ejemplo con foto (Ugarte 2729) — la imagen de ejemplo del portal viejo pesaba ~195KB en base64 embebido en el HTML; no vale la pena arrastrar eso al repo nuevo. Cualquier ficha nueva permite subir su propia foto igual.

## Qué cambió respecto al portal viejo

- **Base de datos real** (SQLite) en vez de Google Sheets — ver el esquema completo en `docs/ARCHITECTURE.md`.
- **Login de verdad**: JWT de acceso de 15 minutos + refresh token rotable y revocable (tabla `sessions`), en vez de reenviar usuario+contraseña en cada request.
- **Contraseñas con argon2id** (memory-hard), con upgrade automático y transparente desde el SHA-256+salt viejo la primera vez que cada persona haga login acá.
- **Captcha validado en el servidor** (antes solo se validaba en el navegador, bypasseable llamando al backend directo).
- **Rate limiting** en login (5 intentos / 15 min) — antes no había ninguno.
- **CSRF real** (double-submit cookie) en todo verbo mutante.
- **Autorización por módulo consultada en vivo** contra la base — un cambio de permisos del admin aplica en la siguiente request, no espera a que expire el token.
- **Subida de PDF autenticada**: el backend viejo (`uploadPdf` en Apps Script) no pedía login — cualquiera con la URL podía subir archivos arbitrarios. Ahora requiere sesión + valida los bytes reales del archivo (no confía en el Content-Type declarado) + genera un link firmado con expiración, en vez de un link de Drive permanente.
- **Generación de PDF con confirmación explícita**: un modal (`confirmDialog.js`) tiene que aceptarse antes de que arranque el pipeline de render→PDF→subida — antes un solo click disparaba todo de una.
- **Slack/Telegram server-side**: el token del bot de Telegram ya no viaja al navegador del cliente (antes se veía en el Network tab de cualquier usuario logueado).
- **Monitoreo con cron server-side** (`node-cron`), con historial persistido — antes dependía de que alguien tuviera la pestaña del navegador abierta.
- **Sin secretos hardcodeados en el código** — todo vive en variables de entorno (`server/.env`, nunca commiteado).

## Estructura del repo

```
smartans-portal/
├── server/     — API Express + SQLite (ver server/src/modules/<dominio>/)
├── client/     — frontend Vite (JS vainilla, sin framework)
├── scripts/migrate-from-sheets/  — importa los datos del portal viejo
└── docs/       — ARCHITECTURE.md (el "por qué" de cada decisión), DEPLOY.md
```

## Puesta en marcha local

Requisitos: **Node.js 20+**.

```bash
git clone <este repo>
cd smartans-portal
npm install
```

### 1. Configurar el backend

```bash
cd server
cp env.example .env
```

Generá los 4 secretos (cada uno DISTINTO):
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Pegalos en `JWT_ACCESS_SECRET`, `CSRF_SECRET`, `LOGIN_CHALLENGE_SECRET`, `PDF_SHARE_TOKEN_SECRET` dentro de `.env`.

### 2. Migrar el esquema y crear el primer admin

```bash
npm run migrate    # crea las tablas
npm run seed        # te pide usuario/contraseña del primer admin — sin default hardcodeado
```

### 3. Levantar todo

Terminal 1:
```bash
npm run dev --workspace server     # API en http://localhost:3000
```
Terminal 2:
```bash
npm run dev --workspace client     # frontend con HMR en http://localhost:5173
```

Abrí `http://localhost:5173`.

### 4. Correr los tests del backend

```bash
npm test --workspace server
```

## Próximos pasos opcionales

- Recuperar el logo por-ficha en Canje (ver "Simplificaciones conocidas" arriba).
- Sumar tests de frontend (hoy solo el backend tiene suite — Vitest ya está instalado ahí, se podría agregar `@testing-library/dom` o similar para el cliente si hace falta).
- Cuando RPA/Agentes tengan funcionalidad real, seguir el mismo patrón `modules/<dominio>/` que ya usan los demás módulos del backend, y el mismo patrón de pantalla que `monitoring.js`/`notifications.js` en el cliente.

Ver `docs/ARCHITECTURE.md` para el detalle de cada endpoint disponible.

## Despliegue en producción

Ver `docs/DEPLOY.md` (Railway, con volumen persistente para la SQLite).

## Migrar los datos del portal viejo

Ver `scripts/migrate-from-sheets/README.md`.
