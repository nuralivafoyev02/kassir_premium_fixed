'use strict';

module.exports = async (_req, res) => {
  const { buildFirebaseMessagingServiceWorkerScript } = await import('../services/notifications/service-worker-script.mjs');

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(buildFirebaseMessagingServiceWorkerScript(process.env));
};
