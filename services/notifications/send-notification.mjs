import {
  DEFAULT_NOTIFICATION_PROVIDER,
  NOTIFICATION_PROVIDER_FCM,
  NOTIFICATION_PROVIDER_LEGACY_WORKER,
  hasFcmServerConfig,
  normalizeNotificationProvider,
} from "../../types/notifications.mjs";
import {
  listActivePushDevices,
  markInvalidPushTokens,
} from "../../db/push-devices.mjs";
import { sendFcmMulticast } from "../../providers/fcm/http-v1.mjs";
import { sendLegacyWorkerNotification } from "../../providers/legacy/worker-telegram.mjs";
import { escapeHtml, toPlainNotificationContent } from "../../utils/html-text.mjs";

function toSafeUserId(value) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

function buildLegacyHtml(input = {}) {
  if (String(input.html || "").trim()) {
    return String(input.html).trim();
  }

  const plain = toPlainNotificationContent(input);
  const sections = [];
  if (plain.title) {
    sections.push(`<b>${escapeHtml(plain.title)}</b>`);
  }
  if (plain.body) {
    sections.push(escapeHtml(plain.body));
  }
  return sections.join("\n\n").trim();
}

function buildFcmPayload(input = {}) {
  const plain = toPlainNotificationContent(input);
  const data = {
    title: plain.title,
    body: plain.body,
    ...(input.data && typeof input.data === "object" ? input.data : {}),
    notification_type: String(input.type || "custom"),
    user_id: String(input.userId || ""),
  };

  const link = String(input.clickUrl || input.url || "/").trim() || "/";
  const notification = {
    title: plain.title,
    body: plain.body,
  };

  const webpush = {
    fcm_options: {
      link,
    },
    notification: {
      ...(input.tag ? { tag: String(input.tag) } : {}),
      ...(input.icon ? { icon: String(input.icon) } : {}),
      ...(input.badge ? { badge: String(input.badge) } : {}),
      ...(input.requireInteraction === true ? { requireInteraction: true } : {}),
      ...(input.renotify === true ? { renotify: true } : {}),
    },
  };

  return {
    data,
    notification,
    webpush,
  };
}

async function attemptFcmNotification(env, input) {
  if (!hasFcmServerConfig(env)) {
    return {
      ok: false,
      provider: NOTIFICATION_PROVIDER_FCM,
      reason: "config_missing",
      deliveredCount: 0,
      targetCount: 0,
      invalidTokenCount: 0,
      errorSamples: [],
    };
  }

  const devices = await listActivePushDevices(env, input.userId);
  const tokens = devices
    .map((device) => String(device?.token || "").trim())
    .filter(Boolean);

  if (!tokens.length) {
    return {
      ok: false,
      provider: NOTIFICATION_PROVIDER_FCM,
      reason: "no_active_devices",
      deliveredCount: 0,
      targetCount: 0,
      invalidTokenCount: 0,
      errorSamples: [],
    };
  }

  const payload = buildFcmPayload(input);
  const result = await sendFcmMulticast(env, {
    tokens,
    notification: payload.notification,
    data: payload.data,
    webpush: payload.webpush,
  });

  if (result.invalidTokens.length) {
    await markInvalidPushTokens(env, result.invalidTokens).catch(() => {});
  }

  return {
    ok: result.deliveredCount > 0,
    provider: NOTIFICATION_PROVIDER_FCM,
    reason:
      result.deliveredCount > 0
        ? null
        : result.results.find((item) => item && !item.ok)?.code || "delivery_failed",
    deliveredCount: result.deliveredCount,
    targetCount: result.targetCount,
    invalidTokenCount: result.invalidTokens.length,
    errorSamples: result.results
      .filter((item) => item && !item.ok)
      .slice(0, 3)
      .map((item) => ({
        code: item.code,
        message: item.message,
      })),
  };
}

async function attemptLegacyNotification(env, input) {
  try {
    const delivery = await sendLegacyWorkerNotification(env, {
      userId: input.userId,
      html: buildLegacyHtml(input),
      title: input.title,
      body: input.body,
      extra: input.legacyExtra || {},
    });

    return {
      ok: true,
      provider: NOTIFICATION_PROVIDER_LEGACY_WORKER,
      deliveredCount: 1,
      targetCount: 1,
      legacyMessageId: delivery.messageId || null,
    };
  } catch (error) {
    return {
      ok: false,
      provider: NOTIFICATION_PROVIDER_LEGACY_WORKER,
      reason: "legacy_failed",
      deliveredCount: 0,
      targetCount: 1,
      error: error?.message || String(error),
    };
  }
}

function buildPrimaryFailure(result) {
  return {
    reason: result?.reason || null,
    deliveredCount: Number(result?.deliveredCount || 0),
    targetCount: Number(result?.targetCount || 0),
    invalidTokenCount: Number(result?.invalidTokenCount || 0),
    errorSamples: Array.isArray(result?.errorSamples) ? result.errorSamples : [],
  };
}

export async function sendNotification(env, input = {}) {
  const userId = toSafeUserId(input.userId || input.user_id);
  const provider = normalizeNotificationProvider(
    env?.NOTIFICATION_PROVIDER,
    DEFAULT_NOTIFICATION_PROVIDER
  );

  if (!userId) {
    return {
      ok: false,
      provider,
      primaryProvider: provider,
      fallbackProvider: null,
      fallbackUsed: false,
      reason: "invalid_user_id",
      deliveredCount: 0,
      targetCount: 0,
    };
  }

  const normalizedInput = {
    ...input,
    userId,
  };

  if (provider === NOTIFICATION_PROVIDER_FCM) {
    const primary = await attemptFcmNotification(env, normalizedInput);
    if (primary.ok) {
      return {
        ...primary,
        primaryProvider: provider,
        fallbackProvider: NOTIFICATION_PROVIDER_LEGACY_WORKER,
        fallbackUsed: false,
      };
    }

    const fallback = await attemptLegacyNotification(env, normalizedInput);
    if (fallback.ok) {
      return {
        ...fallback,
        primaryProvider: provider,
        fallbackProvider: NOTIFICATION_PROVIDER_LEGACY_WORKER,
        fallbackUsed: true,
        primaryFailure: buildPrimaryFailure(primary),
      };
    }

    return {
      ok: false,
      provider,
      primaryProvider: provider,
      fallbackProvider: NOTIFICATION_PROVIDER_LEGACY_WORKER,
      fallbackUsed: true,
      reason: fallback.reason || primary.reason || "delivery_failed",
      error: fallback.error || primary.error || "Notification delivery failed",
      deliveredCount: 0,
      targetCount: Math.max(
        Number(primary.targetCount || 0),
        Number(fallback.targetCount || 0)
      ),
      primaryFailure: buildPrimaryFailure(primary),
    };
  }

  const legacy = await attemptLegacyNotification(env, normalizedInput);
  return {
    ...legacy,
    primaryProvider: provider,
    fallbackProvider: null,
    fallbackUsed: false,
  };
}
