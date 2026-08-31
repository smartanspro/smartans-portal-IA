import { api } from '../api/http.js';
import { showToast } from '../lib/toast.js';

export async function mountNotificaciones(viewContainer) {
  viewContainer.innerHTML = `
    <div class="page-head"><div><h1>Notificaciones</h1><p>Configurá los canales por donde recibís avisos del portal.</p></div></div>
    <div class="notif-grid">
      <div class="panel notif-card">
        <div class="notif-card-head"><h3>Slack</h3></div>
        <div class="field"><label>Webhook URL</label><input type="text" id="slackWebhook" placeholder="https://hooks.slack.com/services/..." /></div>
        <div class="field"><label>Mensaje de prueba</label><textarea id="slackMsg">Prueba desde el Portal de Operaciones ✅</textarea></div>
        <button class="btn btn-primary" type="button" id="slackTest">Guardar y enviar prueba</button>
        <div class="notif-status" id="slackStatus"></div>
      </div>
      <div class="panel notif-card">
        <div class="notif-card-head"><h3>Telegram</h3></div>
        <div class="field"><label>Bot Token</label><input type="text" id="tgToken" /></div>
        <div class="field"><label>Chat ID</label><input type="text" id="tgChat" /></div>
        <div class="field"><label>Mensaje de prueba</label><textarea id="tgMsg">Prueba desde el Portal de Operaciones ✅</textarea></div>
        <button class="btn btn-primary" type="button" id="tgTest">Guardar y enviar prueba</button>
        <div class="notif-status" id="tgStatus"></div>
      </div>
      <div class="panel notif-card">
        <div class="notif-card-head"><h3>Email</h3></div>
        <div class="field"><label>Email destino</label><input type="text" id="emailTo" /></div>
        <div class="hint">Se abre tu cliente de correo con todo precargado — no se envía automático.</div>
      </div>
    </div>`;

  function setStatus(id, msg, kind) {
    const el = viewContainer.querySelector(id);
    el.textContent = msg;
    el.className = 'notif-status' + (kind ? ' ' + kind : '');
  }

  const { config } = await api.get('/api/notificaciones/config');
  viewContainer.querySelector('#tgChat').value = config.telegramChatId || '';
  viewContainer.querySelector('#emailTo').value = config.emailTo || '';
  if (config.slackWebhook) viewContainer.querySelector('#slackWebhook').placeholder = '(ya configurado — dejalo vacío para no cambiarlo)';
  if (config.telegramBotToken) viewContainer.querySelector('#tgToken').placeholder = '(ya configurado — dejalo vacío para no cambiarlo)';

  viewContainer.querySelector('#slackTest').addEventListener('click', async () => {
    setStatus('#slackStatus', 'Enviando...', null);
    try {
      const slackWebhookUrl = viewContainer.querySelector('#slackWebhook').value.trim();
      if (slackWebhookUrl) await api.put('/api/notificaciones/config', { slackWebhookUrl });
      await api.post('/api/notificaciones/test/slack', { message: viewContainer.querySelector('#slackMsg').value });
      setStatus('#slackStatus', 'Mensaje enviado ✓', 'ok');
    } catch (err) {
      setStatus('#slackStatus', 'Error: ' + err.message, 'err');
    }
  });

  viewContainer.querySelector('#tgTest').addEventListener('click', async () => {
    setStatus('#tgStatus', 'Enviando...', null);
    try {
      const patch = { telegramChatId: viewContainer.querySelector('#tgChat').value.trim() };
      const token = viewContainer.querySelector('#tgToken').value.trim();
      if (token) patch.telegramBotToken = token;
      await api.put('/api/notificaciones/config', patch);
      await api.post('/api/notificaciones/test/telegram', { message: viewContainer.querySelector('#tgMsg').value });
      setStatus('#tgStatus', 'Mensaje enviado ✓', 'ok');
    } catch (err) {
      setStatus('#tgStatus', 'Error: ' + err.message, 'err');
    }
  });

  viewContainer.querySelector('#emailTo').addEventListener('change', async (e) => {
    await api.put('/api/notificaciones/config', { emailTo: e.target.value.trim() });
    showToast('Email guardado.');
  });
}
