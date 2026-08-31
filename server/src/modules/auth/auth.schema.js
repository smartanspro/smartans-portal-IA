import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Falta el usuario.'),
  password: z.string().min(1, 'Falta la contraseña.'),
  captchaToken: z.string().min(1, 'Falta el token del captcha.'),
  captchaAnswer: z.coerce.number(),
});
