// Rate limiting del login — cierra el hueco de fuerza bruta que tenía el
// backend viejo (Apps Script no tenía NINGÚN control de intentos).

import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

export const loginLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MIN * 60 * 1000,
  limit: env.RATE_LIMIT_LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  // clave por IP + usuario intentado, no solo por IP: así un usuario con
  // password olvidada no le come el cupo de intentos a todo el resto de la
  // oficina si comparten salida a internet.
  keyGenerator: (req) => `${req.ip}:${req.body?.username || 'unknown'}`,
  handler: (req, res, next) => {
    next(new AppError(429, 'TOO_MANY_ATTEMPTS', 'Demasiados intentos. Probá de nuevo en unos minutos.'));
  },
});
