import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { loginLimiter } from '../../middleware/rateLimit.js';
import { loginSchema } from './auth.schema.js';
import { getCaptcha, postLogin, postRefresh, postLogout } from './auth.controller.js';

export const authRoutes = Router();

authRoutes.get('/captcha', getCaptcha);
authRoutes.post('/login', loginLimiter, validate({ body: loginSchema }), postLogin);
authRoutes.post('/refresh', postRefresh);
authRoutes.post('/logout', postLogout);
