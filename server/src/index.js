// Entrypoint del proceso: corre migraciones pendientes, arma la app y escucha.
// `env` ya se validó al importarse (falla rápido si falta algo — ver config/env.js).
//
// OJO con el orden: `createApp`/las rutas se importan DINÁMICAMENTE (await
// import) después de correr las migraciones, a propósito. Cada módulo de
// rutas prepara sus consultas SQL (`db.prepare(...)`) apenas se importa —
// si `./app.js` fuera un `import` estático normal, ES modules lo evaluaría
// ANTES que `runMigrations()` (los imports siempre se resuelven antes que
// el resto del código del archivo, sin importar el orden en que estén
// escritos), y esas consultas fallarían con "no such table" en una base
// nueva. El `await import(...)` sí respeta el orden real de ejecución.

import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { logger } from './lib/logger.js';

runMigrations();

const { createApp } = await import('./app.js');
const { startMonitoringScheduler } = await import('./modules/monitoring/monitoring.scheduler.js');

const app = createApp();
startMonitoringScheduler();

const server = app.listen(env.PORT, () => {
  logger.info(`Servidor escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal) {
  logger.info(`${signal} recibido — cerrando servidor...`);
  server.close(() => process.exit(0));
  // Si algo no cierra solo en 10s, forzamos salida (evita quedar colgado en el PaaS).
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
