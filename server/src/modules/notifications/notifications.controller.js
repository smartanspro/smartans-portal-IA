import * as service from './notifications.service.js';

export function getConfig(req, res) {
  res.json({ config: service.getMaskedConfig() });
}

export function updateConfig(req, res) {
  res.json({ config: service.updateConfig(req.body, req.user.id) });
}

export async function testSlack(req, res, next) {
  try {
    await service.sendSlackTest(req.body.message);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function testTelegram(req, res, next) {
  try {
    await service.sendTelegramTest(req.body.message);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
