// Crea el primer usuario administrador — SOLO si la tabla `users` está vacía.
// A diferencia del Code.gs viejo, acá NO hay una contraseña por defecto
// horneada en el código: la pedís vos por variables de entorno o por prompt.
//
// Uso:
//   SEED_ADMIN_USER=admin SEED_ADMIN_PASSWORD='una-contraseña-fuerte' node src/db/seed.js
// o, sin variables, te la pide interactivamente por consola.

import readline from 'node:readline/promises';
import argon2 from 'argon2';
import { db, runInTransaction } from './connection.js';
import { runMigrations } from './migrate.js';

async function prompt(question, { hidden = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  if (!hidden) {
    const answer = await rl.question(question);
    rl.close();
    return answer.trim();
  }
  // node:readline no oculta input nativamente; para un script de un solo uso
  // corrido a mano por un admin, es un trade-off aceptable (no es una app cliente).
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

async function seed() {
  runMigrations();

  const existing = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (existing.n > 0) {
    console.log(`✓ Ya hay ${existing.n} usuario(s) en la base — no se crea ningún admin nuevo.`);
    return;
  }

  const username = process.env.SEED_ADMIN_USER || (await prompt('Usuario admin a crear: '));
  const password = process.env.SEED_ADMIN_PASSWORD || (await prompt('Contraseña (mínimo 10 caracteres): '));

  if (!username || password.length < 10) {
    console.error('❌ Usuario vacío o contraseña muy corta (mínimo 10 caracteres). Abortado.');
    process.exit(1);
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, password_algo, role, active)
    VALUES (?, ?, 'argon2id', 'admin', 1)
  `);
  const info = insertUser.run(username, passwordHash);

  const allModuleIds = db.prepare('SELECT id FROM modules').all().map((m) => m.id);
  const insertUserModule = db.prepare('INSERT INTO user_modules (user_id, module_id) VALUES (?, ?)');
  runInTransaction(() => {
    for (const moduleId of allModuleIds) insertUserModule.run(info.lastInsertRowid, moduleId);
  });

  console.log(`✓ Usuario admin "${username}" creado, con acceso a todos los módulos.`);
}

seed()
  .catch((err) => {
    console.error('❌ Error corriendo el seed:', err);
    process.exit(1);
  })
  .finally(() => db.close());
