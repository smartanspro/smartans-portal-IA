// Middleware genérico de validación con zod — se usa como
// `validate({ body: loginSchema })` en cada ruta mutante, ANTES de que el
// controller vea el request. Si algo no matchea el schema, responde 400 con
// el detalle de qué campo falló, sin llegar nunca al controller.

import { AppError } from './errorHandler.js';

export function validate(schemas) {
  return function (req, res, next) {
    for (const key of ['body', 'params', 'query']) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const detail = result.error.issues.map((i) => `${i.path.join('.') || key}: ${i.message}`).join('; ');
        return next(new AppError(400, 'VALIDATION_ERROR', detail));
      }
      req[key] = result.data;
    }
    next();
  };
}
