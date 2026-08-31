import * as service from './monitoring.service.js';

export function listServices(req, res) {
  res.json({ services: service.listServices() });
}

export async function createService(req, res, next) {
  try {
    const created = service.createService(req.body.name, req.body.url);
    res.status(201).json(created);
    // dispara el primer chequeo en background, no bloquea la respuesta
    service.checkServiceById(created.id).catch(() => {});
  } catch (err) {
    next(err);
  }
}

export function deleteService(req, res) {
  service.deleteService(req.params.id);
  res.status(204).end();
}

export async function checkNow(req, res, next) {
  try {
    const result = await service.checkServiceById(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
