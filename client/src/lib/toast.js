let hideTimer = null;

export function showToast(message, kind) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'toast show' + (kind ? ' ' + kind : '');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => el.classList.remove('show'), 3200);
}
