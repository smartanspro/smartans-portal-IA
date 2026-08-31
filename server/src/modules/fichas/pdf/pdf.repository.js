import { db } from '../../../db/connection.js';

const insertShareStmt = db.prepare(`
  INSERT INTO pdf_shares (ficha_id, file_path, token_hash, created_by, expires_at)
  VALUES (?, ?, ?, ?, ?)
`);
const findValidShareByHashStmt = db.prepare(`
  SELECT * FROM pdf_shares WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP
`);

export function createShare({ fichaId, filePath, tokenHash, userId, expiresAt }) {
  insertShareStmt.run(fichaId, filePath, tokenHash, userId, expiresAt);
}

export function findValidShareByHash(tokenHash) {
  return findValidShareByHashStmt.get(tokenHash);
}
