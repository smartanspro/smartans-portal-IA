// Réplica exacta del hash SHA-256+salt que usaba Code.gs (Utilities.computeDigest),
// SOLO para poder verificar contraseñas migradas desde Google Sheets en su
// primer login acá. Una vez verificada, auth.service.js la re-hashea con
// argon2id y borra estas columnas — este código deja de usarse para esa fila.

import crypto from 'node:crypto';

export function verifyLegacyPassword(password, salt, expectedHashHex) {
  const hash = crypto.createHash('sha256').update(`${password}:${salt}`).digest('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHashHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
