import { api } from '../api/http.js';
import { esc } from '../lib/format.js';
import { showToast } from '../lib/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';

const MODULES = [
  ['fichas', 'Fichas de Inversión'],
  ['rpa', 'RPA'],
  ['agentes', 'Agentes'],
  ['monitoreo', 'Monitoreo'],
  ['notificaciones', 'Notificaciones'],
];

export async function mountUsuarios(viewContainer) {
  viewContainer.innerHTML = `
    <div class="page-head"><div><h1>Usuarios y Roles</h1><p>Alta, baja y modificación de quién puede entrar al portal.</p></div>
      <button class="btn btn-primary" id="btnNuevoUsuario" type="button">+ Nuevo usuario</button></div>
    <div class="panel"><table class="fichas"><thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody id="usuariosBody"></tbody></table></div>
    <div class="modal-overlay" id="modalUsuario">
      <div class="modal" style="width:420px;">
        <h2 id="modalTitle">Nuevo usuario</h2>
        <div class="login-error" id="formError"></div>
        <div class="field"><label>Usuario</label><input type="text" id="fUsuario" /></div>
        <div class="field"><label>Contraseña</label><input type="password" id="fPassword" /><div class="hint">Mínimo 10 caracteres. Dejar vacío al editar = no cambiarla.</div></div>
        <div class="field"><label>Rol</label>
          <select id="fRol" style="width:100%;border:1px solid var(--erp-border);background:var(--erp-bg);border-radius:8px;padding:8px;">
            <option value="usuario">Usuario</option><option value="admin">Administrador</option>
          </select>
        </div>
        <div class="field" id="fActivoWrap" style="display:none;"><label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="fActivo" style="width:auto;" checked /> Habilitado</label></div>
        <div class="field"><label>Módulos visibles</label>
          <div style="display:flex;flex-direction:column;gap:6px;border:1px solid var(--erp-border);border-radius:8px;padding:10px;">
            ${MODULES.map(([code, label]) => `<label style="display:flex;gap:8px;align-items:center;font-size:13px;"><input type="checkbox" class="fModulo" value="${code}" style="width:auto;" checked /> ${label}</label>`).join('')}
          </div>
        </div>
        <div class="modal-foot"><button class="btn" type="button" id="btnCancel">Cancelar</button><button class="btn btn-primary" type="button" id="btnGuardar" style="margin-left:8px;">Guardar</button></div>
      </div>
    </div>`;

  let editingId = null;

  async function reload() {
    const { users } = await api.get('/api/usuarios');
    viewContainer.querySelector('#usuariosBody').innerHTML = users
      .map(
        (u) => `<tr>
          <td><span class="dot ${u.active ? 'g' : 'r'}"></span><span class="row-name">${esc(u.username)}</span></td>
          <td>${u.role === 'admin' ? '<span class="tag credito">Administrador</span>' : '<span class="tag canje">Usuario</span>'}</td>
          <td>${u.active ? 'Habilitado' : 'Deshabilitado'}</td>
          <td><div class="row-actions"><button class="icon-btn" data-action="edit" data-id="${u.id}">✎</button><button class="icon-btn danger" data-action="del" data-id="${u.id}">✕</button></div></td>
        </tr>`
      )
      .join('');
    return users;
  }

  function openModal(user) {
    editingId = user?.id ?? null;
    viewContainer.querySelector('#modalTitle').textContent = user ? `Editar "${user.username}"` : 'Nuevo usuario';
    viewContainer.querySelector('#formError').classList.remove('show');
    viewContainer.querySelector('#fUsuario').value = user?.username || '';
    viewContainer.querySelector('#fUsuario').disabled = !!user;
    viewContainer.querySelector('#fPassword').value = '';
    viewContainer.querySelector('#fRol').value = user?.role || 'usuario';
    viewContainer.querySelector('#fActivoWrap').style.display = user ? '' : 'none';
    viewContainer.querySelector('#fActivo').checked = user?.active ?? true;
    const modules = user?.modules || MODULES.map(([c]) => c);
    viewContainer.querySelectorAll('.fModulo').forEach((cb) => (cb.checked = modules.includes(cb.value)));
    viewContainer.querySelector('#modalUsuario').classList.add('show');
  }

  viewContainer.querySelector('#btnNuevoUsuario').addEventListener('click', () => openModal(null));
  viewContainer.querySelector('#btnCancel').addEventListener('click', () => viewContainer.querySelector('#modalUsuario').classList.remove('show'));

  viewContainer.querySelector('#btnGuardar').addEventListener('click', async () => {
    const username = viewContainer.querySelector('#fUsuario').value.trim();
    const password = viewContainer.querySelector('#fPassword').value;
    const role = viewContainer.querySelector('#fRol').value;
    const active = viewContainer.querySelector('#fActivo').checked;
    const modules = [...viewContainer.querySelectorAll('.fModulo:checked')].map((cb) => cb.value);
    const errEl = viewContainer.querySelector('#formError');
    errEl.classList.remove('show');

    try {
      if (editingId) {
        const patch = { role, modules, active };
        if (password) patch.password = password;
        await api.patch(`/api/usuarios/${editingId}`, patch);
        showToast('Usuario actualizado.');
      } else {
        if (!password || password.length < 10) throw new Error('La contraseña debe tener al menos 10 caracteres.');
        await api.post('/api/usuarios', { username, password, role, modules });
        showToast('Usuario creado.');
      }
      viewContainer.querySelector('#modalUsuario').classList.remove('show');
      await reload();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.add('show');
    }
  });

  viewContainer.querySelector('#usuariosBody').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const users = await reload();
    const user = users.find((u) => String(u.id) === btn.dataset.id);
    if (btn.dataset.action === 'edit') {
      openModal(user);
    } else if (btn.dataset.action === 'del') {
      const ok = await confirmDialog({ title: 'Eliminar usuario', message: `¿Eliminar a "${user.username}"?`, acceptLabel: 'Eliminar' });
      if (!ok) return;
      await api.delete(`/api/usuarios/${user.id}`);
      showToast('Usuario eliminado.');
      reload();
    }
  });

  await reload();
}
