import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../lib/logger.js';
import { notifyAllChannels } from '../notifications/notifications.service.js';
import * as repo from './monitoring.repository.js';

const CHECK_TIMEOUT_MS = 8000;

export function listServices() {
  return repo.listAllServicesWithLastCheck().map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    status: s.lastCheck?.status || 'unknown',
    lastLatencyMs: s.lastCheck?.latency_ms ?? null,
    lastCheck: s.lastCheck?.checked_at ?? null,
  }));
}

export function createService(name, url) {
  const id = repo.createService(name, url);
  return { id, name, url };
}

export function deleteService(id) {
  repo.deleteService(id);
}

async function pingUrl(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  const start = Date.now();
  try {
    const resp = await fetch(url, { method: 'GET', signal: controller.signal });
    return { ok: resp.ok, statusCode: resp.status, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, statusCode: null, latencyMs: null };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Corre un chequeo real, persiste el resultado, y dispara notificación SOLO
 *  en un cambio de estado (no en cada tick) — mismo criterio que el portal
 *  viejo, pero ahora corrido desde un cron server-side, no desde el
 *  navegador de quien tenga la pestaña abierta. */
export async function checkService(service) {
  const previous = repo.lastCheckForService(service.id);
  const wasDown = previous?.status === 'down';

  const result = await pingUrl(service.url);
  const status = result.ok ? 'up' : 'down';
  repo.recordCheck(service.id, { status, statusCode: result.statusCode, latencyMs: result.latencyMs });

  if (status === 'up' && wasDown) {
    notifyAllChannels(`✅ ${service.name} volvió a responder (${service.url}).`);
  } else if (status === 'down' && !wasDown) {
    notifyAllChannels(`🔴 ${service.name} no responde (${service.url}).`);
  }

  return { status, ...result };
}

export async function checkServiceById(id) {
  const services = repo.listAllServicesWithLastCheck();
  const service = services.find((s) => s.id === id);
  if (!service) throw new AppError(404, 'SERVICE_NOT_FOUND', 'Servicio no encontrado.');
  return checkService(service);
}

export async function checkAllActiveServices() {
  const services = repo.listActiveServices();
  for (const service of services) {
    try {
      await checkService(service);
    } catch (err) {
      logger.warn({ err, service: service.name }, 'Fallo el chequeo de monitoreo');
    }
  }
}
