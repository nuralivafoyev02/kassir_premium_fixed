import { hasFcmServerConfig } from "../../types/notifications.mjs";
import { clearFcmAccessTokenCache, getFcmAccessToken } from "./oauth.mjs";

function fcmEndpoint(env) {
  return `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`;
}

function normalizeDataValues(data = {}) {
  return Object.fromEntries(
    Object.entries(data || {})
      .filter(([, value]) => value != null)
      .map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ])
  );
}

function extractFcmErrorCode(payload = {}) {
  const details = Array.isArray(payload?.error?.details)
    ? payload.error.details
    : [];

  for (const detail of details) {
    if (detail?.errorCode) {
      return String(detail.errorCode).trim().toUpperCase();
    }
  }

  return String(payload?.error?.status || payload?.error?.code || "")
    .trim()
    .toUpperCase();
}

export function isInvalidFcmTokenCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return normalized === "UNREGISTERED" || normalized === "INVALID_ARGUMENT";
}

async function sendFcmMessageOnce(env, message) {
  const accessToken = await getFcmAccessToken(env);
  const response = await fetch(fcmEndpoint(env), {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  const raw = await response.text();
  let payload;

  try {
    payload = JSON.parse(raw);
  } catch {
    payload = {};
  }

  if (response.ok) {
    return {
      ok: true,
      name: payload?.name ?? null,
    };
  }

  return {
    ok: false,
    httpStatus: response.status,
    code: extractFcmErrorCode(payload) || `HTTP_${response.status}`,
    message: payload?.error?.message || raw || `FCM HTTP ${response.status}`,
  };
}

export async function sendFcmMessage(env, message, { retry = true } = {}) {
  try {
    const result = await sendFcmMessageOnce(env, message);

    if (result.ok) {
      return result;
    }

    if (retry && result.httpStatus === 401) {
      clearFcmAccessTokenCache();
      return sendFcmMessage(env, message, { retry: false });
    }

    return result;
  } catch (error) {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: error?.message || String(error),
    };
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length || 1)) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

export async function sendFcmMulticast(
  env,
  { tokens = [], notification = null, data = {}, webpush = {} } = {}
) {
  if (!hasFcmServerConfig(env)) {
    return {
      ok: false,
      reason: "config_missing",
      targetCount: 0,
      deliveredCount: 0,
      invalidTokens: [],
      results: [],
    };
  }

  const normalizedTokens = [
    ...new Set(tokens.map((token) => String(token || "").trim()).filter(Boolean)),
  ];

  const results = await mapWithConcurrency(
    normalizedTokens,
    5,
    async (token) => ({
      token,
      ...(await sendFcmMessage(env, {
        token,
        ...(notification ? { notification } : {}),
        ...(Object.keys(data || {}).length
          ? { data: normalizeDataValues(data) }
          : {}),
        ...(Object.keys(webpush || {}).length ? { webpush } : {}),
      })),
    })
  );

  const deliveredCount = results.filter((item) => item?.ok).length;
  const invalidTokens = results
    .filter((item) => item && !item.ok && isInvalidFcmTokenCode(item.code))
    .map((item) => ({
      token: item.token,
      code: item.code,
      message: item.message,
    }));

  return {
    ok: deliveredCount > 0,
    targetCount: normalizedTokens.length,
    deliveredCount,
    invalidTokens,
    results,
  };
}
