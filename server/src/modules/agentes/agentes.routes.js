import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireModule } from '../../middleware/authorize.js';

export const agentesRoutes = Router();

agentesRoutes.use(authenticate, requireModule('agentes'));

agentesRoutes.get('/', (req, res) => {
  res.json({ status: 'under_construction', message: 'Módulo Agentes en construcción.' });
});
