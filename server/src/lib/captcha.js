// Captcha matemático simple, pero validado de VERDAD en el servidor — a
// diferencia del portal viejo, donde el captcha se resolvía y verificaba
// enteramente en el cliente (bypasseable llamando al backend directo).
//
// El desafío (dos números + el resultado esperado) viaja firmado con HMAC
// en un token opaco de vida corta. El servidor nunca guarda el desafío en
// memoria ni en la DB — el propio token, firmado, es la fuente de verdad,
// así que no importa que el proceso reinicie o que haya varias instancias.

import crypto from 'node:crypto';
import { env } from '../config/env.js';

const CHALLENGE_TTL_MS = 2 * 60 * 1000; // 2 minutos

function sign(payload) {
  return crypto.createHmac('sha256', env.LOGIN_CHALLENGE_SECRET).update(payload).digest('hex');
}

export function createCaptchaChallenge() {
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const answer = a + b;
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;

  const payload = `${answer}.${expiresAt}`;
  const signature = sign(payload);
  const token = Buffer.from(`${payload}.${signature}`).toString('base64url');

  return { token, question: `¿Cuánto es ${a} + ${b}?` };
}

/** true si el token es válido, no expiró, y `submittedAnswer` coincide. */
export function verifyCaptchaChallenge(token, submittedAnswer) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [answerStr, expiresAtStr, signature] = decoded.split('.');
    const payload = `${answerStr}.${expiresAtStr}`;
    const expectedSignature = sign(payload);

    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return false;
    }

    if (Date.now() > Number(expiresAtStr)) return false;

    return Number(submittedAnswer) === Number(answerStr);
  } catch {
    return false;
  }
}
