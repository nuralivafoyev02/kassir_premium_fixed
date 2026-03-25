import { initializeApp, getApp, getApps } from "firebase/app"
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported as isMessagingSupported,
  onMessage,
} from "firebase/messaging"

const STORAGE_KEYS = {
  deviceId: "kassa.push.device_id",
  token: "kassa.push.token",
  lastSyncAt: "kassa.push.last_sync_at",
}

const defaultPermission =
  typeof window !== "undefined" && "Notification" in window
    ? window.Notification.permission
    : "unsupported"

const pushState = {
  userId: null,
  provider: "legacy_worker",
  embeddedTelegram: false,
  appKind: "web_app",
  publicEnabled: false,
  supported: false,
  supportReason: "pending",
  status: "idle",
  permission: defaultPermission,
  tokenRegistered: false,
  tokenPreview: "",
  lastSyncAt: readStorage(STORAGE_KEYS.lastSyncAt) || null,
  lastError: null,
}

let messagingSupportPromise = null
let foregroundListenerInstalled = false

function readStorage(key) {
  try {
    return window.localStorage.getItem(key) || ""
  } catch {
    return ""
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // ignore storage errors
  }
}

function removeStorage(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore storage errors
  }
}

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `kassa-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`
}

function getDeviceId() {
  const existing = readStorage(STORAGE_KEYS.deviceId)
  if (existing) return existing
  const next = randomId()
  writeStorage(STORAGE_KEYS.deviceId, next)
  return next
}

function previewToken(token) {
  const raw = String(token || "").trim()
  if (!raw) return ""
  if (raw.length <= 18) return raw
  return `${raw.slice(0, 10)}...${raw.slice(-6)}`
}

function currentPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported"
  }

  return window.Notification.permission || "default"
}

function snapshotState() {
  return { ...pushState }
}

function emitState() {
  window.dispatchEvent(
    new CustomEvent("kassa:push-state", {
      detail: snapshotState(),
    })
  )
}

function updateState(patch = {}) {
  Object.assign(pushState, patch)
  emitState()
  return snapshotState()
}

function publicConfig(appConfig = window.__APP_CONFIG__ || {}) {
  return {
    NOTIFICATION_PROVIDER: String(appConfig.NOTIFICATION_PROVIDER || "").trim() || "legacy_worker",
    PUSH_NOTIFICATIONS_ENABLED: appConfig.PUSH_NOTIFICATIONS_ENABLED === true,
    FIREBASE_PROJECT_ID: String(appConfig.FIREBASE_PROJECT_ID || "").trim(),
    FIREBASE_WEB_API_KEY: String(appConfig.FIREBASE_WEB_API_KEY || "").trim(),
    FIREBASE_APP_ID: String(appConfig.FIREBASE_APP_ID || "").trim(),
    FIREBASE_MESSAGING_SENDER_ID: String(
      appConfig.FIREBASE_MESSAGING_SENDER_ID || ""
    ).trim(),
    FIREBASE_AUTH_DOMAIN: String(appConfig.FIREBASE_AUTH_DOMAIN || "").trim(),
    FIREBASE_VAPID_KEY: String(appConfig.FIREBASE_VAPID_KEY || "").trim(),
  }
}

function hasPublicConfig(config = publicConfig()) {
  return Boolean(
    config.PUSH_NOTIFICATIONS_ENABLED &&
      config.FIREBASE_PROJECT_ID &&
      config.FIREBASE_WEB_API_KEY &&
      config.FIREBASE_APP_ID &&
      config.FIREBASE_MESSAGING_SENDER_ID &&
      config.FIREBASE_VAPID_KEY
  )
}

function runtimeSupportCheck() {
  if (typeof window === "undefined") {
    return { supported: false, reason: "ssr" }
  }

  if (!window.isSecureContext) {
    return { supported: false, reason: "insecure_context" }
  }

  if (!("Notification" in window)) {
    return { supported: false, reason: "notification_api_missing" }
  }

  if (!("serviceWorker" in navigator)) {
    return { supported: false, reason: "service_worker_missing" }
  }

  if (!("PushManager" in window)) {
    return { supported: false, reason: "push_manager_missing" }
  }

  return { supported: true, reason: null }
}

async function ensureMessagingSupport() {
  if (!messagingSupportPromise) {
    messagingSupportPromise = isMessagingSupported()
  }

  return messagingSupportPromise
}

async function ensureMessagingClient(config) {
  const firebaseConfig = {
    apiKey: config.FIREBASE_WEB_API_KEY,
    appId: config.FIREBASE_APP_ID,
    messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
    projectId: config.FIREBASE_PROJECT_ID,
    ...(config.FIREBASE_AUTH_DOMAIN
      ? { authDomain: config.FIREBASE_AUTH_DOMAIN }
      : {}),
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  const messaging = getMessaging(app)

  if (!foregroundListenerInstalled) {
    onMessage(messaging, (payload) => {
      const title =
        payload?.notification?.title || payload?.data?.title || "Kassa"
      const body = payload?.notification?.body || payload?.data?.body || ""

      window.dispatchEvent(
        new CustomEvent("kassa:push-message", {
          detail: {
            title,
            body,
            payload,
          },
        })
      )
    })
    foregroundListenerInstalled = true
  }

  return messaging
}

async function ensureServiceWorkerRegistration() {
  return navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
  })
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const raw = await response.text()
  let data = {}

  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = {}
  }

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || raw || `HTTP ${response.status}`)
  }

  return data
}

function buildRegistrationPayload(token = "", overrides = {}) {
  return {
    user_id: pushState.userId,
    device_key: getDeviceId(),
    token: token || "",
    platform: "web",
    app_kind: pushState.appKind,
    permission_state: currentPermission(),
    locale: navigator.language || "",
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    user_agent: navigator.userAgent || "",
    is_telegram_embedded: pushState.embeddedTelegram,
    metadata: {
      path: window.location.pathname,
      lang: document.documentElement.lang || "",
      telegram_version: window.Telegram?.WebApp?.version || "",
    },
    ...overrides,
  }
}

export async function configurePushManager({
  userId,
  appConfig = window.__APP_CONFIG__ || {},
} = {}) {
  const config = publicConfig(appConfig)
  const runtimeSupport = runtimeSupportCheck()
  const embeddedTelegram = Boolean(window.Telegram?.WebApp)

  updateState({
    userId: Number(userId || 0) || null,
    provider: config.NOTIFICATION_PROVIDER,
    publicEnabled: config.PUSH_NOTIFICATIONS_ENABLED,
    embeddedTelegram,
    appKind: embeddedTelegram ? "mini_app" : "web_app",
    permission: currentPermission(),
    lastError: null,
  })

  if (!runtimeSupport.supported) {
    return updateState({
      supported: false,
      supportReason: runtimeSupport.reason,
      status: "unsupported",
    })
  }

  if (!hasPublicConfig(config)) {
    return updateState({
      supported: false,
      supportReason:
        config.NOTIFICATION_PROVIDER === "fcm"
          ? "missing_public_config"
          : "provider_disabled",
      status: "disabled",
    })
  }

  const firebaseSupported = await ensureMessagingSupport()
  if (!firebaseSupported) {
    return updateState({
      supported: false,
      supportReason: embeddedTelegram
        ? "telegram_embedded_limit"
        : "firebase_unsupported",
      status: "unsupported",
    })
  }

  updateState({
    supported: true,
    supportReason: null,
    status: currentPermission() === "granted" ? "ready" : "idle",
  })

  if (pushState.userId && currentPermission() === "granted") {
    await syncPushToken({ force: false }).catch(() => {})
  }

  return snapshotState()
}

export async function syncPushToken({
  requestPermission = false,
  force = false,
} = {}) {
  const config = publicConfig()

  if (!pushState.userId) {
    return updateState({
      status: "waiting_user",
      lastError: null,
    })
  }

  if (!pushState.supported || !hasPublicConfig(config)) {
    return snapshotState()
  }

  let permission = currentPermission()

  if (requestPermission && permission === "default") {
    permission = await window.Notification.requestPermission()
  }

  updateState({ permission })

  if (permission !== "granted") {
    if (permission === "denied") {
      await disablePushNotifications("permission_denied").catch(() => {})
    } else {
      updateState({
        status: "permission_required",
      })
    }

    return snapshotState()
  }

  updateState({
    status: "syncing",
    lastError: null,
  })

  try {
    const messaging = await ensureMessagingClient(config)
    const serviceWorkerRegistration = await ensureServiceWorkerRegistration()
    const token = await getToken(messaging, {
      vapidKey: config.FIREBASE_VAPID_KEY,
      serviceWorkerRegistration,
    })

    if (!token) {
      return updateState({
        status: "token_missing",
        tokenRegistered: false,
        tokenPreview: "",
      })
    }

    await postJson("/api/push/register", buildRegistrationPayload(token))

    const nowIso = new Date().toISOString()
    writeStorage(STORAGE_KEYS.token, token)
    writeStorage(STORAGE_KEYS.lastSyncAt, nowIso)

    return updateState({
      status: "ready",
      tokenRegistered: true,
      tokenPreview: previewToken(token),
      lastSyncAt: nowIso,
      lastError: null,
    })
  } catch (error) {
    updateState({
      status: "error",
      lastError: error?.message || String(error),
    })
    throw error
  }
}

export async function disablePushNotifications(reason = "manual_disable") {
  const config = publicConfig()
  const token = readStorage(STORAGE_KEYS.token)

  try {
    if (pushState.supported && hasPublicConfig(config) && currentPermission() === "granted") {
      const messaging = await ensureMessagingClient(config).catch(() => null)
      if (messaging && token) {
        await deleteToken(messaging).catch(() => {})
      }
    }
  } catch {
    // ignore browser token cleanup failures
  }

  await postJson(
    "/api/push/unregister",
    buildRegistrationPayload("", {
      reason,
      token,
    })
  ).catch(() => {})

  removeStorage(STORAGE_KEYS.token)
  const nowIso = new Date().toISOString()
  writeStorage(STORAGE_KEYS.lastSyncAt, nowIso)

  return updateState({
    status: currentPermission() === "denied" ? "permission_denied" : "disabled",
    tokenRegistered: false,
    tokenPreview: "",
    lastSyncAt: nowIso,
    lastError: null,
  })
}

export function installPushManagerBridge() {
  if (typeof window === "undefined") return
  if (window.__KASSA_PUSH__) return

  window.__KASSA_PUSH__ = {
    configure: configurePushManager,
    sync: syncPushToken,
    disable: disablePushNotifications,
    getState: snapshotState,
  }

  emitState()
}
