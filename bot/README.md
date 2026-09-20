# ADMIRE L.C. — Qabul tizimi (Telegram bot + API + admin panel)

ADMIRE L.C. (Buvayda tumani, Ibrat shaharchasi) uchun yagona qabul tizimi:

```
ADMIRE sayti  →  "Qabulga yozilish"  →  Telegram bot  →  Ariza bazaga saqlanadi
                     ↓                                              ↓
                Sayt formasi API                          ADMIRE admin Telegram
                                                → admin statusni yangilaydi (bot + web panel)
```

## Loyiha tuzilishi

```
index.html, css/, js/, assets/   — landing sayt
bot/
  package.json
  .env.example                   — konfiguratsiya namunasi (sekretni Git'ga yuklamang!)
  src/
    config.js                    — .env o'qish, konfiguratsiya
    db.js                        — SQLite baza (applications, bot_sessions, events)
    data.js                      — tasdiqlangan markaz ma'lumotlari (kurslar, manzil, aloqa)
    keyboards.js                 — Telegram klaviaturalar
    bot.js                       — grammY bot (menyu, kurslar, registratsiya, admin)
    server.js                    — Express: sayt + POST /api/applications + admin panel
    index.js                     — kirish nuqtasi (polling yoki webhook)
  data/admire.db                 — SQLite baza (avtomatik yaratiladi)
```

## O'rnatish va ishga tushirish

1. **Telegram bot yarating:** [@BotFather](https://t.me/BotFather) → `/newbot`
   → token olasiz, bot username olasiz (masalan `admire_lc_bot`).
2. **.env yarating:**
   ```
   cd bot
   copy .env.example .env
   ```
   Va to'ldiring:
   - `TELEGRAM_BOT_TOKEN` — BotFather tokeni
   - `TELEGRAM_BOT_USERNAME` — bot username'i (@siz)
   - `TELEGRAM_ADMIN_CHAT_ID` — arizalar keladigan shaxsiy chat yoki PRIVATE guruh ID
     (guruhga botni qo'shib, birinchi xabardan ID ni olish mumkin; guruh ID manfiy bo'ladi)
   - `TELEGRAM_ADMIN_IDS` — adminlaringiz Telegram user ID'lari (vergul bilan)
   - `ADMIN_PASSWORD` — admin panel paroli
3. **Dasturni ishga tushiring:**
   ```
   cd bot
   npm install
   npm start
   ```
   - Sayt: `http://localhost:3000`
   - Admin panel: `http://localhost:3000/admin`
   - Token bo'lmasa bot ishga tushmaydi, lekin sayt + forma API + admin panel ishlaydi.
4. **Production (webhook):** `.env` da `BASE_URL` (HTTPS) va `WEBHOOK_SECRET` bering —
   bot avtomatik webhook rejimiga o'tadi: `POST https://<BASE_URL>/<WEBHOOK_SECRET>`.
   `BASE_URL` bo'lmasa long-polling ishlaydi (development uchun).

## Ma'lumotlar bazasi (SQLite)

`applications` jadvali: `id, application_number, source, telegram_user_id, telegram_username,
full_name, phone, age, course, schedule, message, status, created_at, updated_at`.

Ariza raqami: `ADM-<yil>-<navbat>`, masalan `ADM-2026-000001`.

Statuslar: 🟡 Yangi · 📞 Bog'landim · ✅ Qabul qilindi · ⏳ Keyinroq · ❌ Bekor qilindi.

Ikkilamchi arizalardan himoya: bir xil Telegram user yoki telefon bilan 10 daqiqada
ikkinchi "Yangi" ariza qabul qilinmaydi; sayt formasida 1 daqiqalik IP cheklov ham bor.

## Xavfsizlik

- Token, parol, admin ID'lar faqat `.env`da — `.env` Git'ga kirmasligi kerak (`.gitignore`ga qo'shing).
- Admin panel parol bilan himoyalangan (HttpOnly session cookie, 8 soat).
- Telegram admin amallari (`st:...` tugmalari) faqat `TELEGRAM_ADMIN_IDS` yoki
  `TELEGRAM_ADMIN_CHAT_ID` guruhida ishlaydi.
- Barcha foydalanuvchi kiritmalari tekshiriladi va uzunligi cheklanadi.

## Test checklist

- [ ] `/start` — xush kelibsiz xabari + asosiy menyu tugmalari
- [ ] `🎓 Kurslar` — 5 tasdiqlangan kurs (Ingliz tili, IELTS, CEFR, SAT, Arab tili)
- [ ] Har bir kursda "Qabulga yozilish", "⬅️ Orqaga", "🏠 Bosh menyu" ishlashi
- [ ] `📝 Qabulga yozilish` → ism → telefon (contact tugma + qo'lda kiritish)
- [ ] Noto'g'ri telefon (masalan "123") rad etilishi
- [ ] Yosh: raqam 5–90 oralig'ida, aks holda xato xabari
- [ ] Kurs tanlash, izoh yozish yoki "O'tkazib yuborish"
- [ ] Tasdiqlash ekranida barcha maydonlar to'g'ri aks etishi
- [ ] `✅ Tasdiqlash` → `ADM-YYYY-NNNNNN` raqami + admin guruhga xabar
- [ ] Bir xil arizani tezda ikki marta yuborish → duplicate xabari
- [ ] `/cancel` va `❌ Bekor qilish` — oqimni xavfsiz to'xtatadi
- [ ] `📍 Manzil` — to'g'ri lokatsiya + Google Maps tugma
- [ ] Admin guruhda status tugmalari ishlashi, begona foydalanuvchi uchun "Ruxsat yo'q"
- [ ] Sayt formasi: ariza bazaga tushadi, ariza raqami ko'rsatiladi, admin xabar oladi
- [ ] Sayt formasi noto'g'ri ma'lumot → maydon xatolari (400)
- [ ] Admin panel: login/parol, filtrlar, qidiruv, status o'zgartirish, CSV eksport
- [ ] Admin panelsiz kirish (cookie yo'q) → login sahifasi
- [ ] Bot restartidan keyin registratsiya oqimi uzilmaydi (sessiya bazada)
