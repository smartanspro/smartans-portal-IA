// Acceso a datos de auth — usuarios y sesiones (refresh tokens). Consultas
// preparadas una sola vez al cargar el módulo (reusar el `Statement` en vez
// de re-prepararlo en cada llamada es más barato).

import { db } from '../../db/connection.js';

const findUserByUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ?');
const findUserByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');

const upgradePasswordStmt = db.prepare(`
  UPDATE users
  SET password_hash = ?, password_algo = 'argon2id', legacy_password_hash = NULL, legacy_password_salt = NULL, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const insertSessionStmt = db.prepare(`
  INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip, expires_at)
  VALUES (?, ?, ?, ?, ?)
`);

const findActiveSessionByHashStmt = db.prepare(`
  SELECT * FROM sessions
  WHERE refresh_token_hash = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
`);

const revokeSessionByIdStmt = db.prepare(`UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?`);
const revokeSessionByHashStmt = db.prepare(
  `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE refresh_token_hash = ?`
);

const userModuleCodesStmt = db.prepare(`
  SELECT m.code FROM user_modules um JOIN modules m ON m.id = um.module_id WHERE um.user_id = ?
`);
const allModuleCodesStmt = db.prepare('SELECT code FROM modules');

/** Para el admin devuelve TODOS los códigos (acceso total implícito, igual
 *  que hoy); para el resto, solo los módulos que tiene asignados. Esto es
 *  solo para que el frontend arme el sidebar de entrada — la autorización
 *  real de cada request se revalida en el server (ver authorize.js). */
export function getUserModuleCodes(user) {
  if (user.role === 'admin') return allModuleCodesStmt.all().map((m) => m.code);
  return userModuleCodesStmt.all(user.id).map((m) => m.code);
}

export function findUserByUsername(username) {
  return findUserByUsernameStmt.get(username);
}

export function findUserById(id) {
  return findUserByIdStmt.get(id);
}

export function upgradeUserPassword(userId, newHash) {
  upgradePasswordStmt.run(newHash, userId);
}

export function createSession({ userId, refreshTokenHash, userAgent, ip, expiresAt }) {
  return insertSessionStmt.run(userId, refreshTokenHash, userAgent ?? null, ip ?? null, expiresAt);
}

export function findActiveSessionByHash(hash) {
  return findActiveSessionByHashStmt.get(hash);
}

export function revokeSessionById(id) {
  revokeSessionByIdStmt.run(id);
}

export function revokeSessionByHash(hash) {
  revokeSessionByHashStmt.run(hash);
}
