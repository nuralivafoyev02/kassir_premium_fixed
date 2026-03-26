# Kassir obuna va pricing refaktori hisoboti

## 1. Qanday tahlil qilindi

Loyihadagi quyidagi qatlamlar tekshirildi:

- `public/app.js` va `public/app.features.js` orqali mini app oqimlari
- `src/components/overlays/AppOverlays.vue` va `public/style.css` orqali settings / profile UI
- `api/bot.js` orqali Telegram bot oqimlari
- `api/cron-reminders.js` va `worker/index.js` orqali eslatma va cron oqimlari
- `api/send-report-files.js` va `api/send-report-pdf.js` orqali hisobot yuborish backendlari
- Supabase jadvallari bo'yicha real schema holati

Real schema tekshiruvda `public.users` jadvalida subscription ustunlari hali yo'qligi ko'rildi. Shu sabab implementatsiya ikki qatlamda yuritildi:

1. Kod darajasida backward-compatible subscription helper va feature gate qatlamini qo'shish
2. DB migratsiyasi orqali keyin to'liq enforcement yoqilishi uchun schema/triggers tayyorlash

## 2. Joriy qilingan pricing modeli

Joriy pricing modeli:

- `free`
- `premium_monthly`

Premium narxi:

- `21 999 so'm / oy`

Ichki status arxitekturasi:

- `free`
- `trial`
- `active`
- `expired`
- `canceled`
- `grace`

UI ko'rinishida ishlatiladigan statuslar:

- `Obuna bo'lmagan`
- `Obuna bo'lgan`
- `Sinov muddati`
- `Obuna muddati tugagan`

Hozirgi oqimda faol ishlatiladigan minimal xavfsiz statuslar:

- `free`
- `active`
- `expired`

## 3. Bepul va Premium funksiyalar taqsimoti

### Bepul bo'lib qolgan funksiyalar

- oddiy kirim qo'shish
- oddiy chiqim qo'shish
- tarixni ko'rish
- basic dashboard
- basic kategoriya ishlatish
- bot va mini app asosiy sinxron ishlashi
- 1 ta faol reja
- 1 ta faol qarz
- 1 ta faol limit
- basic reminder

### Premium qilingan funksiyalar

- cheksiz reja yaratish
- cheksiz qarz yaratish
- cheksiz limit yaratish
- ertalabgi eslatma
- kechki eslatma
- custom reminder vaqti
- PDF / Excel kengaytirilgan hisobotlar
- chuqur statistika va kengaytirilgan analiz
- kelajakdagi AI-ready premium gate infratuzilmasi

## 4. Qilingan texnik ishlar

### Markazlashgan subscription/gate qatlami

`public/kassa.subscription.js` qo'shildi va unda quyidagilar markazlashtirildi:

- plan code lar
- subscription status lar
- pricing metadata
- free va premium feature ro'yxatlari
- snapshot builder
- badge builder
- reusable gate helperlar

Asosiy helperlar:

- `canCreatePlan`
- `canCreateDebt`
- `canCreateLimit`
- `canUseAdvancedReminders`
- `canUseAdvancedReports`
- `canUseDeepAnalytics`
- `canUseAiInsights`
- `canUseNotificationFeature`

### Frontend / UI

Mini app tarafida:

- settings ichida subscription panel qo'shildi
- pricing kartalari qo'shildi
- foydalanuvchining joriy tarifi ko'rinadigan qilindi
- status badge qo'shildi
- premium paywall overlay qo'shildi
- pricing, status va paywall matnlari `public/lang/*.json` ga tushirildi

### Backend

Backend tarafida bir xil logika bilan gate ishlashi uchun:

- bot ichida reja va qarz yaratish gate qilindi
- admin uchun `/premium`, `/freeplan`, `/subinfo` komandalar qo'shildi
- report endpointlar premium-only bo'ldi
- cron va worker daily reminder/daily report oqimlari premium subscription ga bog'landi
- `lib/subscription-access.cjs` orqali server-side subscription lookup helper qo'shildi

## 5. DB o'zgarishlari

Repo ichidagi DB migratsiya qatlamida subscription uchun tayyor struktura bor:

- `users.plan_code`
- `users.subscription_status`
- `users.subscription_start_at`
- `users.subscription_end_at`
- `users.trial_end_at`
- `users.canceled_at`
- `users.grace_until`

Shuningdek tayyorlangan DB himoyalari:

- `plan_code` va `subscription_status` uchun constraintlar
- subscription state uchun index
- free user uchun debt va limit count gate triggerlari
- custom reminder vaqtini premium-only qiluvchi trigger
- `user_has_premium_access(...)` funksiyasi

Muhim eslatma:

- real Supabase schemada tekshiruv vaqtida bu subscription ustunlari hali apply qilinmagan edi
- ya'ni kod subscription-ready, lekin DB enforcement to'liq ishlashi uchun migratsiya production database ga qo'llanishi kerak

## 6. Feature gate qanday ishlaydi

Markaziy qoida:

- schema tayyor bo'lsa, gate real subscription state bo'yicha ishlaydi
- schema hali apply bo'lmagan joylarda kod fail-open ishlaydi, ya'ni mavjud prod flow larni darhol sindirmaydi

Gate misollari:

- free user `activePlansCount >= 1` bo'lsa yangi reja bloklanadi
- free user `activeDebtsCount >= 1` bo'lsa yangi qarz bloklanadi
- free user custom reminder tanlasa paywall ochiladi
- free user PDF/Excel report ishlatsa backend `403` va `upgrade_required:advanced_reports` qaytaradi
- premium user uchun shu gate lar ochiq qoladi

## 7. O'zgargan fayllar

O'zgargan yoki qo'shilgan asosiy fayllar:

- `public/kassa.subscription.js`
- `lib/subscription-access.cjs`
- `public/app.js`
- `public/app.features.js`
- `src/components/overlays/AppOverlays.vue`
- `public/style.css`
- `public/lang/uz.json`
- `public/lang/ru.json`
- `public/lang/en.json`
- `src/lib/loadLegacyScripts.js`
- `api/bot.js`
- `api/cron-reminders.js`
- `worker/index.js`
- `api/send-report-files.js`
- `api/send-report-pdf.js`

## 8. Xavflar va qanday bartaraf etildi

Yopilgan xavflar:

- pricing va gate logikasi har joyda alohida hardcode bo'lib ketmasligi uchun markazlashtirildi
- schema hali apply bo'lmagan holatda mavjud foydalanuvchilar oqimi buzilib ketmasligi uchun null-safe fallback yozildi
- report export faqat frontend darajasida emas, backend darajasida ham premium-only qilindi
- bot, worker va mini app uchun bir xil business rule qatlamidan foydalanildi

Qoldirilgan ehtiyotkor cheklovlar:

- payment provider hali ulanmagan, lekin arxitektura `plan_code` va `subscription_status` update qilishga tayyor
- real DB ga migratsiya bu turn davomida apply qilinmadi
- agar productionda allaqachon free foydalanuvchida 1 tadan ko'p faol reja/qarz/limit bo'lsa, yangi DB triggerlar yoqilgach keyingi create/update paytida shu holat alohida nazorat talab qiladi

## 9. Payment qo'shish uchun tayyorlangan nuqtalar

Keyingi integratsiya uchun tayyor bo'lgan joylar:

- `plan_code` va `subscription_status` update qilish strukturalari
- premium access snapshot/helper qatlami
- admin/manual subscription hooklari
- backend `upgrade_required:*` detail response formatlari
- UI ichida tayyor pricing va paywall oqimi

## 10. Tekshiruv natijalari

Yakuniy tekshiruvlar:

- `npm run cf:check` — o'tdi
- `npm run build` — o'tdi
- `node --check api/send-report-files.js` — o'tdi
- `node --check api/send-report-pdf.js` — o'tdi
- `node --check lib/subscription-access.cjs` — o'tdi
- `node --check public/kassa.subscription.js` — o'tdi

Smoke-check natijalari:

- yangi snapshot default `free`
- premium snapshot `premium_monthly`
- free user uchun report gate `false`
- premium user uchun report gate `true`
- premium narxi `21 999 so'm / oy`

## 11. Qisqa xulosa

Loyiha ichida production-safe subscription va pricing karkasi joriy qilindi. Frontend, bot, worker va report backendlar bir xil pricing modelga bog'landi. Pricing UI va paywall oqimi tayyor. To'liq DB enforcement uchun esa `supabase.sql` dagi subscription migratsiyasini real database ga apply qilish keyingi majburiy bosqich bo'lib qoladi.
