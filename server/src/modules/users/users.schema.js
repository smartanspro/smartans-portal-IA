import { z } from 'zod';

const MODULE_CODES = ['fichas', 'rpa', 'agentes', 'monitoreo', 'notificaciones'];

export const createUserSchema = z.object({
  username: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres.').max(50),
  password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres.'),
  role: z.enum(['admin', 'usuario']),
  modules: z.array(z.enum(MODULE_CODES)).default([]),
});

export const updateUserSchema = z.object({
  password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres.').optional(),
  role: z.enum(['admin', 'usuario']).optional(),
  active: z.boolean().optional(),
  modules: z.array(z.enum(MODULE_CODES)).optional(),
});

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
