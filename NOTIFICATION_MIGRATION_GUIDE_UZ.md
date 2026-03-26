# Notification migratsiyasini qo'llash yo'riqnomasi

## Qachon kerak bo'ladi

Agar mini app ichidagi notification bo'limida:

- `Migratsiya kerak`
- `DB migratsiya kutilmoqda`
- `Notification migratsiyasi hali qo'llanmagan`

degan holat chiqsa, notification ustunlari va jadvallari joriy Supabase projectga hali qo'llanmagan bo'ladi.

## Eng muhim qoida

Migratsiyani aynan notification panel ichida ko'rinayotgan **`Supabase loyiha`** qiymatiga qo'llang.

Bir projectga SQL qo'llab, mini app boshqa projectga qarab turgan bo'lsa, muammo yo'qolmaydi.

## Qo'llash tartibi

1. Mini app ichida `Sozlamalar -> Telegram bildirishnomalar` bo'limini oching.
2. `Supabase loyiha` satrida ko'ringan project ref'ni yozib oling.
3. O'sha project uchun Supabase dashboard oching.
4. Repo ichidagi [supabase.sql](/Users/admin/Desktop/PROJECTS/kassir_dev/supabase.sql) faylini oching.
5. Notification bilan bog'liq migration qismini SQL Editor orqali ishga tushiring.

Kerakli bo'limlar:

- `users.daily_reminder_enabled`
- `users.last_daily_reminder_at`
- `users.last_daily_report_at`
- `notification_settings`
- `notification_logs`
- `user_push_tokens`

6. SQL muvaffaqiyatli ishlagach deployni yangilang.
7. Mini app'ni to'liq yopib qayta oching.
8. Notification bo'limida `Yangilash` tugmasini bosing.

## Deploydan keyin tekshiruv

Quyidagilar ishlashi kerak:

- holat `Migratsiya kerak` emas, normal status bo'ladi
- `Basic reminder` ustuni to'g'ri ko'rinadi
- `Yoqish` va `O'chirish` tugmalari real ishlaydi
- worker reminder logikasi user sozlamasi bilan bir xil ishlaydi

## Odatdagi xatolik sababi

Eng ko'p uchraydigan holat:

- local yoki MCP boshqa Supabase projectga ulangan bo'ladi
- deploy qilingan mini app esa boshqa projectdagi `SUPABASE_URL` bilan ishlaydi

Shu sabab notification panelga project ref chiqarildi. Endi migratsiyani aynan o'sha projectga qo'llash kerak.
