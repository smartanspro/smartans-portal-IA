import { api } from '../api/http.js';
import { esc } from '../lib/format.js';
import { showToast } from '../lib/toast.js';

function fmtAgo(ts) {
  if (!ts) return 'nunca';
  const s = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m}min`;
  return `hace ${Math.round(m / 60)}h`;
}

export async function mountMonitoreo(viewContainer) {
  viewContainer.innerHTML = `
    <div class="page-head"><div><h1>Monitoreo</h1><p>Chequeo HTTP automático cada 30s, corrido por el servidor (no depende de que tengas la pestaña abierta).</p></div></div>
    <div class="panel" style="padding:16px 18px;margin-bottom:16px;">
      <div class="row2" style="align-items:end;">
        <div class="field" style="margin-bottom:0;"><label>Nombre del servicio</label><input type="text" id="monName" placeholder="Ej: API Facturación" /></div>
        <div class="field" style="margin-bottom:0;"><label>URL a chequear</label><input type="text" id="monUrl" placeholder="https://api.miservicio.com/health" /></div>
      </div>
      <button class="btn btn-primary" type="button" id="monAdd" style="margin-top:12px;">+ Agregar servicio</button>
    </div>
    <div class="panel">
      <div class="table-toolbar"><span style="font-size:12.5px;color:var(--erp-muted);">Chequeo automático cada 30s (server-side).</span><button class="btn btn-small" type="button" id="monRefresh">↻ Refrescar</button></div>
      <table class="fichas"><thead><tr><th>Servicio</th><th>Estado</th><th>Latencia</th><th>Última verificación</th><th></th></tr></thead><tbody id="monBody"></tbody></table>
      <div class="empty-state" id="monEmpty" style="display:none;">Todavía no agregaste ningún servicio.</div>
    </div>`;

  async function reload() {
    const { services } = await api.get('/api/monitoreo');
    viewContainer.querySelector('#monEmpty').style.display = services.length ? 'none' : 'block';
    viewContainer.querySelector('#monBody').innerHTML = services
      .map((s) => {
        const dotClass = s.status === 'up' ? 'g' : s.status === 'down' ? 'r' : 'y';
        const label = s.status === 'up' ? 'Arriba' : s.status === 'down' ? 'Caído' : 'Sin verificar';
        return `<tr>
          <td><span class="row-name">${esc(s.name)}</span><br><span style="font-size:11px;color:var(--erp-muted);">${esc(s.url)}</span></td>
          <td><span class="dot ${dotClass}"></span>${label}</td>
          <td>${s.lastLatencyMs != null ? s.lastLatencyMs + ' ms' : '—'}</td>
          <td>${fmtAgo(s.lastCheck)}</td>
          <td><div class="row-actions"><button class="icon-btn" data-action="check" data-id="${s.id}">↻</button><button class="icon-btn danger" data-action="del" data-id="${s.id}">✕</button></div></td>
        </tr>`;
      })
      .join('');
  }

  viewContainer.querySelector('#monAdd').addEventListener('click', async () => {
    const name = viewContainer.querySelector('#monName').value.trim();
    const url = viewContainer.querySelector('#monUrl').value.trim();
    if (!name || !url) return;
    await api.post('/api/monitoreo', { name, url });
    viewContainer.querySelector('#monName').value = '';
    viewContainer.querySelector('#monUrl').value = '';
    showToast('Servicio agregado.');
    reload();
  });

  viewContainer.querySelector('#monRefresh').addEventListener('click', reload);

  viewContainer.querySelector('#monBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'check') {
      await api.post(`/api/monitoreo/${btn.dataset.id}/check`);
      reload();
    } else if (btn.dataset.action === 'del') {
      await api.delete(`/api/monitoreo/${btn.dataset.id}`);
      showToast('Servicio eliminado.');
      reload();
    }
  });

  await reload();
  setInterval(reload, 15000); // solo refresca la VISTA — el chequeo real corre en el server
}
