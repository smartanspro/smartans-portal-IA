import { db } from '../../db/connection.js';

const getConfigStmt = db.prepare('SELECT * FROM notif_config WHERE id = 1');
const updateConfigStmt = db.prepare(`
  UPDATE notif_config
  SET slack_webhook_url = COALESCE(?, slack_webhook_url),
      telegram_bot_token = COALESCE(?, telegram_bot_token),
      telegram_chat_id = COALESCE(?, telegram_chat_id),
      email_to = COALESCE(?, email_to),
      updated_by = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = 1
`);

export function getConfig() {
  return getConfigStmt.get();
}

// '' (string vacío) borra el valor a propósito; undefined/null = "no tocar"
// (por eso el UPDATE usa COALESCE contra null, y acá convertimos '' -> null
// solo para los campos que sí vinieron en el body).
export function updateConfig(patch, userId) {
  const norm = (v) => (v === undefined ? null : v);
  updateConfigStmt.run(norm(patch.slackWebhookUrl), norm(patch.telegramBotToken), norm(patch.telegramChatId), norm(patch.emailTo), userId);
}
