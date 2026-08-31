import './styles/main.css';
import { mountLogin, tryResumeSession, getCurrentUser } from './modules/auth.js';
import { mountShell } from './modules/shell.js';
import { mountFichasList, mountFichaEditor } from './modules/fichas/fichasList.js';
import { mountUsuarios } from './modules/users.js';
import { mountNotificaciones } from './modules/notifications.js';
import { mountMonitoreo } from './modules/monitoring.js';
import { mountPlaceholder } from './modules/placeholder.js';

const root = document.getElementById('app');

function renderView(shell, view, extra) {
  const el = shell.getViewContainer();
  if (view === 'fichas-list') {
    mountFichasList(el, { onOpenEditor: ({ tipo, ficha }) => shell.navigateTo('ficha-editor', { tipo, ficha }) });
  } else if (view === 'ficha-editor') {
    mountFichaEditor(el, extra, () => {});
  } else if (view === 'usuarios') {
    mountUsuarios(el);
  } else if (view === 'notificaciones') {
    mountNotificaciones(el);
  } else if (view === 'monitoreo') {
    mountMonitoreo(el);
  } else if (view === 'rpa') {
    mountPlaceholder(el, { title: 'RPA', message: 'Automatizaciones livianas (triggers) — en construcción.' });
  } else if (view === 'agentes') {
    mountPlaceholder(el, { title: 'Agentes', message: 'Agentes automatizados (IA) — en construcción.' });
  }
}

function startApp() {
  const shell = mountShell(root, {
    onNavigateView: (view, extra) => renderView(shell, view, extra),
  });
  shell.navigateTo('fichas-list');
}

async function boot() {
  const user = await tryResumeSession();
  if (user) {
    startApp();
    return;
  }
  mountLogin(root, () => startApp());
}

boot();
