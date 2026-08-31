// Carga y valida las variables de entorno UNA sola vez, al arrancar el proceso.
// Si falta algo requerido, el servidor no levanta — preferimos fallar acá, fuerte
// y explícito, a que una ruta falle en producción por un secreto vacío.

import 'dotenv/config';
import { z } from 'zod';

const boolFromEnvString = (val) => val === 'true' || val === '1';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_PATH: z.string().min(1, 'DATABASE_PATH es obligatorio'),
  UPLOADS_DIR: z.string().min(1, 'UPLOADS_DIR es obligatorio'),

  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN es obligatorio'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET debe tener al menos 32 caracteres'),
  LOGIN_CHALLENGE_SECRET: z.string().min(32, 'LOGIN_CHALLENGE_SECRET debe tener al menos 32 caracteres'),
  PDF_SHARE_TOKEN_SECRET: z.string().min(32, 'PDF_SHARE_TOKEN_SECRET debe tener al menos 32 caracteres'),

  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  PDF_SHARE_TTL_MINUTES: z.coerce.number().int().positive().default(60),

  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_LOGIN_WINDOW_MIN: z.coerce.number().int().positive().default(15),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Configuración inválida — revisá tu .env contra server/env.example:');
    for (const issue of parsed.error.issues) {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
