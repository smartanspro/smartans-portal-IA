// Único cliente HTTP de todo el frontend — reemplaza los dos helpers casi
// idénticos que tenía el portal viejo (apiRequest/usersRequest). Maneja:
//  - cookies de sesión (credentials:'include')
//  - el token CSRF (se pide una vez y se reenvía en cada verbo mutante)
//  - el refresh automático y transparente cuando el access token expira

let csrfToken = null;

async function fetchCsrfToken() {
  const resp = await fetch('/api/csrf-token', { credentials: 'include' });
  const data = await resp.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

async function refreshSession() {
  const resp = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrfToken || (await fetchCsrfToken()) },
  });
  return resp.ok;
}

async function rawRequest(path, { method = 'GET', body, isFormData = false } = {}) {
  if (!csrfToken) await fetchCsrfToken();

  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken;

  return fetch(path, {
    method,
    credentials: 'include',
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });
}

/** Request autenticado genérico. Si el access token expiró (401
 *  TOKEN_EXPIRED), intenta refrescar UNA vez y reintenta — transparente
 *  para quien llama, nunca hace falta pensar en esto fuera de acá. */
export async function apiFetch(path, options = {}) {
  let resp = await rawRequest(path, options);

  if (resp.status === 401) {
    const body = await resp.clone().json().catch(() => ({}));
    if (body?.error?.code === 'TOKEN_EXPIRED') {
      const refreshed = await refreshSession();
      if (refreshed) resp = await rawRequest(path, options);
    }
  }

  // El token CSRF puede haber quedado desalineado (ej. primera carga sin
  // cookie todavía) — si el server lo rechaza, pedimos uno nuevo y reintentamos
  // una sola vez, para no dejar al usuario colgado por un detalle de plumbing.
  if (resp.status === 403) {
    const body = await resp.clone().json().catch(() => ({}));
    if (body?.error?.code === 'EBADCSRFTOKEN') {
      await fetchCsrfToken();
      resp = await rawRequest(path, options);
    }
  }

  return resp;
}

async function unwrap(resp) {
  if (resp.status === 204) return null;
  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    const err = new Error(data?.error?.message || `Error ${resp.status}`);
    err.code = data?.error?.code;
    err.status = resp.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => apiFetch(path).then(unwrap),
  post: (path, body) => apiFetch(path, { method: 'POST', body }).then(unwrap),
  put: (path, body) => apiFetch(path, { method: 'PUT', body }).then(unwrap),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body }).then(unwrap),
  delete: (path) => apiFetch(path, { method: 'DELETE' }).then(unwrap),
  postForm: (path, formData) => apiFetch(path, { method: 'POST', body: formData, isFormData: true }).then(unwrap),
};

export { fetchCsrfToken };
