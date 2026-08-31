import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { requireModule } from '../../middleware/authorize.js';

export const rpaRoutes = Router();

rpaRoutes.use(authenticate, requireModule('rpa'));

// Placeholder — protegido igual que el resto desde ya, aunque el módulo
// todavía no tenga funcionalidad real (confirmado con el usuario: acá van
// automatizaciones livianas tipo triggers, no ejecución de scripts pesados).
rpaRoutes.get('/', (req, res) => {
  res.json({ status: 'under_construction', message: 'Módulo RPA en construcción.' });
});
