import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, createTestUser, loginAgent, getCsrfToken } from './helpers.js';

describe('auth', () => {
  beforeAll(async () => {
    await createTestUser({ username: 'ana', password: 'contraseña-fuerte-1', role: 'usuario', modules: ['fichas'] });
    await createTestUser({ username: 'deshabilitado', password: 'contraseña-fuerte-2', role: 'usuario', active: false });
  });

  it('loguea con usuario y contraseña correctos, y setea las cookies de sesión', async () => {
    const { loginResp } = await loginAgent('ana', 'contraseña-fuerte-1');

    expect(loginResp.status).toBe(200);
    expect(loginResp.body.user.username).toBe('ana');
    expect(loginResp.body.user.modules).toEqual(['fichas']);

    const setCookie = loginResp.headers['set-cookie'].join(';');
    expect(setCookie).toContain('sp_access=');
    expect(setCookie).toContain('sp_refresh=');
  });

  it('rechaza con contraseña incorrecta, con mensaje genérico', async () => {
    const { loginResp } = await loginAgent('ana', 'password-equivocada');
    expect(loginResp.status).toBe(401);
    expect(loginResp.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rechaza a un usuario deshabilitado aunque la contraseña sea correcta', async () => {
    const { loginResp } = await loginAgent('deshabilitado', 'contraseña-fuerte-2');
    expect(loginResp.status).toBe(403);
    expect(loginResp.body.error.code).toBe('USER_DISABLED');
  });

  it('rechaza un captchaToken inventado (con csrf token real)', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);

    const resp = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ username: 'ana', password: 'contraseña-fuerte-1', captchaToken: 'token-trucho', captchaAnswer: 7 });

    expect(resp.status).toBe(400);
    expect(resp.body.error.code).toBe('INVALID_CAPTCHA');
  });

  it('rechaza un login sin token CSRF', async () => {
    const resp = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ana', password: 'contraseña-fuerte-1', captchaToken: 'x', captchaAnswer: 1 });
    expect(resp.status).toBe(403); // csrf-csrf responde 403 ante un token faltante/inválido
  });

  it('bloquea con 429 después de demasiados intentos fallidos', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);

    let lastStatus;
    for (let i = 0; i < 6; i++) {
      const captchaResp = await agent.get('/api/auth/captcha');
      const match = /(\d+)\s*\+\s*(\d+)/.exec(captchaResp.body.question);
      const answer = Number(match[1]) + Number(match[2]);
      const resp = await agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', csrfToken)
        .send({
          username: 'rate-limit-test-user',
          password: 'lo-que-sea',
          captchaToken: captchaResp.body.captchaToken,
          captchaAnswer: answer,
        });
      lastStatus = resp.status;
    }

    expect(lastStatus).toBe(429);
  });
});
