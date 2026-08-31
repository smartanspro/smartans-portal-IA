# Despliegue en Railway

## Por qué Railway (y no Render o Fly.io)

Ver la tabla de decisiones en el README raíz. En resumen: volumen persistente
simple desde el dashboard (necesario para que `smartans.db` sobreviva a cada
redeploy), deploy por git push sin YAML obligatorio, sin sleep en plan pago
(necesario porque el cron de Monitoreo tiene que estar siempre vivo).

## ⚠️ Restricción importante: una sola instancia

SQLite es un archivo. Si Railway escala el servicio a más de una instancia
("Replicas" > 1), vas a tener dos procesos escribiendo el mismo archivo sin
coordinación — corrupción de datos garantizada. **Nunca actives autoscaling
horizontal en este servicio.** Una instancia alcanza de sobra para el
volumen de uso de un equipo interno.

## Pasos

### 1. Crear el proyecto

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo (o `railway init` con la CLI si preferís no depender de GitHub).
2. En la configuración del servicio, seteá **Root Directory** a `server` (el monorepo tiene `server/` y `client/` como workspaces separados — Railway solo necesita levantar `server/`, que sirve el frontend ya compilado desde `client/dist` — ver paso 4).

### 2. Agregar el volumen persistente

Settings → Volumes → Add Volume → **Mount path: `/data`**.

### 3. Variables de entorno

Settings → Variables, cargá todas las de `server/env.example`, con estos valores para producción:

```
NODE_ENV=production
DATABASE_PATH=/data/smartans.db
UPLOADS_DIR=/data/uploads
CORS_ORIGIN=https://tu-dominio-final.up.railway.app
```

Los 4 secretos (`JWT_ACCESS_SECRET`, `CSRF_SECRET`, `LOGIN_CHALLENGE_SECRET`,
`PDF_SHARE_TOKEN_SECRET`) generalos con:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Uno por variable, **nunca reutilices el mismo valor entre secretos distintos**, y nunca los pegues en un commit.

### 4. Build del frontend

El `client/` (Vite) se compila aparte y su `dist/` se sirve como estáticos
desde el propio `server` en producción (ver `server/src/app.js`, sección de
archivos estáticos). Antes de cada deploy (o como parte del pipeline de CI
que armes):
```bash
npm run build:client
```
Esto genera `client/dist/`, que el server sirve en producción.

### 5. Deploy

Con GitHub conectado: cada push a la rama configurada dispara el deploy solo.
Sin GitHub (si el acceso al repo sigue con el problema conocido de push):
```bash
npm i -g @railway/cli
railway login
railway link            # elegís el proyecto ya creado
railway up               # deploya el directorio actual sin pasar por git
```

### 6. Migraciones y usuario admin (primera vez)

```bash
railway run npm run migrate --workspace server
railway run npm run seed --workspace server
```
El seed te pide usuario/contraseña del primer admin por consola — no hay ningún default hardcodeado.

### 7. Verificar

```bash
curl https://tu-dominio-final.up.railway.app/api/health
```
Debería dar `{"status":"ok",...}`. Creá una ficha de prueba, forzá un redeploy manual desde el dashboard, y confirmá que la ficha sigue estando — eso valida que el volumen persistente está bien montado.

## Backups

SQLite es un solo archivo — el backup más simple es copiar `/data/smartans.db` periódicamente. Railway no hace backups automáticos de volúmenes por defecto; si esto pasa a ser crítico, agregar un cron liviano (dentro del mismo proceso Node, con `node-cron`, similar al de Monitoreo) que copie el archivo a un bucket S3-compatible es la mejora natural — no está implementado en esta primera versión.
