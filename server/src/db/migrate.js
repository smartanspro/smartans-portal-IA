// Runner de migraciones — aplica, en orden alfabético, cada archivo .sql de
// db/migrations/ que todavía no esté registrado en la tabla `_migrations`.
// Uso: `npm run migrate` (workspace server) o `node src/db/migrate.js`.
// Es seguro correrlo más de una vez: las migraciones ya aplicadas se saltean.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { db, runInTransaction } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

function ensureMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function getAppliedMigrations() {
  const rows = db.prepare('SELECT filename FROM _migrations').all();
  return new Set(rows.map((r) => r.filename));
}

export function runMigrations() {
  ensureMigrationsTable();
  const applied = getAppliedMigrations();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) {
    console.log('✓ Base de datos al día — no hay migraciones pendientes.');
    return { applied: [] };
  }

  for (const filename of pending) {
    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
    runInTransaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(filename);
    });
    console.log(`✓ Migración aplicada: ${filename}`);
  }

  return { applied: pending };
}

// Permite correr este archivo directo: `node src/db/migrate.js`.
// OJO: `process.argv[1]` puede ser una ruta RELATIVA (ej. cuando lo invoca
// `npm run migrate` desde server/) — comparar con un `file://${...}` armado
// a mano nunca matchea en ese caso. `pathToFileURL` normaliza los dos lados
// de la misma forma (absoluta, con las barras correctas en Windows) antes
// de comparar.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMigrations();
}
