// Firma y verificación del access token (JWT de vida corta). El refresh token
// NO es un JWT — es un valor opaco random cuyo hash vive en `sessions`
// (ver modules/auth/auth.repository.js), lo que permite revocarlo de verdad.

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ISSUER = 'smartans-portal';

/** payload: { sub: userId, role } — a propósito NO incluye los módulos
 *  permitidos: eso se consulta en vivo en cada request (ver authorize.js),
 *  para que un cambio de permisos del admin aplique de inmediato. */
export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m`,
    issuer: ISSUER,
  });
}

/** Lanza si el token es inválido o expiró — el caller decide cómo responder. */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: ISSUER });
}
