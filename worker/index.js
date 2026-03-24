function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function js(code, status = 200) {
  return new Response(code, {
    status,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function text(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function numFmt(n) {
  return Number(n || 0).toLocaleString("ru-RU");
}

function isoNow() {
  return new Date().toISOString();
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function toSafeChatId(value) {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getBearerToken(request) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return "";
  return auth.slice(7).trim();
}

function isAuthorizedCronRequest(request, env) {
  const headerSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("x-internal-secret") ||
    getBearerToken(request);

  return !!env.CRON_SECRET && headerSecret === env.CRON_SECRET;
}

function buildAppConfig(env) {
  return {
    SUPABASE_URL: env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || "",
  };
}

function buildTgApiUrl(env, method) {
  return `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`;
}

async function tgCall(env, method, payload) {
  if (!env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN yo'q");
  }

  const resp = await fetch(buildTgApiUrl(env, method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await resp.text();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { ok: false, raw };
  }

  if (!resp.ok || data?.ok === false) {
    throw new Error(data?.description || data?.raw || `Telegram HTTP ${resp.status}`);
  }

  return data;
}

async function tgSendMessage(env, chatId, htmlText, extra = {}) {
  const parsedChatId = toSafeChatId(chatId);
  if (!parsedChatId) {
    throw new Error(`Invalid Telegram chat_id: ${chatId}`);
  }

  return tgCall(env, "sendMessage", {
    chat_id: parsedChatId,
    text: htmlText,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

function sbBase(env) {
  if (!env.SUPABASE_URL) throw new Error("SUPABASE_URL yo'q");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY yo'q");
  return `${env.SUPABASE_URL}/rest/v1`;
}

function sbHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

async function sbFetch(env, path, init = {}) {
  const url = `${sbBase(env)}${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      ...sbHeaders(env, init.headers || {}),
    },
  });

  if (!resp.ok) {
    const raw = await resp.text();
    throw new Error(`Supabase ${resp.status}: ${raw}`);
  }

  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) return resp.json();
  return resp.text();
}

async function sbInsertNotificationJob(env, row) {
  return sbFetch(env, `/notification_jobs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
}

async function sbGetDueJobs(env, limit = 50) {
  const now = encodeURIComponent(isoNow());
  return sbFetch(
    env,
    `/notification_jobs?select=id,user_id,type,title,body,payload,scheduled_for,status,attempts,created_at` +
    `&status=eq.pending` +
    `&scheduled_for=lte.${now}` +
    `&order=scheduled_for.asc` +
    `&limit=${limit}`
  );
}

async function sbClaimJob(env, job) {
  const nextAttempts = Number(job.attempts || 0) + 1;
  const claimed = await sbFetch(
    env,
    `/notification_jobs?id=eq.${job.id}&status=eq.pending&select=id,status,attempts`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status: "processing",
        attempts: nextAttempts,
        last_attempt_at: isoNow(),
      }),
    }
  );

  return Array.isArray(claimed) ? claimed[0] || null : null;
}

async function sbMarkJobSent(env, jobId) {
  return sbFetch(env, `/notification_jobs?id=eq.${jobId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status: "sent",
      sent_at: isoNow(),
      fail_reason: null,
    }),
  });
}

async function sbMarkJobFailed(env, jobId, reason) {
  return sbFetch(env, `/notification_jobs?id=eq.${jobId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status: "failed",
      fail_reason: String(reason || "Unknown error").slice(0, 2000),
    }),
  });
}

function renderNotificationText(job) {
  const title = isNonEmptyString(job.title) ? `<b>${esc(job.title)}</b>\n\n` : "";
  const body = esc(job.body || "");
  const payload = job.payload && typeof job.payload === "object" ? job.payload : {};
  const footer =
    payload?.footer && isNonEmptyString(payload.footer)
      ? `\n\n${esc(payload.footer)}`
      : "";

  return `${title}${body}${footer}`.trim();
}

async function processDueNotifications(env, meta = {}) {
  const dueJobs = await sbGetDueJobs(env, 50);
  const result = {
    ok: true,
    source: meta.source || "manual",
    total_due: Array.isArray(dueJobs) ? dueJobs.length : 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  if (!Array.isArray(dueJobs) || dueJobs.length === 0) {
    return result;
  }

  for (const job of dueJobs) {
    try {
      const claimed = await sbClaimJob(env, job);

      if (!claimed) {
        result.skipped += 1;
        continue;
      }

      const textToSend = renderNotificationText(job);
      await tgSendMessage(env, job.user_id, textToSend);

      await sbMarkJobSent(env, job.id);
      result.sent += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({
        id: job.id,
        error: error?.message || String(error),
      });

      try {
        await sbMarkJobFailed(env, job.id, error?.message || String(error));
      } catch (patchError) {
        result.errors.push({
          id: job.id,
          error: `Mark failed error: ${patchError?.message || String(patchError)}`,
        });
      }
    }
  }

  return result;
}

async function handleHealth(env) {
  return json({
    ok: true,
    has_bot_token: !!env.BOT_TOKEN,
    has_supabase_url: !!env.SUPABASE_URL,
    has_supabase_anon_key: !!env.SUPABASE_ANON_KEY,
    has_supabase_service_key: !!env.SUPABASE_SERVICE_ROLE_KEY,
    has_cron_secret: !!env.CRON_SECRET,
    compatibility: "cloudflare-worker",
  });
}

async function handleDebugTelegram(env) {
  try {
    const data = await tgCall(env, "getMe", {});
    return json({
      ok: true,
      status: 200,
      data,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error?.message || String(error),
      },
      500
    );
  }
}

async function handleClientLog(request) {
  const body = await safeJson(request);
  console.log("[client-log]", body);
  return json({ ok: true });
}

async function handleNotifyMiniAppTx(request, env) {
  if (request.method !== "POST") {
    return json({ ok: true, message: "notify-miniapp-tx ready" });
  }

  try {
    const body = await safeJson(request);

    const userId = body.user_id || body.userId;
    const amount = Number(body.amount || 0);
    const type = String(body.type || "expense") === "income" ? "income" : "expense";
    const category = String(body.category || "Xarajat").trim() || "Xarajat";
    const source = String(body.source || "mini_app").trim() || "mini_app";
    const note = String(body.note || "").trim();
    const receiptUrl = String(body.receipt_url || body.receiptUrl || "").trim();

    const chatId = toSafeChatId(userId);
    if (!chatId) return json({ ok: false, error: "user_id required" }, 400);
    if (!amount) return json({ ok: false, error: "amount required" }, 400);

    const icon = type === "income" ? "🟢" : "🔴";
    const label = type === "income" ? "Kirim" : "Chiqim";

    const lines = [
      `${icon} <b>Mini App orqali yangi operatsiya kiritildi</b>`,
      ``,
      `<b>Turi:</b> ${label}`,
      `<b>Summa:</b> ${numFmt(amount)} so'm`,
      `<b>Kategoriya:</b> ${esc(category)}`,
      `<b>Manba:</b> ${esc(source)}`,
    ];

    if (isNonEmptyString(note)) {
      lines.push(`<b>Izoh:</b> ${esc(note)}`);
    }

    if (isNonEmptyString(receiptUrl)) {
      lines.push(`<b>Chek:</b> mavjud`);
    }

    const tg = await tgSendMessage(env, chatId, lines.join("\n"));

    return json({
      ok: true,
      telegram_message_id: tg?.result?.message_id || null,
    });
  } catch (error) {
    console.error("[notify-miniapp-tx] error", error);
    return json(
      {
        ok: false,
        error: error?.message || String(error),
      },
      500
    );
  }
}

async function handleScheduleNotification(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  if (!isAuthorizedCronRequest(request, env)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  try {
    const body = await safeJson(request);

    const userId = toSafeChatId(body.user_id || body.userId);
    const type = String(body.type || "custom").trim() || "custom";
    const title = String(body.title || "").trim();
    const messageBody = String(body.body || body.message || "").trim();
    const scheduledFor = String(body.scheduled_for || body.scheduledFor || "").trim();
    const payload =
      body.payload && typeof body.payload === "object" ? body.payload : {};

    if (!userId) return json({ ok: false, error: "user_id required" }, 400);
    if (!isNonEmptyString(messageBody)) {
      return json({ ok: false, error: "body required" }, 400);
    }
    if (!isNonEmptyString(scheduledFor)) {
      return json({ ok: false, error: "scheduled_for required" }, 400);
    }

    const inserted = await sbInsertNotificationJob(env, {
      user_id: userId,
      type,
      title: title || null,
      body: messageBody,
      payload,
      scheduled_for: scheduledFor,
      status: "pending",
      attempts: 0,
    });

    return json({
      ok: true,
      inserted,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error?.message || String(error),
      },
      500
    );
  }
}

async function handleListDueNotifications(request, env) {
  if (!isAuthorizedCronRequest(request, env)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  try {
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 20)));
    const rows = await sbGetDueJobs(env, limit);
    return json({ ok: true, rows });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error?.message || String(error),
      },
      500
    );
  }
}

async function handleTestNotification(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  if (!isAuthorizedCronRequest(request, env)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  try {
    const body = await safeJson(request);
    const chatId = toSafeChatId(body.user_id || body.userId);
    if (!chatId) return json({ ok: false, error: "user_id required" }, 400);

    const html = `<b>Test notification</b>\n\nCloudflare cron tizimi ishlayapti ✅`;
    const tg = await tgSendMessage(env, chatId, html);

    return json({
      ok: true,
      telegram_message_id: tg?.result?.message_id || null,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error?.message || String(error),
      },
      500
    );
  }
}

async function handleManualCronRun(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  if (!isAuthorizedCronRequest(request, env)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  try {
    const result = await processDueNotifications(env, { source: "manual" });
    return json(result);
  } catch (error) {
    return json(
      {
        ok: false,
        error: error?.message || String(error),
      },
      500
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/config.js") {
        return js(`window.__APP_CONFIG__ = ${JSON.stringify(buildAppConfig(env))};`);
      }

      if (url.pathname === "/api/health") {
        return handleHealth(env);
      }

      if (url.pathname === "/api/debug-telegram") {
        return handleDebugTelegram(env);
      }

      if (url.pathname === "/api/client-log") {
        return handleClientLog(request);
      }

      if (url.pathname === "/api/notify-miniapp-tx") {
        return handleNotifyMiniAppTx(request, env);
      }

      if (url.pathname === "/api/notifications/schedule") {
        return handleScheduleNotification(request, env);
      }

      if (url.pathname === "/api/notifications/due") {
        return handleListDueNotifications(request, env);
      }

      if (url.pathname === "/api/notifications/test") {
        return handleTestNotification(request, env);
      }

      if (url.pathname === "/api/cron-reminders") {
        return handleManualCronRun(request, env);
      }

      if (url.pathname === "/favicon.ico") {
        return new Response(null, { status: 204 });
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("[worker.fetch] unhandled", error);
      return json(
        {
          ok: false,
          error: error?.message || String(error),
        },
        500
      );
    }
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      (async () => {
        try {
          const result = await processDueNotifications(env, {
            source: "scheduled",
            cron: controller?.cron || null,
            scheduledTime: controller?.scheduledTime || null,
          });
          console.log("[scheduled] result", result);
        } catch (error) {
          console.error("[scheduled] error", error);
        }
      })()
    );
  },
};