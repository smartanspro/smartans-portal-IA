import { db } from '../../db/connection.js';

const listFichasStmt = db.prepare(`SELECT * FROM fichas ORDER BY updated_at DESC`);
const findFichaByIdStmt = db.prepare('SELECT * FROM fichas WHERE id = ?');
const insertFichaStmt = db.prepare(`
  INSERT INTO fichas (id, tipo, nombre, data_json, created_by, updated_by)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const updateFichaStmt = db.prepare(`
  UPDATE fichas SET tipo=?, nombre=?, data_json=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
`);
const deleteFichaStmt = db.prepare('DELETE FROM fichas WHERE id = ?');

const findImageStmt = db.prepare('SELECT * FROM ficha_images WHERE ficha_id = ? AND kind = ?');
const upsertImageStmt = db.prepare(`
  INSERT INTO ficha_images (ficha_id, kind, file_path, hash) VALUES (?, ?, ?, ?)
  ON CONFLICT (ficha_id, kind) DO UPDATE SET file_path = excluded.file_path, hash = excluded.hash
`);
const deleteImageStmt = db.prepare('DELETE FROM ficha_images WHERE ficha_id = ? AND kind = ?');
const listImagesForFichaStmt = db.prepare('SELECT * FROM ficha_images WHERE ficha_id = ?');

export function listFichas() {
  return listFichasStmt.all();
}

export function findFichaById(id) {
  return findFichaByIdStmt.get(id);
}

export function insertFicha({ id, tipo, nombre, dataJson, userId }) {
  insertFichaStmt.run(id, tipo, nombre, dataJson, userId, userId);
}

export function updateFicha(id, { tipo, nombre, dataJson, userId }) {
  updateFichaStmt.run(tipo, nombre, dataJson, userId, id);
}

export function deleteFicha(id) {
  deleteFichaStmt.run(id);
}

export function findImage(fichaId, kind) {
  return findImageStmt.get(fichaId, kind);
}

export function upsertImage(fichaId, kind, filePath, hash) {
  upsertImageStmt.run(fichaId, kind, filePath, hash);
}

export function deleteImageRow(fichaId, kind) {
  deleteImageStmt.run(fichaId, kind);
}

export function listImagesForFicha(fichaId) {
  return listImagesForFichaStmt.all(fichaId);
}
