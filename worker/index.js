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

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function numFmt(n) {
  return Number(n || 0).toLocaleString("ru-RU");
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function handleNotifyMiniAppTx(request, env) {
  if (request.method !== "POST") {
    return json({ ok: true, message: "notify-miniapp-tx ready" });
  }

  try {
    if (!env.BOT_TOKEN) {
      return json({ ok: false, error: "BOT_TOKEN yo'q" }, 500);
    }

    const body = await safeJson(request);

    const userId = String(body.user_id || body.userId || "").trim();
    const amount = Number(body.amount || 0);
    const type =
      String(body.type || "expense") === "income" ? "income" : "expense";
    const category = String(body.category || "Xarajat").trim() || "Xarajat";
    const source = String(body.source || "mini_app").trim() || "mini_app";

    if (!userId) return json({ ok: false, error: "user_id required" }, 400);
    if (!amount) return json({ ok: false, error: "amount required" }, 400);

    const icon = type === "income" ? "🟢" : "🔴";
    const label = type === "income" ? "Kirim" : "Chiqim";

    const text = `${icon} <b>Mini App orqali yangi operatsiya kiritildi</b>

<b>Turi:</b> ${label}
<b>Summa:</b> ${numFmt(amount)} so'm
<b>Kategoriya:</b> ${esc(category)}
<b>Manba:</b> ${esc(source)}`;

    const tgResp = await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: userId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const rawText = await tgResp.text();

    let tgData = null;
    try {
      tgData = JSON.parse(rawText);
    } catch {
      tgData = { raw: rawText };
    }

    if (!tgResp.ok || tgData?.ok === false) {
      console.error("[notify-miniapp-tx] telegram failed", {
        status: tgResp.status,
        tgData,
        userId,
        amount,
        type,
        category,
      });

      return json(
        {
          ok: false,
          error: tgData?.description || tgData?.raw || `Telegram HTTP ${tgResp.status}`,
          debug: { userId, amount, type, category },
        },
        500
      );
    }

    return json({ ok: true, telegram: tgData });
  } catch (error) {
    console.error("[notify-miniapp-tx] worker error", error);
    return json({ ok: false, error: error?.message || String(error) }, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/config.js") {
      return js(
        `window.__APP_CONFIG__ = ${JSON.stringify({
          SUPABASE_URL: env.SUPABASE_URL || "",
          SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || "",
        })};`
      );
    }

    if (url.pathname === "/api/notify-miniapp-tx") {
      return handleNotifyMiniAppTx(request, env);
    }

    if (url.pathname === "/favicon.ico") {
      return new Response(null, { status: 204 });
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(controller, env, ctx) {
    console.log("TODO: migrate cron-reminders logic to Workers scheduled handler");
  },
};