import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../../middleware/validate.js';
import { servePublicPdf } from './pdf.controller.js';

// Sin auth a propósito — es el link que se abre desde WhatsApp. La única
// protección es el token en sí: opaco, de un solo hash, con expiración
// corta (ver PDF_SHARE_TTL_MINUTES), y no lista ni permite enumerar otros PDFs.
export const pdfPublicRoutes = Router();

const tokenParamSchema = z.object({ token: z.string().min(10).max(200) });

pdfPublicRoutes.get('/:token', validate({ params: tokenParamSchema }), servePublicPdf);
