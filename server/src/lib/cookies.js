// Nombres y opciones de las cookies de sesión, centralizados acá para que
// nunca queden inconsistencias entre quién las setea y quién las lee/borra.

import { env, isProd } from '../config/env.js';

export const ACCESS_COOKIE = 'sp_access';
export const REFRESH_COOKIE = 'sp_refresh';

const baseOptions = {
  httpOnly: true,
  secure: isProd, // en local (http) Secure rompería la cookie; en prod (https) es obligatorio
  sameSite: 'strict',
};

export function setAccessCookie(res, token) {
  res.cookie(ACCESS_COOKIE, token, {
    ...baseOptions,
    maxAge: env.ACCESS_TOKEN_TTL_MIN * 60 * 1000,
    path: '/',
  });
}

export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    // acotado a las únicas rutas que lo necesitan — así ni siquiera viaja
    // en el resto de los requests (menos superficie si hay XSS).
    path: '/api/auth',
  });
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions, path: '/api/auth' });
}
