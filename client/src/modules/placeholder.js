export function mountPlaceholder(viewContainer, { title, message }) {
  viewContainer.innerHTML = `
    <div class="module-placeholder">
      <h1>${title}</h1>
      <p>${message}</p>
      <span class="badge-soon">Módulo en construcción</span>
    </div>`;
}
