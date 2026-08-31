import * as fichasService from './fichas.service.js';

export function listFichas(req, res) {
  res.json({ fichas: fichasService.listFichas() });
}

export function getFicha(req, res, next) {
  try {
    res.json(fichasService.getFicha(req.params.id));
  } catch (err) {
    next(err);
  }
}

export function createFicha(req, res, next) {
  try {
    const ficha = fichasService.createFicha(req.body, req.user.id);
    res.status(201).json(ficha);
  } catch (err) {
    next(err);
  }
}

export function updateFicha(req, res, next) {
  try {
    const ficha = fichasService.updateFicha(req.params.id, req.body, req.user.id);
    res.json(ficha);
  } catch (err) {
    next(err);
  }
}

export function deleteFicha(req, res, next) {
  try {
    fichasService.deleteFicha(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
