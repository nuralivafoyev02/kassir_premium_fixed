# Kassir Bot + WebApp

Bu variantda quyidagilar qo'shildi:
- premium obuna oqimi
- user chek yuboradi, creator approve/reject qiladi
- premium aktiv bo'lsa ovozli kiritish va premium analitika ishlaydi
- webhook status / set / delete endpointi qo'shildi
- frontendda premium status ko'rinadi
- config.js orqali frontend sozlanadi
- Supabase uchun to'liq SQL fayl berildi

## 1) Supabase sozlash
1. Supabase SQL Editor oching.
2. `supabase.sql` ichidagi hamma kodni bir martada ishga tushiring.
3. Storage ichida `receipts` va `premium-receipts` bucketlari yaratilganini tekshiring.
4. `premium_plans` jadvalidagi `price_note` qiymatlarini o'zingizning narxlarga moslab tahrir qiling.

## 2) ENV yozish
`.env.example` ni asos qilib oling.
Minimal kerak bo'ladiganlar:
- `BOT_TOKEN`
- `BOT_CREATOR_CHAT_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BOT_WEBHOOK_SECRET`
- `ADMIN_SECRET`
- `WEBAPP_URL`
- `PAYMENT_CARD_TEXT`

## 3) Frontend config
`config.js` ichida quyidagilarni to'ldiring:
- `SUPABASE_ANON_KEY`
- `BOT_USERNAME`

## 4) Webhook ulash
Deploy bo'lgandan keyin quyidagi URLni brauzerda oching:

`/api/webhook?action=set&secret=ADMIN_SECRET`

Misol:
`https://your-domain.vercel.app/api/webhook?action=set&secret=change-me-admin-secret`

Webhook holatini tekshirish:
`/api/webhook?action=status&secret=ADMIN_SECRET`

Webhookni uzish:
`/api/webhook?action=delete&secret=ADMIN_SECRET`

## 5) Creator approve flow
1. User botda `💎 Premium` bosadi.
2. Rejani tanlaydi.
3. To'lov qiladi va chek yuboradi.
4. Creator chatiga approve/reject tugmalari bilan so'rov boradi.
5. `✅ Tasdiqlash` bosilsa userga premium yoqiladi.

## 6) Premium funksiyalar
- Ovozli xabarni transaction ga aylantirish
- 30 kunlik premium analitika
- Creator tomonidan qo'lda tasdiqlanadigan premium subscription management

## 7) Tavsiya
Hozirgi frontend anon key bilan ishlayapti. Ishlab turadi, lekin production darajasida keyingi bosqichda frontendni protected API orqali ishlatish tavsiya qilinadi.
