import argon2 from 'argon2';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/errorHandler.js';
import { verifyCaptchaChallenge } from '../../lib/captcha.js';
import { verifyLegacyPassword } from '../../lib/legacyPassword.js';
import { randomToken, sha256Hex } from '../../lib/crypto.js';
import { signAccessToken } from '../../lib/jwt.js';
import {
  findUserByUsername,
  findUserById,
  upgradeUserPassword,
  createSession,
  findActiveSessionByHash,
  revokeSessionById,
  revokeSessionByHash,
  getUserModuleCodes,
} from './auth.repository.js';

function refreshExpiryIso() {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

async function verifyPassword(user, password) {
  if (user.password_algo === 'argon2id' && user.password_hash) {
    return argon2.verify(user.password_hash, password);
  }
  // Usuario todavía no migrado del todo (vino de Sheets): probamos el hash
  // legacy y, si matchea, lo actualizamos a argon2id acá mismo.
  if (user.legacy_password_hash && user.legacy_password_salt) {
    const ok = verifyLegacyPassword(password, user.legacy_password_salt, user.legacy_password_hash);
    if (ok) {
      const newHash = await argon2.hash(password, { type: argon2.argon2id });
      upgradeUserPassword(user.id, newHash);
    }
    return ok;
  }
  return false;
}

function issueSession(user, { userAgent, ip } = {}) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  const refreshToken = randomToken(32);
  createSession({
    userId: user.id,
    refreshTokenHash: sha256Hex(refreshToken),
    userAgent,
    ip,
    expiresAt: refreshExpiryIso(),
  });

  return { accessToken, refreshToken };
}

export async function login({ username, password, captchaToken, captchaAnswer }, ctx = {}) {
  if (!verifyCaptchaChallenge(captchaToken, captchaAnswer)) {
    throw new AppError(400, 'INVALID_CAPTCHA', 'Verificación incorrecta.');
  }

  const user = findUserByUsername(username);
  // Mensaje idéntico exista o no el usuario — no dar pistas de qué falló.
  const genericError = () => new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.');

  if (!user) throw genericError();
  if (!user.active) throw new AppError(403, 'USER_DISABLED', 'Ese usuario está deshabilitado.');

  const passwordOk = await verifyPassword(user, password);
  if (!passwordOk) throw genericError();

  const { accessToken, refreshToken } = issueSession(user, ctx);
  const modules = getUserModuleCodes(user);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, username: user.username, role: user.role, modules },
  };
}

export function refresh(refreshTokenCookie, ctx = {}) {
  if (!refreshTokenCookie) throw new AppError(401, 'NOT_AUTHENTICATED', 'No hay sesión para refrescar.');

  const hash = sha256Hex(refreshTokenCookie);
  const session = findActiveSessionByHash(hash);
  if (!session) throw new AppError(401, 'NOT_AUTHENTICATED', 'Sesión expirada o revocada.');

  const user = findUserById(session.user_id);
  if (!user || !user.active) throw new AppError(401, 'NOT_AUTHENTICATED', 'Usuario inválido.');

  // Rotación: se revoca la sesión usada y se emite una completamente nueva.
  // Si alguien reusa un refresh token viejo (robado), esa sesión ya está
  // revocada y el intento falla — el legítimo dueño ya tiene una vigente.
  revokeSessionById(session.id);
  const { accessToken, refreshToken } = issueSession(user, ctx);
  const modules = getUserModuleCodes(user);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, username: user.username, role: user.role, modules },
  };
}

export function logout(refreshTokenCookie) {
  if (refreshTokenCookie) revokeSessionByHash(sha256Hex(refreshTokenCookie));
}
