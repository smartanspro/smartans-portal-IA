import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../lib/logger.js';
import * as repo from './notifications.repository.js';

/** Nunca devuelve los secretos crudos al cliente — solo si están
 *  configurados o no. Cierra el hueco viejo (token de Telegram visible en
 *  el Network tab de cualquier usuario logueado). */
export function getMaskedConfig() {
  const c = repo.getConfig();
  return {
    slackWebhook: c.slack_webhook_url ? 'configured' : null,
    telegramBotToken: c.telegram_bot_token ? 'configured' : null,
    telegramChatId: c.telegram_chat_id || null, // el chat id no es secreto, se muestra tal cual
    emailTo: c.email_to || null,
  };
}

export function updateConfig(patch, userId) {
  repo.updateConfig(patch, userId);
  return getMaskedConfig();
}

export async function sendSlackTest(message) {
  const c = repo.getConfig();
  if (!c.slack_webhook_url) throw new AppError(400, 'SLACK_NOT_CONFIGURED', 'No hay un webhook de Slack configurado.');

  const resp = await fetch(c.slack_webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
  if (!resp.ok) throw new AppError(502, 'SLACK_SEND_FAILED', `Slack respondió ${resp.status}.`);
}

export async function sendTelegramTest(message) {
  const c = repo.getConfig();
  if (!c.telegram_bot_token || !c.telegram_chat_id) {
    throw new AppError(400, 'TELEGRAM_NOT_CONFIGURED', 'Falta el bot token o el chat ID de Telegram.');
  }

  const resp = await fetch(`https://api.telegram.org/bot${c.telegram_bot_token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: c.telegram_chat_id, text: message }),
  });
  const data = await resp.json();
  if (!data.ok) throw new AppError(502, 'TELEGRAM_SEND_FAILED', data.description || 'Telegram rechazó el envío.');
}

/** Dispara la alerta a todos los canales configurados — usado por Monitoreo.
 *  Nunca tira: cada canal falla en silencio (solo se loguea) si no está
 *  configurado o da error, igual criterio que tenía el portal viejo. */
export async function notifyAllChannels(message) {
  const c = repo.getConfig();
  if (c.slack_webhook_url) {
    sendSlackTest(message).catch((err) => logger.warn({ err }, 'Fallo notificando por Slack'));
  }
  if (c.telegram_bot_token && c.telegram_chat_id) {
    sendTelegramTest(message).catch((err) => logger.warn({ err }, 'Fallo notificando por Telegram'));
  }
}
