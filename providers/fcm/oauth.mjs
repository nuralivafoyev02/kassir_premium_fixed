import {
  hasFcmServerConfig,
  normalizeFirebasePrivateKey,
} from "../../types/notifications.mjs";
import { signServiceAccountJwt } from "../../utils/jwt.mjs";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

let accessTokenCache = {
  token: "",
  expiresAt: 0,
  cacheKey: "",
};

function buildCacheKey(env) {
  return `${env?.FIREBASE_PROJECT_ID || ""}:${env?.FIREBASE_CLIENT_EMAIL || ""}`;
}

export function clearFcmAccessTokenCache() {
  accessTokenCache = {
    token: "",
    expiresAt: 0,
    cacheKey: "",
  };
}

export async function getFcmAccessToken(env) {
  if (!hasFcmServerConfig(env)) {
    throw new Error("FCM server credentials missing");
  }

  const cacheKey = buildCacheKey(env);
  if (
    accessTokenCache.token &&
    accessTokenCache.cacheKey === cacheKey &&
    accessTokenCache.expiresAt > Date.now() + 60_000
  ) {
    return accessTokenCache.token;
  }

  const assertion = await signServiceAccountJwt({
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: normalizeFirebasePrivateKey(env.FIREBASE_PRIVATE_KEY),
    scope: FCM_SCOPE,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  const raw = await response.text();
  let payload;

  try {
    payload = JSON.parse(raw);
  } catch {
    payload = {};
  }

  if (!response.ok || !payload?.access_token) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        raw ||
        `Google OAuth HTTP ${response.status}`
    );
  }

  accessTokenCache = {
    token: payload.access_token,
    expiresAt:
      Date.now() + Math.max(0, (Number(payload.expires_in) || 3600) - 60) * 1000,
    cacheKey,
  };

  return accessTokenCache.token;
}
