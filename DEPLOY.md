# ADMIRE L.C. — Production deploy qo'llanmasi (Netlify + Render)

## Nega bitta Netlify yetarli emas?

Bu loyiha — **oddiy statik sayt emas**. U:
- **Express (Node.js) server**: admin panel sahifalari serverda generatsiya qilinadi,
- **SQLite baza** (kurslar, o'qituvchilar, arizalar, videolar...),
- **sessiya/cookie autentifikatsiya** + CSRF,
- **fayl yuklash** (video, rasm),
- **Telegram bot** (long-polling).

Netlify statik fayllarni xizmat qiladi — Node serverni ishga tushira olmaydi.
Shuning uchun `/admin` u yerda 404 berardi. SPA fallback (`/* /index.html 200`)
bu muammoni **yashirardi**, lekin tuzatmasdi: admin sahifasi yo'q bo'lib,
login ishlamagan bo'lardi.

## To'g'ri arxitektura

```
Foydalanuvchi brauzeri
        │
        ▼
https://admire-lc.netlify.app          (Netlify — statik)
   ├─ /                → statik landing (yoki backend'dan render)
   ├─ /admin, /api, /media  ──proksi──►  https://admire-lc-backend.onrender.com
   │                                        (Render — Node.js)
   │                                        ├─ Express CMS (/admin)
   │                                        ├─ API (/api/applications...)
   │                                        ├─ Telegram bot
   │                                        └─ Baza: tashqi PostgreSQL (Neon)
```

Hammasi **bitta domenda** qoladi: `admire-lc.netlify.app/admin` to'g'ridan-to'g'ri
ochiladi va refresh'da ham ishlaydi (Netlify proxy redirect'lari orqali).

## 1-qadam: Bepul PostgreSQL baza yaratish (Neon)

Render Free planida persistent disk YO'Q, shuning uchun baza tashqi
PostgreSQL'da saqlanadi:

1. https://neon.tech → bepul ro'yxatdan o'tish (doimiy free tier).
2. Project yarating → **Connection string**'ni nusxalang
   (`postgresql://user:pass@ep-xxx.../neondb?sslmode=require`).
3. (Alternativ: Render Free PostgreSQL — lekin u 30 kundan keyin o'chadi,
   shuning uchun Neon tavsiya etiladi.)

## 1-b: Backendni Render.com'ga deploy qilish

1. Kodni GitHub'ga push qiling (`.gitignore` `.env` va `bot/data/` ni
   exclude qiladi — **sekremlar repoga tushmaydi**).
2. Render dashboard → **New → Blueprint** → reponi tanlang.
   `render.yaml` avtomatik o'qiladi.
3. Render env var'larida sekremlarni kiriting (render.yaml'da `sync: false`):
   - `DATABASE_URL` — Neon'dan olingan connection string (1-qadam)
   - `TELEGRAM_BOT_TOKEN` — @BotFather tokeni
   - `TELEGRAM_BOT_USERNAME` — `Admire_qabul_bot`
   - `TELEGRAM_ADMIN_CHAT_ID` — `7793284016`
   - `TELEGRAM_ADMIN_IDS` — `7793284016`
   - `ADMIN_PASSWORD` — kuchli parol (birinchi `admin` foydalanuvchi uchun)
   - `BASE_URL` — `https://admire-lc-backend.onrender.com`
   - `WEBHOOK_SECRET` — ixtiyoriy uzun tasodifiy satr
   > Ishga tushish logida `[db] Baza PostgreSQL'dan yuklandi...` yoki
   > `[db] PostgreSQL bo'sh — yangi baza yaratiladi` ko'rinishi kerak.
4. Deploy tugagach tekshiring: `https://admire-lc-backend.onrender.com/api/config`
   → JSON qaytarsa server ishlayapti.

> Eslatma (Render free plan): 15 daqiqa harakatsizlikdan keyin server "uxlaydi"
> va birinchi so'rov ~30-50 sekund cho'ziladi. Doimiy ishlashi uchun
> **Starter** plan ($7/oy) oling yoki cron-monitordan ping qiling.
>
> Eslatma (fayllar): CMS orqali yuklangan video/rasm fayllari konteyner
> diskida saqlanadi — Render Free'da restart/redeploy'da **yo'qoladi**
> (bazadagi yozuvlar PostgreSQL'da saqlanadi). Doimiy media uchun
> S3/Cloudflare R2 integratsiyasi kerak. YouTube videolariga ta'sir qilmaydi.

## 2-qadam: Netlify'ni sozlash

1. Repodagi barcha fayllar (landing + `netlify.toml` + `_redirects`) Netlify'ga
   deploy qilingan bo'lishi kerak.
2. **URL'ni bir joyda to'g'rilang**: agar Render xizmati `admire-lc-backend`
   nomidan boshqa nom bilan yaratilgan bo'lsa, `netlify.toml` va `_redirects`
   fayllaridagi `https://admire-lc-backend.onrender.com` ni haqiqiy URL bilan
   almashtiring (har birida 4 ta satr).
   > Sabab: Netlify redirect'larda env var interpolatsiyasi (`{{ env:BACKEND_URL }}`)
   > ishlamaydi — birinchi urinish shu sabab 404 bergan edi.
3. Qayta deploy qiling (**Deploys → Trigger deploy**).
   Proxy qoidalari: `/admin`, `/admin/*`, `/api/*`, `/media/*` → backend;
   qolgan hamma URL → `index.html` (landing).

> Agar Netlify'ga **drag-and-drop** orqali yuklasangiz: `netlify.toml` va
> `_redirects` ham yuklangan papkada bo'lishi shart (`_redirects` ayniqsa
> drag-and-drop deploy'lar uchun kerak).

## 3-qadam: Tekshirish (hammasi bitta domenda)

| URL | Kutiladi |
|---|---|
| `https://admire-lc.netlify.app/` | Landing page |
| `https://admire-lc.netlify.app/admin` | Admin login sahifasi |
| `/admin` ochiq holda **F5 refresh** | Yana login sahifasi (404 emas) |
| Login → `/admin/dashboard`, `/admin/courses`, ... | Barcha bo'limlar ishlaydi |
| Saytdagi forma → ariza yuborish | Admin panel + Telegram'da xabar |

## Xavfsizlik

- `.env` faqat lokalda; repoga kirmaydi (`.gitignore`).
- Sekremlar faqat Render env var'larida; brauzerga hech qachon yuborilmaydi.
- Netlify faqat **proksi** — barcha auth/logika backendda.
- `app.set("trust proxy", 1)` — proxy ortidagi haqiqiy IP uchun
  (rate-limit va loglar to'g'ri ishlashi uchun) qo'shildi.

## Fayllar (bu tuzatishda o'zgarganlari)

| Fayl | Nima uchun |
|---|---|
| `netlify.toml` (yangi) | Netlify routing: /admin, /api, /media → backend proksi (literal URL — env interpolatsiya ishlamaydi); SPA fallback faqat landing uchun |
| `_redirects` (yangi) | Xuddi shu qoidalar — drag-and-drop deploy'lar uchun zaxira (toml g'alaba qiladi, ikkalasi bir xil) |
| `render.yaml` (yangi) | Backend deploy blueprint: Node server + doimiy disk (SQLite) + env var'lar |
| `.gitignore` (yangi, root) | `.env` va `bot/data/` repoga tushmasligi uchun |
| `bot/src/server.js` | `app.set("trust proxy", 1)` — proxy ortida rate-limit/IP to'g'ri ishlashi uchun |
| `DEPLOY.md` (yangi) | Ushbu qo'llanma |

## Muammolarni topish

- **`/admin` hali ham Netlify 404 beradi** → deploy qilingan papkada
  `netlify.toml`/`_redirects` yo'q, yoki eski deploy (qayta deploy qiling).
  Netlify dashboard → Deploys → so'nggi deploy fayllari ro'yxatida
  `netlify.toml` ko'rinishi kerak.
- **`/admin` "Not Found" lekin Netlify emas (Render xatosi)** → backend
  o'chirilgan yoki URL xato. Render dashboard'dan tekshiring.
- **Login ishlaydi lekin saqlash 404** → `_redirects`/`netlify.toml`da
  `/admin/*` qoidasi yo'q yoki URL eski.
- **30–50 sekund sekinlik** → Render free plan "uxlagan" server (Starter oling).
