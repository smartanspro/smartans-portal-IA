import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createUserSchema, updateUserSchema, userIdParamSchema } from './users.schema.js';
import { listUsers, createUser, updateUser, deleteUser } from './users.controller.js';

export const usersRoutes = Router();

// Todo el módulo es exclusivo de admin — un usuario no-admin ni siquiera
// puede listar a los demás.
usersRoutes.use(authenticate, requireRole('admin'));

usersRoutes.get('/', listUsers);
usersRoutes.post('/', validate({ body: createUserSchema }), createUser);
usersRoutes.patch('/:id', validate({ params: userIdParamSchema, body: updateUserSchema }), updateUser);
usersRoutes.delete('/:id', validate({ params: userIdParamSchema }), deleteUser);
