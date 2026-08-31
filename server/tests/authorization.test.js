import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, createTestUser, loginAgent } from './helpers.js';

describe('autorización por rol y módulo', () => {
  beforeAll(async () => {
    await createTestUser({ username: 'sin-fichas', password: 'contraseña-fuerte-3', modules: ['monitoreo'] });
    await createTestUser({ username: 'con-fichas', password: 'contraseña-fuerte-4', modules: ['fichas'] });
    await createTestUser({ username: 'una-admin', password: 'contraseña-fuerte-5', role: 'admin', modules: [] });
  });

  it('403 al pegarle a /api/fichas sin el módulo asignado', async () => {
    const { agent } = await loginAgent('sin-fichas', 'contraseña-fuerte-3');
    const resp = await agent.get('/api/fichas');
    expect(resp.status).toBe(403);
    expect(resp.body.error.code).toBe('MODULE_FORBIDDEN');
  });

  it('200 al pegarle a /api/fichas con el módulo asignado', async () => {
    const { agent } = await loginAgent('con-fichas', 'contraseña-fuerte-4');
    const resp = await agent.get('/api/fichas');
    expect(resp.status).toBe(200);
    expect(resp.body.fichas).toEqual([]);
  });

  it('admin entra a /api/fichas aunque no tenga módulos asignados explícitamente', async () => {
    const { agent } = await loginAgent('una-admin', 'contraseña-fuerte-5');
    const resp = await agent.get('/api/fichas');
    expect(resp.status).toBe(200);
  });

  it('un usuario no-admin no puede listar usuarios (ABM es solo-admin)', async () => {
    const { agent } = await loginAgent('con-fichas', 'contraseña-fuerte-4');
    const resp = await agent.get('/api/usuarios');
    expect(resp.status).toBe(403);
  });

  it('sin sesión, cualquier ruta protegida devuelve 401', async () => {
    const resp = await request(app).get('/api/fichas');
    expect(resp.status).toBe(401);
    expect(resp.body.error.code).toBe('NOT_AUTHENTICATED');
  });
});
