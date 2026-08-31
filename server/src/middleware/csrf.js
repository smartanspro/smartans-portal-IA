// Protección CSRF (double-submit cookie) — necesaria porque la sesión vive
// en cookies. El cliente pide un token en GET /api/csrf-token (cookie no-http-only
// + valor en el body de la respuesta) y lo reenvía en el header `X-CSRF-Token`
// en cada request mutante; este middleware compara ambos.
//
// API real de csrf-csrf@3.x (verificada leyendo node_modules/csrf-csrf/lib/esm/index.js
// directamente — la doc/nombres "obvios" no coincidían con el código real):
// `doubleCsrf(...)` devuelve `{ invalidCsrfTokenError, generateToken, validateRequest, doubleCsrfProtection }`
// — el generador se llama `generateToken`, NO `generateCsrfToken`. El error
// que tira `doubleCsrfProtection` cuando falta/no matchea el token trae
// `.code = 'EBADCSRFTOKEN'` (default de `errorConfig.code`) — el cliente
// (`client/src/api/http.js`) chequea ese código exacto para reintentar.

import { doubleCsrf } from 'csrf-csrf';
import { env, isProd } from '../config/env.js';

const { generateToken, doubleCsrfProtection, invalidCsrfTokenError } = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  cookieName: 'sp_csrf',
  cookieOptions: { httpOnly: false, sameSite: 'strict', secure: isProd, path: '/' },
  size: 64,
  // OJO: a propósito NO se ata al access token (que cambia en cada login/refresh
  // cada 15min) — si lo hiciéramos, el token de CSRF quedaría inválido apenas
  // el usuario loguea o refresca, obligando a pedir uno nuevo todo el tiempo.
  // La protección real acá es el double-submit en sí + SameSite=Strict.
  getSessionIdentifier: () => 'smartans-portal',
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

/** Ruta pública: emite el par cookie+token que el cliente debe reenviar. */
export function issueCsrfToken(req, res) {
  const token = generateToken(req, res);
  res.json({ csrfToken: token });
}

/** Solo exige el token en verbos mutantes — GET/HEAD/OPTIONS no lo necesitan. */
export function csrfProtect(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  return doubleCsrfProtection(req, res, next);
}

export { invalidCsrfTokenError };
