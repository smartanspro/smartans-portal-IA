import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser, loginAgent } from './helpers.js';

const TINY_PNG_DATAURL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('fichas CRUD', () => {
  let agent;
  let csrfToken;

  beforeAll(async () => {
    await createTestUser({ username: 'fichas-user', password: 'contraseña-fuerte-6', modules: ['fichas'] });
    const login = await loginAgent('fichas-user', 'contraseña-fuerte-6');
    agent = login.agent;
    csrfToken = login.csrfToken;
  });

  it('crea, lista, actualiza y borra una ficha', async () => {
    const createResp = await agent
      .post('/api/fichas')
      .set('X-CSRF-Token', csrfToken)
      .send({ tipo: 'credito', nombre: 'Ficha de prueba', data: { operacion: 'Test' } });
    expect(createResp.status).toBe(201);
    const fichaId = createResp.body.id;
    expect(fichaId).toBeTypeOf('string');

    const listResp = await agent.get('/api/fichas');
    expect(listResp.body.fichas.some((f) => f.id === fichaId)).toBe(true);

    const updateResp = await agent
      .put(`/api/fichas/${fichaId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ tipo: 'credito', nombre: 'Ficha actualizada', data: { operacion: 'Test 2' } });
    expect(updateResp.status).toBe(200);
    expect(updateResp.body.nombre).toBe('Ficha actualizada');

    const deleteResp = await agent.delete(`/api/fichas/${fichaId}`).set('X-CSRF-Token', csrfToken);
    expect(deleteResp.status).toBe(204);

    const getResp = await agent.get(`/api/fichas/${fichaId}`);
    expect(getResp.status).toBe(404);
  });

  it('no reescribe la imagen a disco si el hash no cambió', async () => {
    const createResp = await agent
      .post('/api/fichas')
      .set('X-CSRF-Token', csrfToken)
      .send({ tipo: 'canje', nombre: 'Con imagen', data: {}, hero: TINY_PNG_DATAURL });
    const fichaId = createResp.body.id;
    expect(createResp.body.hero).toContain('data:image/png;base64,');

    // segundo guardado con la MISMA imagen — el hash no cambia
    const updateResp = await agent
      .put(`/api/fichas/${fichaId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ tipo: 'canje', nombre: 'Con imagen', data: {}, hero: TINY_PNG_DATAURL });

    expect(updateResp.status).toBe(200);
    expect(updateResp.body.hero).toContain('data:image/png;base64,');

    await agent.delete(`/api/fichas/${fichaId}`).set('X-CSRF-Token', csrfToken);
  });
});
