// Decodifica el access token de la cookie y carga req.user = { id, role }.
// Reemplaza por completo el patrón viejo de "reenviar usuario+password en
// cada request" — acá el password solo viaja una vez, en /api/auth/login.

import jwt from 'jsonwebtoken';
import { ACCESS_COOKIE } from '../lib/cookies.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { AppError } from './errorHandler.js';

export function authenticate(req, res, next) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) {
    return next(new AppError(401, 'NOT_AUTHENTICATED', 'No hay sesión activa.'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      // Código específico: el cliente lo usa para disparar /api/auth/refresh
      // automáticamente y reintentar, sin que el usuario note nada.
      return next(new AppError(401, 'TOKEN_EXPIRED', 'La sesión expiró.'));
    }
    return next(new AppError(401, 'NOT_AUTHENTICATED', 'Sesión inválida.'));
  }
}
