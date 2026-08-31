import argon2 from 'argon2';
import { AppError } from '../../middleware/errorHandler.js';
import * as repo from './users.repository.js';

export function listUsers(req, res) {
  res.json({ users: repo.listUsers() });
}

export async function createUser(req, res, next) {
  try {
    const { username, password, role, modules } = req.body;
    if (repo.usernameExists(username)) {
      throw new AppError(409, 'USERNAME_TAKEN', 'Ese usuario ya existe.');
    }
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const id = repo.createUser({ username, passwordHash, role, modules });
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const existing = repo.findUserById(id);
    if (!existing) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado.');

    const { password, role, active, modules } = req.body;
    const passwordHash = password ? await argon2.hash(password, { type: argon2.argon2id }) : undefined;
    repo.updateUser(id, { passwordHash, role, active, modules });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const existing = repo.findUserById(id);
    if (!existing) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado.');
    if (Number(id) === req.user.id) {
      throw new AppError(400, 'CANNOT_DELETE_SELF', 'No podés eliminar el usuario con el que estás logueado.');
    }
    repo.deleteUser(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
