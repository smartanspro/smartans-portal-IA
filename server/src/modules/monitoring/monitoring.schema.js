import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().url('Tiene que ser una URL válida, con http:// o https://.'),
});

export const serviceIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
