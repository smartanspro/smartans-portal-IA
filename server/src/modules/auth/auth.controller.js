import { createCaptchaChallenge } from '../../lib/captcha.js';
import { setAccessCookie, setRefreshCookie, clearAuthCookies, REFRESH_COOKIE } from '../../lib/cookies.js';
import * as authService from './auth.service.js';

export function getCaptcha(req, res) {
  const { token, question } = createCaptchaChallenge();
  res.json({ captchaToken: token, question });
}

export async function postLogin(req, res, next) {
  try {
    const { accessToken, refreshToken, user } = await authService.login(req.body, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export function postRefresh(req, res, next) {
  try {
    const { accessToken, refreshToken, user } = authService.refresh(req.cookies?.[REFRESH_COOKIE], {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export function postLogout(req, res) {
  authService.logout(req.cookies?.[REFRESH_COOKIE]);
  clearAuthCookies(res);
  res.status(204).end();
}
