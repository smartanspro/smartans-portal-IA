import { Router } from 'express';
import multer from 'multer';
import { AppError } from '../../../middleware/errorHandler.js';
import { uploadPdf } from './pdf.controller.js';

// En memoria (no en disco temporal): son PDFs de fichas, no archivos
// grandes, y así podemos chequear los magic bytes antes de decidir si
// guardarlo en el volumen persistente.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new AppError(400, 'INVALID_FILE', 'El archivo tiene que ser un PDF.'));
    }
    cb(null, true);
  },
});

// mergeParams:true es obligatorio acá — sin esto, este router (montado bajo
// /api/fichas/:id/pdf en fichas.routes.js) NO hereda el `:id` del router
// padre, y req.params.id llega undefined al controller (rompe el bind a
// SQLite con un error bastante críptico si no se sabe buscar por acá).
export const pdfRoutes = Router({ mergeParams: true });

// Montado bajo /api/fichas/:id/pdf con authenticate+requireModule('fichas')
// ya aplicados por fichasRoutes (ver fichas.routes.js) + CSRF global.
pdfRoutes.post('/', upload.single('file'), uploadPdf);
