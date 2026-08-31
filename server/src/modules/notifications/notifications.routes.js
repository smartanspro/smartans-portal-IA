import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireModule } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { updateConfigSchema, testMessageSchema } from './notifications.schema.js';
import { getConfig, updateConfig, testSlack, testTelegram } from './notifications.controller.js';

export const notificationsRoutes = Router();

notificationsRoutes.use(authenticate, requireModule('notificaciones'));

notificationsRoutes.get('/config', getConfig);
notificationsRoutes.put('/config', validate({ body: updateConfigSchema }), updateConfig);
notificationsRoutes.post('/test/slack', validate({ body: testMessageSchema }), testSlack);
notificationsRoutes.post('/test/telegram', validate({ body: testMessageSchema }), testTelegram);
