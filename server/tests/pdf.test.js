import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, createTestUser, loginAgent, getCsrfToken } from './helpers.js';

describe('subida de PDF de una ficha', () => {
  let agent;
  let csrfToken;
  let fichaId;

  beforeAll(async () => {
    await createTestUser({ username: 'pdf-user', password: 'contraseña-fuerte-7', modules: ['fichas'] });
    const login = await loginAgent('pdf-user', 'contraseña-fuerte-7');
    agent = login.agent;
    csrfToken = login.csrfToken;

    const createResp = await agent
      .post('/api/fichas')
      .set('X-CSRF-Token', csrfToken)
      .send({ tipo: 'credito', nombre: 'Ficha para PDF', data: {} });
    fichaId = createResp.body.id;
  });

  it('rechaza la subida sin sesión — 401 (a diferencia del backend viejo, que no pedía nada)', async () => {
    // agent nuevo, SIN cookies de sesión — pero con un token CSRF válido, para
    // aislar específicamente lo que este test verifica (falta de auth, no CSRF).
    const anon = request.agent(app);
    const anonCsrfToken = await getCsrfToken(anon);
    const resp = await anon
      .post(`/api/fichas/${fichaId}/pdf`)
      .set('X-CSRF-Token', anonCsrfToken)
      .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'ficha.pdf', contentType: 'application/pdf' });
    expect(resp.status).toBe(401);
  });

  it('rechaza un archivo que no es un PDF real (magic bytes), aunque declare el mimetype correcto', async () => {
    const resp = await agent
      .post(`/api/fichas/${fichaId}/pdf`)
      .set('X-CSRF-Token', csrfToken)
      .attach('file', Buffer.from('esto no es un PDF, es texto plano'), {
        filename: 'ficha.pdf',
        contentType: 'application/pdf',
      });
    expect(resp.status).toBe(400);
    expect(resp.body.error.code).toBe('INVALID_FILE');
  });
});
