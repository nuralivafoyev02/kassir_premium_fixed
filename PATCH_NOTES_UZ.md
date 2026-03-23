# Kassa Premium — qo'llangan tuzatishlar

## Nimalar tuzatildi

1. Bot matn parseri kuchaytirildi:
   - `200 ming dadam berdilar` kabi gaplar endi **kirim** bo'ladi.
   - `berdim`, `to'ladim`, `sotib oldim` kabi gaplar **chiqim** sifatida yaxshiroq aniqlanadi.
   - kategoriya aniqlash uchun alias va foydalanuvchi kategoriyalari bilan moslashtirish kuchaytirildi.

2. Botga **reja / plan** intenti qo'shildi:
   - `5 mln farzandlarim uchun plan`
   - `3 mln ovqatga reja`
   kabi matnlardan oylik plan yaratish/yoki yangilash ishlaydi.

3. Botga **qarz** intenti qo'shildi:
   - qarz berish/qaytarish bilan bog'liq matnlar alohida debt yozuvlariga tushadi.

4. Notification / reminder oqimi yaxshilandi:
   - `api/cron-reminders.js` qayta yozildi.
   - ochiq qarzlar uchun `remind_at` yoki `due_at` bo'yicha tekshiradi.
   - yuborilgandan keyin `reminder_sent_at` yozadi.
   - `vercel.json` cron har **10 daqiqada** ishlaydigan qilindi.

5. Qarz qaytganda balansga ta'sir qilishi qo'shildi:
   - qarz **berilganda emas**,
   - qarz **qaytganda** yoki **qaytarilganda** linked transaction yaratiladi.
   - debt reopen/delete bo'lsa linked transaction ham sinxron tozalanadi.

6. Mini App > Reja qismi soddalashtirildi:
   - compact card ko'rinish,
   - progress va status aniqroq,
   - app ichki notification sync yaxshilandi.

7. Mini App modallari mobile full-screen ko'rinishga yaqinlashtirildi:
   - plan form
   - export
   - debt form
   - category form

8. PDF hisobot oqimi o'zgartirildi:
   - telefonda yuklanmasa, Mini App PDF'ni **botning o'zi userga yuboradi**.
   - agar bot yubora olmasa, fallback sifatida oddiy download ishlaydi.

9. Supabase schema qo'shimchalari qo'shildi:
   - `transactions.source`
   - `transactions.source_ref`
   - `debts.settlement_tx_id`
   - index qo'shildi.

## O'zgargan asosiy fayllar

- `api/bot.js`
- `api/cron-reminders.js`
- `api/send-report-pdf.js` *(yangi)*
- `server.js`
- `public/app.js`
- `public/app.features.js`
- `public/style.css`
- `supabase.sql`
- `vercel.json`

## Muhim eslatma

Build muhiti ichida `rollup` optional native paket yo'qligi sabab `npm run build` shu containerda oxirigacha yig'ilmadi.
Kodlarning syntax tekshiruvi o'tdi, lekin production build uchun o'zingizda quyidagini bajarish kerak:

```bash
npm install
npm run build
```

Agar kerak bo'lsa, `node_modules`ni tozalab qayta o'rnatish ham mumkin:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Database bo'yicha

`supabase.sql` ichidagi oxirgi migration qismini ham ishlatish kerak.
