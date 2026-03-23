'use strict';

const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = process.env.BOT_TOKEN;
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

if (!BOT_TOKEN) throw new Error("BOT_TOKEN yo'q");
if (!SUPA_URL) throw new Error("SUPABASE_URL yo'q");
if (!SUPA_KEY) throw new Error("SUPABASE_KEY yo'q");

const bot = new TelegramBot(BOT_TOKEN, { polling: false });
const db = createClient(SUPA_URL, SUPA_KEY);

function relationMissing(error, table) {
  const msg = String(error?.message || error?.details || '').toLowerCase();
  return msg.includes(`table '${table}'`) || msg.includes(`relation \"public.${table}\"`) || msg.includes('does not exist');
}

function dueTarget(debt) {
  return debt.remind_at || debt.due_at || null;
}

module.exports = async (req, res) => {
  try {
    const auth = req.headers?.authorization || req.headers?.Authorization || '';
    if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const { data, error } = await db
      .from('debts')
      .select('id, user_id, person_name, amount, direction, due_at, remind_at, note, reminder_sent_at, status')
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .limit(300);

    if (error) {
      if (relationMissing(error, 'debts')) {
        return res.status(200).json({ ok: true, checked: 0, sent: 0, failed: [], skipped: 'debts table missing' });
      }
      return res.status(500).json({ ok: false, error: error.message });
    }

    const dueItems = (data || []).filter((debt) => {
      if (debt.status !== 'open') return false;
      if (debt.reminder_sent_at) return false;
      const target = dueTarget(debt);
      if (!target) return false;
      const ts = new Date(target).getTime();
      return Number.isFinite(ts) && ts <= now.getTime();
    });

    let sent = 0;
    const failed = [];

    for (const debt of dueItems) {
      const target = dueTarget(debt);
      const targetDate = target ? new Date(target) : null;
      const dayLabel = targetDate && targetDate.toLocaleDateString('uz-UZ') === now.toLocaleDateString('uz-UZ')
        ? 'Bugun'
        : 'Eslatma';
      const direction = debt.direction === 'payable' ? 'Siz qaytarishingiz kerak' : 'Sizga qaytishi kerak';
      const when = targetDate ? targetDate.toLocaleString('uz-UZ') : 'belgilangan vaqt';
      const text = `⏰ <b>Qarz eslatmasi</b>

${dayLabel} <b>${debt.person_name}</b> bilan bog'liq qarz vaqti yetdi.
💰 ${Number(debt.amount || 0).toLocaleString('ru-RU')} so'm
📌 ${direction}
🕒 ${when}${debt.note ? `
📝 ${debt.note}` : ''}`;

      try {
        await bot.sendMessage(debt.user_id, text, { parse_mode: 'HTML' });
        await db.from('debts').update({ reminder_sent_at: nowIso }).eq('id', debt.id).eq('user_id', debt.user_id);
        sent += 1;
      } catch (err) {
        failed.push({ id: debt.id, user_id: debt.user_id, error: err?.message || 'send failed' });
      }
    }

    return res.status(200).json({ ok: true, checked: (data || []).length, due: dueItems.length, sent, failed });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
};
