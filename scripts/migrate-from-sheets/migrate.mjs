// Importa los CSV exportados de las Sheets del portal viejo a la SQLite
// nueva. Ver README.md de esta misma carpeta para el paso a paso completo.
//
// Uso:
//   node migrate.mjs --dry-run
//   node migrate.mjs
//
// Variables de entorno opcionales (si no se pasan, usa las rutas por defecto
// relativas a server/, asumiendo que este script corre desde el repo):
//   DATABASE_PATH, UPLOADS_DIR

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const INPUT_DIR = path.join(__dirname, 'input');
const IMAGES_DIR = path.join(INPUT_DIR, 'images');

const DRY_RUN = process.argv.includes('--dry-run');
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(REPO_ROOT, 'server/data/smartans.db');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(REPO_ROOT, 'server/data/uploads');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'server/src/db/migrations');

function readCsv(filename) {
  const filePath = path.join(INPUT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠ No se encontró ${filename} en input/ — se saltea esa parte de la migración.`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

function ensureSchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  const applied = new Set(db.prepare('SELECT filename FROM _migrations').all().map((r) => r.filename));
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const filename of files) {
    if (applied.has(filename)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(filename);
    console.log(`✓ Migración aplicada: ${filename}`);
  }
}

function parseModulosCsv(raw) {
  if (!raw) return null; // null = "todos" (compatibilidad con filas viejas sin la columna)
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

const counts = { users: 0, usersSkipped: 0, fichas: 0, fichasSkipped: 0, services: 0, servicesSkipped: 0, notifConfig: 0 };

function migrateUsers(db, rows) {
  const findStmt = db.prepare('SELECT id FROM users WHERE username = ?');
  const insertStmt = db.prepare(`
    INSERT INTO users (username, password_hash, password_algo, legacy_password_hash, legacy_password_salt, role, active)
    VALUES (?, '', 'legacy', ?, ?, ?, ?)
  `);
  const moduleIdStmt = db.prepare('SELECT id FROM modules WHERE code = ?');
  const insertUserModuleStmt = db.prepare('INSERT OR IGNORE INTO user_modules (user_id, module_id) VALUES (?, ?)');
  const allModuleCodes = db.prepare('SELECT code FROM modules').all().map((m) => m.code);

  for (const row of rows) {
    const username = row.usuario?.trim();
    if (!username) continue;
    if (findStmt.get(username)) {
      counts.usersSkipped++;
      continue;
    }

    const role = row.rol === 'admin' ? 'admin' : 'usuario';
    const active = String(row.activo).toLowerCase() === 'true' || row.activo === '1' ? 1 : 0;

    if (DRY_RUN) {
      counts.users++;
      continue;
    }

    const info = insertStmt.run(username, row.passwordHash, row.salt, role, active);
    const modules = parseModulosCsv(row.modulos) ?? allModuleCodes;
    for (const code of modules) {
      const mod = moduleIdStmt.get(code);
      if (mod) insertUserModuleStmt.run(info.lastInsertRowid, mod.id);
    }
    counts.users++;
  }
}

function findImageFile(fileId) {
  if (!fileId || !fs.existsSync(IMAGES_DIR)) return null;
  const match = fs.readdirSync(IMAGES_DIR).find((f) => f.includes(fileId));
  return match ? path.join(IMAGES_DIR, match) : null;
}

function copyImage(fichaId, kind, sourcePath) {
  const ext = path.extname(sourcePath) || '.jpg';
  const destDir = path.join(UPLOADS_DIR, 'fichas', fichaId);
  fs.mkdirSync(destDir, { recursive: true });
  const filename = `${kind}-${crypto.randomUUID()}${ext}`;
  const destPath = path.join(destDir, filename);
  fs.copyFileSync(sourcePath, destPath);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(destPath)).digest('hex');
  return { relativePath: path.join('fichas', fichaId, filename), hash };
}

function migrateFichas(db, rows) {
  const findStmt = db.prepare('SELECT id FROM fichas WHERE id = ?');
  const insertStmt = db.prepare(`
    INSERT INTO fichas (id, tipo, nombre, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertImageStmt = db.prepare(`
    INSERT INTO ficha_images (ficha_id, kind, file_path, hash) VALUES (?, ?, ?, ?)
  `);

  for (const row of rows) {
    const id = row.id?.trim();
    if (!id) continue;
    if (findStmt.get(id)) {
      counts.fichasSkipped++;
      continue;
    }

    if (DRY_RUN) {
      counts.fichas++;
      continue;
    }

    const updatedAt = row.updatedAt || new Date().toISOString();
    insertStmt.run(id, row.tipo, row.nombre || 'Ficha sin título', row.dataJSON || '{}', updatedAt, updatedAt);

    for (const [kind, fileIdCol] of [['hero', 'heroFileId'], ['logo', 'logoFileId']]) {
      const fileId = row[fileIdCol];
      const source = findImageFile(fileId);
      if (!source) continue;
      const { relativePath, hash } = copyImage(id, kind, source);
      insertImageStmt.run(id, kind, relativePath, hash);
    }

    counts.fichas++;
  }
}

function migrateNotifConfig(db, rows) {
  if (rows.length === 0) return;
  const row = rows[0];
  if (DRY_RUN) {
    counts.notifConfig = 1;
    return;
  }
  db.prepare(`
    UPDATE notif_config SET slack_webhook_url=?, telegram_bot_token=?, telegram_chat_id=?, email_to=? WHERE id=1
  `).run(row.slackWebhook || null, row.telegramToken || null, row.telegramChat || null, row.emailTo || null);
  counts.notifConfig = 1;
}

function migrateMonitorServices(db, rows) {
  const findStmt = db.prepare('SELECT id FROM monitor_services WHERE name = ? AND url = ?');
  const insertStmt = db.prepare('INSERT INTO monitor_services (name, url) VALUES (?, ?)');

  for (const row of rows) {
    if (!row.name || !row.url) continue;
    if (findStmt.get(row.name, row.url)) {
      counts.servicesSkipped++;
      continue;
    }
    if (!DRY_RUN) insertStmt.run(row.name, row.url);
    counts.services++;
  }
}

function main() {
  console.log(`=== Migración Sheets → SQLite ${DRY_RUN ? '(DRY RUN — no se escribe nada)' : ''} ===`);
  console.log(`DB destino: ${DATABASE_PATH}`);

  fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
  const db = new DatabaseSync(DATABASE_PATH);
  db.exec('PRAGMA foreign_keys = ON');
  ensureSchema(db);

  const usuarios = readCsv('Usuarios.csv');
  const fichas = readCsv('Fichas.csv');
  const notifConfig = readCsv('NotifConfig.csv');
  const monitorServicios = readCsv('MonitorServicios.csv');

  // node:sqlite no trae un helper `db.transaction(fn)` — BEGIN/COMMIT/ROLLBACK
  // manual, mismo patrón que server/src/db/connection.js#runInTransaction.
  db.exec('BEGIN');
  try {
    migrateUsers(db, usuarios);
    migrateFichas(db, fichas);
    migrateNotifConfig(db, notifConfig);
    migrateMonitorServices(db, monitorServicios);
    if (DRY_RUN) throw new Error('__DRY_RUN_ROLLBACK__'); // fuerza rollback
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    if (err.message !== '__DRY_RUN_ROLLBACK__') throw err;
  }

  db.close();

  console.log('\n=== Resultado ===');
  console.log(`Usuarios:   ${counts.users} importados, ${counts.usersSkipped} ya existían (salteados)`);
  console.log(`Fichas:     ${counts.fichas} importadas, ${counts.fichasSkipped} ya existían (salteadas)`);
  console.log(`NotifConfig: ${counts.notifConfig ? 'importado' : 'sin datos'}`);
  console.log(`Servicios:  ${counts.services} importados, ${counts.servicesSkipped} ya existían (salteados)`);
  if (DRY_RUN) console.log('\n(dry-run: no se escribió nada — corré sin --dry-run para aplicar de verdad)');
}

main();
