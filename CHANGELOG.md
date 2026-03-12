# Nimalar o'zgardi

## Backend
- `api/bot.js` premium flow bilan qayta yozildi.
- creator approve/reject inline button qo'shildi.
- premium request, subscription, plan boshqaruvi qo'shildi.
- premium foydalanuvchilar uchun voice input va premium analytics qo'shildi.
- webhook secret support qo'shildi.

## Webhook
- `api/webhook.js` qo'shildi.
- set / status / delete actionlari mavjud.

## Frontend
- hardcoded config `config.js` ga ko'chirildi.
- premium status header va settings ichida ko'rsatiladi.
- transaction save rollback yaxshilandi.
- import/export ichiga exchange rate va kategoriyalar qo'shildi.
- kategoriya dublikati bloklandi.

## Infra
- `.env.example` qo'shildi.
- `supabase.sql` to'liq schema berildi.
- `README.md` va `webhook-commands.txt` qo'shildi.
