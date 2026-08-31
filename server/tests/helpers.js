// Helpers compartidos por los tests — arrancan la app UNA vez (DB :memory:
// singleton, ver tests/setup.js) y dan de alta usuarios + hacen el login
// completo (csrf-token + captcha + login) igual que tendría que hacerlo el
// frontend real.

import request from 'supertest';
import argon2 from 'argon2';
import { runMigrations } from '../src/db/migrate.js';
import { db } from '../src/db/connection.js';

runMigrations();

// import DINÁMICO a propósito: ./app.js (y las rutas que importa) preparan
// consultas SQL apenas se cargan — necesitan que las migraciones ya hayan
// corrido. Un `import` estático se resolvería ANTES que `runMigrations()`
// de más arriba, sin importar el orden en que esté escrito (mismo motivo
// documentado en server/src/index.js).
const { createApp } = await import('../src/app.js');
export const app = createApp();

export async function createTestUser({ username, password, role = 'usuario', modules = [], active = true }) {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const info = db
    .prepare(`INSERT INTO users (username, password_hash, password_algo, role, active) VALUES (?, ?, 'argon2id', ?, ?)`)
    .run(username, passwordHash, role, active ? 1 : 0);

  const moduleIdStmt = db.prepare('SELECT id FROM modules WHERE code = ?');
  const insertUserModuleStmt = db.prepare('INSERT INTO user_modules (user_id, module_id) VALUES (?, ?)');
  for (const code of modules) {
    const mod = moduleIdStmt.get(code);
    if (mod) insertUserModuleStmt.run(info.lastInsertRowid, mod.id);
  }
  return info.lastInsertRowid;
}

function extractCaptchaAnswer(question) {
  const match = /(\d+)\s*\+\s*(\d+)/.exec(question);
  return Number(match[1]) + Number(match[2]);
}

/** supertest agent con cookies persistidas + login completo. Si `password`
 *  es incorrecta a propósito (para tests de fallo), igual devuelve el
 *  agent y el `loginResp` con el error, para que el test lo inspeccione. */
export async function loginAgent(username, password) {
  const agent = request.agent(app);

  const csrfResp = await agent.get('/api/csrf-token');
  const csrfToken = csrfResp.body.csrfToken;

  const captchaResp = await agent.get('/api/auth/captcha');
  const answer = extractCaptchaAnswer(captchaResp.body.question);

  const loginResp = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrfToken)
    .send({ username, password, captchaToken: captchaResp.body.captchaToken, captchaAnswer: answer });

  return { agent, csrfToken, loginResp };
}

export async function getCsrfToken(agent) {
  const resp = await agent.get('/api/csrf-token');
  return resp.body.csrfToken;
}
