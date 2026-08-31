import pino from 'pino';
import { env, isProd } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  // En desarrollo, salida legible; en producción, JSON plano (lo que espera
  // cualquier plataforma de logs de un PaaS).
  transport: isProd
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
});
