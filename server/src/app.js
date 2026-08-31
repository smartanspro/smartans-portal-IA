// Ensamblado de la app Express: middlewares globales + rutas + manejo de
// errores. NO llama a listen() acá — eso vive en index.js, para poder
// importar `app` desde los tests (supertest) sin levantar un puerto real.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env, isProd } from './config/env.js';
import { logger } from './lib/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { issueCsrfToken, csrfProtect } from './middleware/csrf.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { fichasRoutes } from './modules/fichas/fichas.routes.js';
import { pdfPublicRoutes } from './modules/fichas/pdf/pdfPublic.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { monitoringRoutes } from './modules/monitoring/monitoring.routes.js';
import { rpaRoutes } from './modules/rpa/rpa.routes.js';
import { agentesRoutes } from './modules/agentes/agentes.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true, // necesario: la auth viaja en cookies httpOnly
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', env: env.NODE_ENV, time: new Date().toISOString() });
  });

  // Emite el par cookie+token de CSRF — pública, sin auth (ver middleware/csrf.js).
  app.get('/api/csrf-token', issueCsrfToken);

  // Link público de PDF compartido (el que abre WhatsApp) — sin auth a
  // propósito, protegido solo por el token opaco+expiración (ver pdf.service.js).
  app.use('/public/pdf', pdfPublicRoutes);

  // CSRF exigido en todo verbo mutante de acá para abajo (GET/HEAD/OPTIONS
  // pasan de largo, ver csrfProtect).
  app.use(csrfProtect);

  app.use('/api/auth', authRoutes);
  app.use('/api/usuarios', usersRoutes);
  app.use('/api/fichas', fichasRoutes);
  app.use('/api/notificaciones', notificationsRoutes);
  app.use('/api/monitoreo', monitoringRoutes);
  app.use('/api/rpa', rpaRoutes);
  app.use('/api/agentes', agentesRoutes);

  // En producción, el server también sirve el build de Vite (client/dist) —
  // en desarrollo, el frontend corre aparte con `vite dev` (HMR) y le pega a
  // esta API por CORS (CORS_ORIGIN), no hace falta nada acá.
  if (isProd) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const clientDist = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/public')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
