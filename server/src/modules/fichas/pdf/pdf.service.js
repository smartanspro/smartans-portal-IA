import { fileTypeFromBuffer } from 'file-type';
import { env } from '../../../config/env.js';
import { AppError } from '../../../middleware/errorHandler.js';
import { randomToken, sha256Hex } from '../../../lib/crypto.js';
import { savePdfFile, absoluteUploadPath } from '../../../lib/uploads.js';
import { findFichaById } from '../fichas.repository.js';
import * as repo from './pdf.repository.js';

export async function uploadFichaPdf(fichaId, buffer, userId) {
  const ficha = findFichaById(fichaId);
  if (!ficha) throw new AppError(404, 'FICHA_NOT_FOUND', 'Ficha no encontrada.');

  // No confiamos en el Content-Type que declara el cliente: chequeamos los
  // magic bytes reales del archivo. Esto es justamente lo que el endpoint
  // uploadPdf viejo (Code.gs) NO hacía, y ni siquiera pedía login.
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || detected.mime !== 'application/pdf') {
    throw new AppError(400, 'INVALID_FILE', 'El archivo subido no es un PDF válido.');
  }

  const filePath = savePdfFile(fichaId, buffer);

  const token = randomToken(24);
  const expiresAt = new Date(Date.now() + env.PDF_SHARE_TTL_MINUTES * 60 * 1000).toISOString();
  repo.createShare({ fichaId, filePath, tokenHash: sha256Hex(token), userId, expiresAt });

  return { token, expiresAt };
}

export function resolvePublicShare(token) {
  const share = repo.findValidShareByHash(sha256Hex(token));
  if (!share) throw new AppError(404, 'LINK_EXPIRED', 'Este link venció o no existe.');
  return absoluteUploadPath(share.file_path);
}
