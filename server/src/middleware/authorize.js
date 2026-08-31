// Autorización por rol y por módulo. requireModule consulta `user_modules`
// EN VIVO contra la DB (no contra algo embebido en el JWT) — así, si un admin
// le saca un módulo a alguien, el cambio aplica en la siguiente request de
// esa persona, sin esperar a que expire su token de acceso.

import { db } from '../db/connection.js';
import { AppError } from './errorHandler.js';

export function requireRole(role) {
  return function (req, res, next) {
    if (!req.user) return next(new AppError(401, 'NOT_AUTHENTICATED', 'No hay sesión activa.'));
    if (req.user.role !== role) {
      return next(new AppError(403, 'FORBIDDEN', 'No tenés permiso para hacer esto.'));
    }
    next();
  };
}

const hasModuleStmt = db.prepare(`
  SELECT 1
  FROM user_modules um
  JOIN modules m ON m.id = um.module_id
  WHERE um.user_id = ? AND m.code = ?
`);

export function requireModule(moduleCode) {
  return function (req, res, next) {
    if (!req.user) return next(new AppError(401, 'NOT_AUTHENTICATED', 'No hay sesión activa.'));

    // El admin siempre tiene acceso a todo, incluso si nunca se le asignaron
    // módulos explícitamente (mismo criterio que el portal viejo).
    if (req.user.role === 'admin') return next();

    const granted = hasModuleStmt.get(req.user.id, moduleCode);
    if (!granted) {
      return next(new AppError(403, 'MODULE_FORBIDDEN', `No tenés acceso al módulo "${moduleCode}".`));
    }
    next();
  };
}
