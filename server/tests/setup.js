// Se ejecuta ANTES de que cualquier test importe código de la app —
// dotenv (en config/env.js) no pisa variables ya seteadas, así que esto
// gana siempre, exista o no un .env real en la máquina que corre los tests.

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.UPLOADS_DIR = './tests/tmp-uploads';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.CSRF_SECRET = 'b'.repeat(32);
process.env.LOGIN_CHALLENGE_SECRET = 'c'.repeat(32);
process.env.PDF_SHARE_TOKEN_SECRET = 'd'.repeat(32);
process.env.RATE_LIMIT_LOGIN_MAX = '5';
process.env.RATE_LIMIT_LOGIN_WINDOW_MIN = '15';
process.env.LOG_LEVEL = 'error';
