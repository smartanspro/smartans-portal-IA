import { z } from 'zod';

// `data` es el estado completo del formulario (distinto shape según tipo
// canje/credito) — se valida como objeto JSON razonable y se limita el
// tamaño total del body en app.js (express.json({limit:'2mb'})), no acá
// campo por campo: modelarlo 1:1 duplicaría toda la lógica del frontend
// sin beneficio real de seguridad adicional.
const dataUrlOrNull = z
  .union([z.string().startsWith('data:'), z.null()])
  .optional();

export const saveFichaSchema = z.object({
  tipo: z.enum(['canje', 'credito']),
  nombre: z.string().trim().min(1).max(200),
  data: z.record(z.string(), z.unknown()),
  hero: dataUrlOrNull,
  logo: dataUrlOrNull,
});

export const fichaIdParamSchema = z.object({
  id: z.string().uuid(),
});
