import {
  buildFirebaseWebConfig,
  FIREBASE_WEB_SDK_VERSION,
  hasFcmPublicConfig,
} from "../../types/notifications.mjs";

function buildNoopServiceWorkerScript() {
  return `self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});`;
}

export function buildFirebaseMessagingServiceWorkerScript(env = {}) {
  if (!hasFcmPublicConfig(env)) {
    return buildNoopServiceWorkerScript();
  }

  const firebaseConfig = buildFirebaseWebConfig(env);
  const configJson = JSON.stringify(firebaseConfig);

  return `importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_WEB_SDK_VERSION}/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/${FIREBASE_WEB_SDK_VERSION}/firebase-messaging-compat.js");

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

firebase.initializeApp(${configJson});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload?.notification || {};
  const data = payload?.data || {};
  const title = notification.title || data.title || "Kassa";
  const body = notification.body || data.body || "";
  const options = {
    body,
    data: {
      ...(data || {}),
      url: data.url || data.link || "/",
    },
  };

  if (notification.icon || data.icon) {
    options.icon = notification.icon || data.icon;
  }

  if (notification.badge || data.badge) {
    options.badge = notification.badge || data.badge;
  }

  if (notification.tag || data.tag) {
    options.tag = notification.tag || data.tag;
  }

  if (data.requireInteraction === "true") {
    options.requireInteraction = true;
  }

  if (data.renotify === "true") {
    options.renotify = true;
  }

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification?.close?.();
  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("navigate" in client) {
          client.navigate(targetUrl).catch(() => {});
        }

        if ("focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});`;
}
