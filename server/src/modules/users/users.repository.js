import { db, runInTransaction } from '../../db/connection.js';

const listUsersStmt = db.prepare(`SELECT id, username, role, active, created_at FROM users ORDER BY username`);
const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const findByUsernameStmt = db.prepare('SELECT id FROM users WHERE username = ?');

const insertUserStmt = db.prepare(`
  INSERT INTO users (username, password_hash, password_algo, role, active)
  VALUES (?, ?, 'argon2id', ?, 1)
`);

const updatePasswordStmt = db.prepare(`
  UPDATE users SET password_hash = ?, password_algo = 'argon2id', legacy_password_hash = NULL, legacy_password_salt = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
`);
const updateRoleStmt = db.prepare(`UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
const updateActiveStmt = db.prepare(`UPDATE users SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
const deleteUserStmt = db.prepare('DELETE FROM users WHERE id = ?');

const moduleIdByCodeStmt = db.prepare('SELECT id FROM modules WHERE code = ?');
const clearUserModulesStmt = db.prepare('DELETE FROM user_modules WHERE user_id = ?');
const insertUserModuleStmt = db.prepare('INSERT OR IGNORE INTO user_modules (user_id, module_id) VALUES (?, ?)');
const listUserModuleCodesStmt = db.prepare(`
  SELECT m.code FROM user_modules um JOIN modules m ON m.id = um.module_id WHERE um.user_id = ? ORDER BY m.code
`);

export function listUsers() {
  const users = listUsersStmt.all();
  return users.map((u) => ({ ...u, active: !!u.active, modules: listUserModuleCodesStmt.all(u.id).map((m) => m.code) }));
}

export function findUserById(id) {
  return findByIdStmt.get(id);
}

export function usernameExists(username) {
  return !!findByUsernameStmt.get(username);
}

/** Reemplaza por completo el set de módulos asignados — más simple y menos
 *  propenso a bugs que calcular un diff, y el volumen (≤5 módulos) lo hace gratis. */
function setUserModules(userId, moduleCodes) {
  clearUserModulesStmt.run(userId);
  for (const code of moduleCodes) {
    const mod = moduleIdByCodeStmt.get(code);
    if (mod) insertUserModuleStmt.run(userId, mod.id);
  }
}

export function createUser({ username, passwordHash, role, modules }) {
  const info = insertUserStmt.run(username, passwordHash, role);
  setUserModules(info.lastInsertRowid, modules);
  return info.lastInsertRowid;
}

export function updateUser(id, { passwordHash, role, active, modules }) {
  runInTransaction(() => {
    if (passwordHash) updatePasswordStmt.run(passwordHash, id);
    if (role) updateRoleStmt.run(role, id);
    if (active !== undefined) updateActiveStmt.run(active ? 1 : 0, id);
    if (modules) setUserModules(id, modules);
  });
}

export function deleteUser(id) {
  deleteUserStmt.run(id);
}
