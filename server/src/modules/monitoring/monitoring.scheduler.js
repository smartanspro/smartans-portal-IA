// Cron server-side — reemplaza el `setInterval` que corría en el navegador
// del portal viejo (dependía de que alguien tuviera la pestaña abierta).
// Se arranca una sola vez desde index.js al bootear el proceso.

import cron from 'node-cron';
import { logger } from '../../lib/logger.js';
import { checkAllActiveServices } from './monitoring.service.js';

let started = false;

export function startMonitoringScheduler() {
  if (started) return;
  started = true;

  // Cada 30 segundos, igual intervalo que tenía el portal viejo.
  cron.schedule('*/30 * * * * *', () => {
    checkAllActiveServices().catch((err) => logger.error({ err }, 'Error corriendo el ciclo de monitoreo'));
  });

  logger.info('Scheduler de Monitoreo iniciado (cada 30s).');
}
