import { api, apiFetch } from '../api/http.js';

let currentUser = null;

export function getCurrentUser() {
  return currentUser;
}
export function isAdmin() {
  return currentUser?.role === 'admin';
}
export function hasModule(code) {
  return isAdmin() || !!currentUser?.modules?.includes(code);
}

async function getCaptcha() {
  const resp = await apiFetch('/api/auth/captcha');
  return resp.json();
}

/** Monta la pantalla de login en `container` y llama `onLogin(user)` al
 *  loguear con éxito. */
export function mountLogin(container, onLogin) {
  container.innerHTML = `
    <div class="login-screen" id="loginScreen">
      <div class="login-card">
        <div class="login-logo">
          <img src="/logo.png" alt="SMARTANS" style="filter:brightness(0) invert(1);" />
          <span class="m2">GROUP</span>
        </div>
        <h2>Portal de Operaciones</h2>
        <p class="sub">Ingresá con tu usuario de Smartans para continuar.</p>
        <form id="loginForm" autocomplete="off">
          <div class="login-error" id="loginError"></div>
          <div class="login-field"><label for="loginUser">Usuario</label><input type="text" id="loginUser" autocomplete="username" /></div>
          <div class="login-field"><label for="loginPass">Contraseña</label><input type="password" id="loginPass" autocomplete="current-password" /></div>
          <div class="login-field login-captcha">
            <label id="captchaLabel" for="loginCaptcha">Verificación</label>
            <input type="text" id="loginCaptcha" inputmode="numeric" autocomplete="off" placeholder="Escribí el resultado" />
          </div>
          <button class="btn btn-primary btn-login" type="submit" id="loginSubmitBtn">Ingresar</button>
        </form>
      </div>
    </div>`;

  let captchaToken = null;

  async function refreshCaptcha() {
    const { captchaToken: token, question } = await getCaptcha();
    captchaToken = token;
    container.querySelector('#captchaLabel').textContent = `Verificación: ${question}`;
    container.querySelector('#loginCaptcha').value = '';
  }

  function showError(msg) {
    const el = container.querySelector('#loginError');
    el.textContent = msg;
    el.classList.add('show');
  }

  container.querySelector('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = container.querySelector('#loginUser').value.trim();
    const password = container.querySelector('#loginPass').value;
    const captchaAnswer = container.querySelector('#loginCaptcha').value;
    const errEl = container.querySelector('#loginError');
    errEl.classList.remove('show');

    const btn = container.querySelector('#loginSubmitBtn');
    btn.disabled = true;
    try {
      const { user } = await api.post('/api/auth/login', { username, password, captchaToken, captchaAnswer });
      currentUser = user;
      onLogin(user);
    } catch (err) {
      showError(err.message || 'Usuario o contraseña incorrectos.');
      await refreshCaptcha();
    } finally {
      btn.disabled = false;
    }
  });

  refreshCaptcha();
}

export async function logout() {
  await api.post('/api/auth/logout').catch(() => {});
  currentUser = null;
}

/** Intenta recuperar la sesión al recargar la página (el refresh token
 *  sigue vivo en su cookie httpOnly aunque el access token ya haya expirado). */
export async function tryResumeSession() {
  try {
    const resp = await apiFetch('/api/auth/refresh', { method: 'POST' });
    if (!resp.ok) return null;
    const data = await resp.json();
    currentUser = data.user;
    return currentUser;
  } catch {
    return null;
  }
}
