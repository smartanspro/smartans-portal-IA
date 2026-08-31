// Conexión única (singleton) a SQLite, vía node:sqlite — el driver
// incorporado en Node (22.5+, estable en la línea 24.x que usa este
// proyecto), sincrónico igual que better-sqlite3 pero SIN compilación
// nativa: no hace falta Visual Studio/build-essential ni en desarrollo ni
// en el build del PaaS. Un dependency menos que auditar y mantener.

import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { env } from '../config/env.js';

// ':memory:' es un valor especial de SQLite (usado en tests) — no pasa por
// path.resolve/mkdir, que lo tratarían como un nombre de archivo real.
const dbPath = env.DATABASE_PATH === ':memory:' ? ':memory:' : path.resolve(env.DATABASE_PATH);
if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

// PRAGMAs recomendados para un uso tipo "servidor" de SQLite:
// - WAL: permite lecturas concurrentes mientras hay una escritura en curso.
// - foreign_keys=ON: SQLite las ignora por defecto si no se pide explícitamente.
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

export function closeDb() {
  db.close();
}

/** node:sqlite no trae (todavía) un helper `db.transaction(fn)` como
 *  better-sqlite3 — esto lo reemplaza: BEGIN/COMMIT manual, con ROLLBACK
 *  automático si `fn` tira. */
export function runInTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
