import { db } from '../../db/connection.js';

const listActiveServicesStmt = db.prepare('SELECT * FROM monitor_services WHERE active = 1 ORDER BY name');
const listAllServicesStmt = db.prepare('SELECT * FROM monitor_services ORDER BY name');
const insertServiceStmt = db.prepare('INSERT INTO monitor_services (name, url) VALUES (?, ?)');
const deleteServiceStmt = db.prepare('DELETE FROM monitor_services WHERE id = ?');

const insertCheckStmt = db.prepare(`
  INSERT INTO monitor_checks (service_id, status, status_code, latency_ms) VALUES (?, ?, ?, ?)
`);
const lastCheckForServiceStmt = db.prepare(`
  SELECT * FROM monitor_checks WHERE service_id = ? ORDER BY checked_at DESC LIMIT 1
`);

export function listActiveServices() {
  return listActiveServicesStmt.all();
}

export function listAllServicesWithLastCheck() {
  return listAllServicesStmt.all().map((s) => ({ ...s, lastCheck: lastCheckForServiceStmt.get(s.id) || null }));
}

export function createService(name, url) {
  const info = insertServiceStmt.run(name, url);
  return info.lastInsertRowid;
}

export function deleteService(id) {
  deleteServiceStmt.run(id);
}

export function recordCheck(serviceId, { status, statusCode, latencyMs }) {
  insertCheckStmt.run(serviceId, status, statusCode ?? null, latencyMs ?? null);
}

export function lastCheckForService(serviceId) {
  return lastCheckForServiceStmt.get(serviceId);
}
