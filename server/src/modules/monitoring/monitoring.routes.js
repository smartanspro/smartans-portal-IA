import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireModule } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createServiceSchema, serviceIdParamSchema } from './monitoring.schema.js';
import { listServices, createService, deleteService, checkNow } from './monitoring.controller.js';

export const monitoringRoutes = Router();

monitoringRoutes.use(authenticate, requireModule('monitoreo'));

monitoringRoutes.get('/', listServices);
monitoringRoutes.post('/', validate({ body: createServiceSchema }), createService);
monitoringRoutes.delete('/:id', validate({ params: serviceIdParamSchema }), deleteService);
monitoringRoutes.post('/:id/check', validate({ params: serviceIdParamSchema }), checkNow);
