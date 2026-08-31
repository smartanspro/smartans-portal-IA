// Almacenamiento de archivos en el filesystem local (sobre el volumen
// persistente del PaaS en producción) — reemplaza a Google Drive.
//
// Las imágenes de las fichas (hero/logo) siguen viajando del cliente como
// dataURL base64 dentro del JSON, igual que con el backend de Apps Script
// viejo — esto evita reescribir el frontend actual de cero para este punto.
// El backend decodifica, guarda en disco, y devuelve/relee como dataURL
// (nunca como URL "hotlinkeable": eso rompería el html2canvas del cliente,
// que necesita CORS que un filesystem local no puede dar de la misma forma
// simple que un <img src="data:...">).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const DATA_URL_RE = /^data:([^;]+);base64,(.*)$/s;

export function isDataUrl(value) {
  return typeof value === 'string' && DATA_URL_RE.test(value);
}

export function hashDataUrl(dataUrl) {
  return crypto.createHash('sha256').update(dataUrl).digest('hex');
}

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Guarda una imagen (dataURL) en UPLOADS_DIR/fichas/<fichaId>/ y devuelve
 *  la ruta relativa (la que se guarda en `ficha_images.file_path`). */
export function saveFichaImage(fichaId, kind, dataUrl) {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) throw new Error('dataUrl inválida — se esperaba "data:<mime>;base64,<...>"');

  const [, mime, base64] = match;
  const ext = EXT_BY_MIME[mime] || 'bin';
  const dir = path.join(path.resolve(env.UPLOADS_DIR), 'fichas', fichaId);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${kind}-${randomUUID()}.${ext}`;
  const absPath = path.join(dir, filename);
  fs.writeFileSync(absPath, Buffer.from(base64, 'base64'));

  return path.join('fichas', fichaId, filename);
}

/** Relee un archivo guardado y lo devuelve como dataURL — lo que el frontend
 *  necesita para pintarlo en <img>/html2canvas sin depender de CORS. */
export function readFileAsDataUrl(relativePath) {
  const absPath = path.join(path.resolve(env.UPLOADS_DIR), relativePath);
  if (!fs.existsSync(absPath)) return null;

  const ext = path.extname(absPath).slice(1).toLowerCase();
  const mime = Object.entries(EXT_BY_MIME).find(([, e]) => e === ext)?.[0] || 'application/octet-stream';
  const bytes = fs.readFileSync(absPath);
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

export function deleteUploadedFile(relativePath) {
  const absPath = path.join(path.resolve(env.UPLOADS_DIR), relativePath);
  fs.rm(absPath, { force: true }, () => {}); // best-effort, no bloquea el flujo si falla
}

/** Guarda un Buffer arbitrario (los PDFs generados en el cliente, no dataURL) */
export function savePdfFile(fichaId, buffer) {
  const dir = path.join(path.resolve(env.UPLOADS_DIR), 'pdfs', fichaId);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${randomUUID()}.pdf`;
  const absPath = path.join(dir, filename);
  fs.writeFileSync(absPath, buffer);
  return path.join('pdfs', fichaId, filename);
}

export function absoluteUploadPath(relativePath) {
  return path.join(path.resolve(env.UPLOADS_DIR), relativePath);
}
