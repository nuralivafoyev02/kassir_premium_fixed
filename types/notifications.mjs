export const NOTIFICATION_PROVIDER_FCM = "fcm";
export const NOTIFICATION_PROVIDER_LEGACY_WORKER = "legacy_worker";
export const DEFAULT_NOTIFICATION_PROVIDER = NOTIFICATION_PROVIDER_LEGACY_WORKER;
export const FIREBASE_WEB_SDK_VERSION = "11.10.0";

const KNOWN_PROVIDERS = new Set([
  NOTIFICATION_PROVIDER_FCM,
  NOTIFICATION_PROVIDER_LEGACY_WORKER,
]);

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeNotificationProvider(
  value,
  fallback = DEFAULT_NOTIFICATION_PROVIDER
) {
  const normalized = toTrimmedString(value).toLowerCase();
  return KNOWN_PROVIDERS.has(normalized) ? normalized : fallback;
}

export function normalizeFirebasePrivateKey(value) {
  return toTrimmedString(value).replace(/\\n/g, "\n");
}

export function hasFcmServerConfig(env = {}) {
  return Boolean(
    toTrimmedString(env.FIREBASE_PROJECT_ID) &&
      toTrimmedString(env.FIREBASE_CLIENT_EMAIL) &&
      normalizeFirebasePrivateKey(env.FIREBASE_PRIVATE_KEY)
  );
}

export function hasFcmPublicConfig(env = {}) {
  return Boolean(
    toTrimmedString(env.FIREBASE_PROJECT_ID) &&
      toTrimmedString(env.FIREBASE_WEB_API_KEY) &&
      toTrimmedString(env.FIREBASE_APP_ID) &&
      toTrimmedString(env.FIREBASE_MESSAGING_SENDER_ID) &&
      toTrimmedString(env.FIREBASE_VAPID_KEY || env.VAPID_KEY)
  );
}

export function buildPublicNotificationConfig(env = {}) {
  const provider = normalizeNotificationProvider(env.NOTIFICATION_PROVIDER);
  return {
    NOTIFICATION_PROVIDER: provider,
    NOTIFICATION_FALLBACK_PROVIDER: NOTIFICATION_PROVIDER_LEGACY_WORKER,
    PUSH_NOTIFICATIONS_ENABLED:
      provider === NOTIFICATION_PROVIDER_FCM && hasFcmPublicConfig(env),
    FIREBASE_PROJECT_ID: toTrimmedString(env.FIREBASE_PROJECT_ID),
    FIREBASE_WEB_API_KEY: toTrimmedString(env.FIREBASE_WEB_API_KEY),
    FIREBASE_APP_ID: toTrimmedString(env.FIREBASE_APP_ID),
    FIREBASE_MESSAGING_SENDER_ID: toTrimmedString(
      env.FIREBASE_MESSAGING_SENDER_ID
    ),
    FIREBASE_AUTH_DOMAIN: toTrimmedString(env.FIREBASE_AUTH_DOMAIN),
    FIREBASE_VAPID_KEY: toTrimmedString(
      env.FIREBASE_VAPID_KEY || env.VAPID_KEY
    ),
  };
}

export function buildFirebaseWebConfig(env = {}) {
  const config = buildPublicNotificationConfig(env);
  return {
    apiKey: config.FIREBASE_WEB_API_KEY,
    projectId: config.FIREBASE_PROJECT_ID,
    appId: config.FIREBASE_APP_ID,
    messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
    ...(config.FIREBASE_AUTH_DOMAIN
      ? { authDomain: config.FIREBASE_AUTH_DOMAIN }
      : {}),
  };
}
