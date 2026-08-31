// Modal de confirmación reutilizable — requisito explícito del usuario: la
// generación/envío de un PDF (o cualquier otra acción sensible) NO arranca
// con un solo click, primero pasa por acá.

let overlay = null;

function ensureDom() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box" role="alertdialog" aria-modal="true">
      <h3 class="confirm-title"></h3>
      <p class="confirm-message"></p>
      <div class="confirm-actions">
        <button type="button" class="btn confirm-cancel">Cancelar</button>
        <button type="button" class="btn btn-primary confirm-accept">Aceptar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

/** Devuelve una Promise<boolean> — true si el usuario confirmó. */
export function confirmDialog({ title = 'Confirmar', message, acceptLabel = 'Aceptar', cancelLabel = 'Cancelar' }) {
  const el = ensureDom();
  el.querySelector('.confirm-title').textContent = title;
  el.querySelector('.confirm-message').textContent = message;
  el.querySelector('.confirm-accept').textContent = acceptLabel;
  el.querySelector('.confirm-cancel').textContent = cancelLabel;

  el.classList.add('show');

  return new Promise((resolve) => {
    function cleanup(result) {
      el.classList.remove('show');
      acceptBtn.removeEventListener('click', onAccept);
      cancelBtn.removeEventListener('click', onCancel);
      el.removeEventListener('click', onOverlayClick);
      resolve(result);
    }
    function onAccept() {
      cleanup(true);
    }
    function onCancel() {
      cleanup(false);
    }
    function onOverlayClick(e) {
      if (e.target === el) cleanup(false);
    }

    const acceptBtn = el.querySelector('.confirm-accept');
    const cancelBtn = el.querySelector('.confirm-cancel');
    acceptBtn.addEventListener('click', onAccept);
    cancelBtn.addEventListener('click', onCancel);
    el.addEventListener('click', onOverlayClick);
  });
}
