# Arquitectura — Portal de Operaciones SMARTANS

## Visión general

```
┌─────────────┐      HTTPS + cookies httpOnly       ┌──────────────────────┐
│   client/   │ ───────────────────────────────────▶│       server/        │
│  Vite + JS  │◀─────────────────────────────────── │  Express + SQLite    │
│  vainilla   │         JSON / multipart             │  (node:sqlite)       │
└─────────────┘                                      └──────────┬───────────┘
                                                                  │
                                                        volumen persistente
                                                     /data/smartans.db + uploads/
```

Monorepo con `npm workspaces` (`server`, `client`). El server es la única
fuente de verdad: toda regla de negocio, toda validación y toda decisión de
autorización vive ahí — el cliente es una capa de presentación, no confía en
nada que decida solo (ver "Por qué" en cada sección).

## Por qué cada pieza es como es

- **SQLite, no Postgres/MySQL**: el volumen de uso es un equipo interno
  chico. Un archivo con backup simple (copiar el `.db`) es más barato de
  operar que una instancia de base de datos separada.
- **`node:sqlite` (built-in de Node 22.5+), no `better-sqlite3`**: probamos
  primero `better-sqlite3` — es una excelente librería, pero es un addon
  nativo que necesita compilarse con `node-gyp` (Visual Studio en Windows,
  build-essential en Linux) cuando no hay un binario prebuildeado para la
  versión exacta de Node/SO/arquitectura en uso. Con Node 24 recién salido,
  no había prebuild disponible y forzaba una compilación local que no
  todos los equipos tienen lista. `node:sqlite` viene incluido en el
  runtime — cero dependencias nativas, cero riesgo de que el build falle
  en una máquina o en el PaaS por falta de toolchain de C++. Misma API
  sincrónica (`db.prepare(sql).run/get/all(...)`), salvo que no trae un
  helper `db.transaction(fn)` — eso se reemplaza a mano con
  `BEGIN`/`COMMIT`/`ROLLBACK` (ver `runInTransaction` en `server/src/db/connection.js`).
- **Sin ORM**: 8 tablas, migraciones SQL de mano. Prisma agregaría un
  binario de engine extra al build del PaaS sin beneficio real a este tamaño.
- **JWT de acceso corto + refresh opaco en tabla `sessions`**: un JWT solo
  no se puede revocar (si se compromete, sigue siendo válido hasta que
  expire). El refresh en tabla sí — logout, deshabilitar un usuario, o
  rotar credenciales cortan el acceso de inmediato.
- **Autorización por módulo consultada en vivo** (no embebida en el JWT):
  si el admin le saca un módulo a alguien, tiene que aplicar en la
  PRÓXIMA request de esa persona, no recién cuando expire su token de 15
  minutos. SQLite es local — el costo de esa consulta extra es despreciable.
- **PDF client-side (html2canvas+jsPDF), no Puppeteer server-side**: un
  Chromium headless consume 200-400MB de RAM por render, algo que un plan
  económico de PaaS no banca bien. El hardening real no es DÓNDE se genera
  el PDF, es que ahora hay un endpoint autenticado + un modal de
  confirmación antes de que el pipeline arranque (ver `client/src/components/confirmDialog.js`).
- **Links de PDF firmados y expirables** (`pdf_shares`), no Google Drive:
  cierra el hueco crítico que tenía el backend viejo (`uploadPdf` sin
  ninguna autenticación) y elimina la dependencia de IDs de Drive
  hardcodeados en el código.
- **Vite sin framework**: multi-archivo con buenas prácticas, HMR, y manejo
  de variables de entorno de cliente — sin arrastrar React/Vue, que no hace
  falta para el tamaño de este portal.

## Estructura de módulos del backend

Cada dominio de negocio sigue el mismo patrón de 4 archivos en
`server/src/modules/<dominio>/`:

| Archivo | Responsabilidad |
|---|---|
| `<dominio>.routes.js` | Wiring de Express: qué middleware (auth, validación) va antes de cada handler |
| `<dominio>.controller.js` | Traduce HTTP ↔ llamadas al service — sin lógica de negocio acá |
| `<dominio>.service.js` | La lógica de negocio real — es lo que un test unitario testea |
| `<dominio>.repository.js` | Las únicas funciones que tocan `db.prepare(...)` para ese dominio |

Esto es intencional: si mañana alguien quiere cambiar de SQLite a otra base,
solo se tocan los `*.repository.js` — el resto no sabe ni le importa cómo
se persisten los datos.

## Flujo de autenticación

```
1. GET  /api/csrf-token        → cookie sp_csrf (no-httpOnly) + token en el body
2. GET  /api/auth/captcha      → { captchaToken, question }
3. POST /api/auth/login        → (con X-CSRF-Token) → cookies sp_access + sp_refresh
4. Requests protegidas         → sp_access se valida en `authenticate` (middleware)
5. Si sp_access expiró (401 TOKEN_EXPIRED) → POST /api/auth/refresh (rota sp_refresh)
6. POST /api/auth/logout       → revoca la sesión en la tabla `sessions`
```

## Flujo de PDF con confirmación

```
1. Usuario completa el formulario de una ficha (Canje o Crédito)
2. Click en "Descargar PDF" / "Enviar por WhatsApp"
3. confirmDialog.js muestra el modal — el pipeline NO arrancó todavía
4. Usuario confirma → html2canvas + jsPDF generan el PDF en el navegador
5. POST /api/fichas/:id/pdf (multipart, autenticado, CSRF) → el server
   valida los magic bytes reales del archivo (no confía en el Content-Type
   declarado), lo guarda en el volumen, y devuelve un link firmado con TTL
6. El link se abre en wa.me (WhatsApp) o se ofrece para descargar directo
```

Ver también el README raíz (setup local) y `docs/DEPLOY.md` (producción en Railway).
