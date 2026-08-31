// Helpers criptográficos genéricos, reutilizados por auth (refresh tokens) y
// por el módulo de fichas (tokens de links de PDF compartidos).

import crypto from 'node:crypto';

/** Token aleatorio criptográficamente seguro, en hex. */
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/** SHA-256 en hex — usado para guardar HASHES de tokens opacos en la DB
 *  (nunca el valor crudo: si alguien lee la base, no puede reusar el token). */
export function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/** Comparación en tiempo constante — evita timing attacks al comparar hashes/tokens. */
export function timingSafeEqualHex(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
