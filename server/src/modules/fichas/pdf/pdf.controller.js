import { env } from '../../../config/env.js';
import { AppError } from '../../../middleware/errorHandler.js';
import * as pdfService from './pdf.service.js';

export async function uploadPdf(req, res, next) {
  try {
    if (!req.file) throw new AppError(400, 'MISSING_FILE', 'Falta el archivo PDF.');
    const { token, expiresAt } = await pdfService.uploadFichaPdf(req.params.id, req.file.buffer, req.user.id);
    res.status(201).json({
      shareUrl: `/public/pdf/${token}`,
      expiresAt,
      ttlMinutes: env.PDF_SHARE_TTL_MINUTES,
    });
  } catch (err) {
    next(err);
  }
}

/** Ruta pública (sin auth) — es la que se abre desde el link de WhatsApp. */
export function servePublicPdf(req, res, next) {
  try {
    const absPath = pdfService.resolvePublicShare(req.params.token);
    res.sendFile(absPath);
  } catch (err) {
    next(err);
  }
}
