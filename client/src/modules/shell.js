import { getCurrentUser, isAdmin, hasModule, logout } from './auth.js';

const MODULE_NAV = [
  { code: 'fichas', id: 'navFichas', label: 'Fichas de Inversión', view: 'fichas-list' },
  { code: 'rpa', id: 'navRPA', label: 'RPA', view: 'rpa' },
  { code: 'agentes', id: 'navAgentes', label: 'Agentes', view: 'agentes' },
  { code: 'monitoreo', id: 'navMonitoreo', label: 'Monitoreo', view: 'monitoreo' },
  { code: 'notificaciones', id: 'navNotificaciones', label: 'Notificaciones', view: 'notificaciones' },
];

let onNavigate = null;

export function mountShell(container, { onNavigateView }) {
  onNavigate = onNavigateView;

  const navItemsHtml = MODULE_NAV.filter((m) => hasModule(m.code))
    .map((m) => `<button class="side-sub-item" type="button" data-view="${m.view}">${m.label}</button>`)
    .join('');

  container.innerHTML = `
    <div class="app-shell" id="appShell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <img src="/logo.png" class="sidebar-brand-img" alt="SMARTANS" style="filter:brightness(0) invert(1);" />
        </div>
        <nav class="sidebar-nav">
          <button class="side-item active" type="button">Operaciones</button>
          <div class="side-sub">${navItemsHtml}</div>
          ${
            isAdmin()
              ? `<button class="side-item" type="button">Administración</button>
                 <div class="side-sub"><button class="side-sub-item" type="button" data-view="usuarios">Usuarios y Roles</button></div>`
              : ''
          }
        </nav>
        <div class="sidebar-foot">
          <button class="side-item" type="button" id="btnLogout">Cerrar sesión</button>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div class="tabs"><div class="tab active" id="topbarTitle">Fichas de Inversión</div></div>
          <div class="topbar-right"><button class="btn btn-small" id="btnBack" type="button" style="display:none;">← Volver al listado</button></div>
        </header>
        <div class="content" id="viewContainer"></div>
      </div>
    </div>`;

  container.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => navigateTo(container, btn.dataset.view));
  });

  container.querySelector('#btnLogout').addEventListener('click', async () => {
    await logout();
    location.reload();
  });

  container.querySelector('#btnBack').addEventListener('click', () => navigateTo(container, 'fichas-list'));

  return { navigateTo: (view, extra) => navigateTo(container, view, extra), getViewContainer: () => container.querySelector('#viewContainer') };
}

function navigateTo(container, view, extra) {
  container.querySelectorAll('.side-sub-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  container.querySelector('#btnBack').style.display = view === 'ficha-editor' ? '' : 'none';
  onNavigate?.(view, extra);
}
