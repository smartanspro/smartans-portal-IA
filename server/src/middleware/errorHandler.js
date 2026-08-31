// Manejador de errores centralizado — última pieza de middleware en app.js.
// Convierte cualquier error (esperado o no) en una respuesta JSON consistente
// y nunca filtra detalles internos (stack, mensajes de SQLite, etc.) al cliente
// en producción.

import { isProd } from '../config/env.js';
import { logger } from '../lib/logger.js';

/** Error de aplicación con status HTTP explícito — usalo en los controllers
 *  en vez de tirar errores genéricos, para no depender de heurísticas acá. */
export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurso no encontrado.' } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err instanceof AppError ? err.status : err.status || 500;
  const code = err instanceof AppError ? err.code : err.code || 'INTERNAL_ERROR';
  const message = status < 500 ? err.message : 'Error interno del servidor.';

  if (status >= 500) {
    logger.error({ err }, 'Unhandled error');
  } else {
    logger.warn({ code, path: req.path }, err.message);
  }

  res.status(status).json({
    error: {
      code,
      message,
      ...(!isProd && status >= 500 ? { stack: err.stack } : {}),
    },
  });
}
