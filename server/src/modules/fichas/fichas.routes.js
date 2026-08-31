import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireModule } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { saveFichaSchema, fichaIdParamSchema } from './fichas.schema.js';
import { listFichas, getFicha, createFicha, updateFicha, deleteFicha } from './fichas.controller.js';
import { pdfRoutes } from './pdf/pdf.routes.js';

export const fichasRoutes = Router();

fichasRoutes.use(authenticate, requireModule('fichas'));

fichasRoutes.get('/', listFichas);
fichasRoutes.post('/', validate({ body: saveFichaSchema }), createFicha);
fichasRoutes.get('/:id', validate({ params: fichaIdParamSchema }), getFicha);
fichasRoutes.put('/:id', validate({ params: fichaIdParamSchema, body: saveFichaSchema }), updateFicha);
fichasRoutes.delete('/:id', validate({ params: fichaIdParamSchema }), deleteFicha);

// Sub-rutas de generación/subida de PDF (ver módulo pdf/) — mismo prefijo
// /api/fichas/:id/pdf, con su propia protección adicional (magic bytes, etc).
fichasRoutes.use('/:id/pdf', validate({ params: fichaIdParamSchema }), pdfRoutes);
