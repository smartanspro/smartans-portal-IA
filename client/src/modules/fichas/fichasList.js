import { esc } from '../../lib/format.js';
import { fichasApi } from './fichasApi.js';
import { showToast } from '../../lib/toast.js';
import { confirmDialog } from '../../components/confirmDialog.js';
import { mountCreditoEditor } from './credito.js';
import { mountCanjeEditor } from './canje.js';

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export async function mountFichasList(viewContainer, { onOpenEditor }) {
  viewContainer.innerHTML = `
    <div class="page-head">
      <div><h1>Fichas de Inversión</h1><p>Generá y descargá en PDF las fichas de oportunidad para inversores.</p></div>
      <button class="btn btn-primary" id="btnNueva" type="button">+ Nueva ficha</button>
    </div>
    <div class="modal-overlay" id="modalNueva">
      <div class="modal">
        <h2>¿Qué tipo de ficha querés crear?</h2>
        <div class="modal-options">
          <button class="modal-opt" type="button" id="optCanje"><h3>Canje de tierra por m²</h3><p>El inversor financia la compra del terreno y lo canjea por m² construidos.</p></button>
          <button class="modal-opt" type="button" id="optCredito"><h3>Crédito con garantía</h3><p>Préstamo privado a tasa fija con inmuebles en garantía.</p></button>
        </div>
        <div class="modal-foot"><button class="btn" type="button" id="btnCancelModal">Cancelar</button></div>
      </div>
    </div>
    <div class="panel">
      <div class="table-toolbar"><div class="search"><input type="text" id="searchInput" placeholder="Buscar ficha por nombre..." /></div></div>
      <table class="fichas"><thead><tr><th>Nombre</th><th>Tipo</th><th>Última modificación</th><th></th></tr></thead><tbody id="fichasBody"></tbody></table>
      <div class="empty-state" id="emptyState" style="display:none;">Todavía no hay fichas. Creá la primera con "Nueva ficha".</div>
    </div>`;

  let fichas = [];

  async function reload() {
    fichas = await fichasApi.list();
    render();
  }

  function render() {
    const q = viewContainer.querySelector('#searchInput').value.toLowerCase();
    const rows = fichas.filter((f) => f.nombre.toLowerCase().includes(q)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    viewContainer.querySelector('#emptyState').style.display = rows.length ? 'none' : 'block';
    viewContainer.querySelector('#fichasBody').innerHTML = rows
      .map(
        (f) => `<tr>
          <td><span class="row-name">${esc(f.nombre)}</span></td>
          <td><span class="tag ${f.tipo === 'canje' ? 'canje' : 'credito'}">${f.tipo === 'canje' ? 'Canje de tierra' : 'Crédito con garantía'}</span></td>
          <td>${fmtDate(f.updatedAt)}</td>
          <td><div class="row-actions">
            <button class="icon-btn" data-action="edit" data-id="${f.id}" title="Editar">✎</button>
            <button class="icon-btn danger" data-action="del" data-id="${f.id}" title="Eliminar">✕</button>
          </div></td>
        </tr>`
      )
      .join('');
  }

  viewContainer.querySelector('#searchInput').addEventListener('input', render);
  viewContainer.querySelector('#btnNueva').addEventListener('click', () => viewContainer.querySelector('#modalNueva').classList.add('show'));
  viewContainer.querySelector('#btnCancelModal').addEventListener('click', () => viewContainer.querySelector('#modalNueva').classList.remove('show'));
  viewContainer.querySelector('#optCanje').addEventListener('click', () => {
    viewContainer.querySelector('#modalNueva').classList.remove('show');
    onOpenEditor({ tipo: 'canje', ficha: null });
  });
  viewContainer.querySelector('#optCredito').addEventListener('click', () => {
    viewContainer.querySelector('#modalNueva').classList.remove('show');
    onOpenEditor({ tipo: 'credito', ficha: null });
  });

  viewContainer.querySelector('#fichasBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const ficha = fichas.find((f) => f.id === btn.dataset.id);
    if (!ficha) return;

    if (btn.dataset.action === 'edit') {
      onOpenEditor({ tipo: ficha.tipo, ficha });
    } else if (btn.dataset.action === 'del') {
      const ok = await confirmDialog({ title: 'Eliminar ficha', message: `¿Eliminar "${ficha.nombre}"? Esta acción no se puede deshacer.`, acceptLabel: 'Eliminar' });
      if (!ok) return;
      await fichasApi.remove(ficha.id);
      showToast('Ficha eliminada.');
      reload();
    }
  });

  await reload();
}

export function mountFichaEditor(viewContainer, { tipo, ficha }, onSaved) {
  if (tipo === 'canje') mountCanjeEditor(viewContainer, ficha, onSaved);
  else mountCreditoEditor(viewContainer, ficha, onSaved);
}
