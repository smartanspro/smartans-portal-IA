import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { db } from '../src/db/connection.js';
import { loginAgent } from './helpers.js';

// Réplica de Utilities.computeDigest(SHA_256, password+':'+salt) — el hash
// que usaba Code.gs, para simular un usuario migrado desde Sheets.
function legacyHash(password, salt) {
  return crypto.createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

describe('upgrade de password legacy (migración desde Sheets)', () => {
  it('un usuario con solo hash legacy puede loguearse, y queda migrado a argon2id', async () => {
    const salt = 'sal-de-prueba';
    const password = 'password-original-de-sheets';
    const hash = legacyHash(password, salt);

    const info = db
      .prepare(
        `INSERT INTO users (username, password_hash, password_algo, legacy_password_hash, legacy_password_salt, role, active)
         VALUES (?, '', 'legacy', ?, ?, 'usuario', 1)`
      )
      .run('migrada-de-sheets', hash, salt);

    const { loginResp } = await loginAgent('migrada-de-sheets', password);
    expect(loginResp.status).toBe(200);

    const row = db.prepare('SELECT password_algo, legacy_password_hash FROM users WHERE id = ?').get(info.lastInsertRowid);
    expect(row.password_algo).toBe('argon2id');
    expect(row.legacy_password_hash).toBeNull();

    // el segundo login ya tiene que pasar por argon2, no por el camino legacy
    const { loginResp: secondLogin } = await loginAgent('migrada-de-sheets', password);
    expect(secondLogin.status).toBe(200);
  });
});
