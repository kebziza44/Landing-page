import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { config, ROOT } from "./config.js";
import {
  hashPassword,
  verifyPassword,
  ensureSeedAdmin,
  audit,
  listAudit,
  getSetting,
  setSetting,
  getRow,
  insertRow,
  updateRow,
  deleteRow,
  togglePublished,
  moveRow,
  cmsStats,
  TABLE_FIELDS,
} from "./cms-db.js";
import { listApplications, countByStatus, setApplicationStatus, getApplication } from "./db.js";

const UPLOAD_DIR = path.join(ROOT, "data", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase().slice(0, 8);
      cb(null, Date.now() + "-" + crypto.randomBytes(4).toString("hex") + ext);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|webp|avif|mp4|webm|mov)$/i.test(file.originalname || "");
    if (!ok) return cb(new Error("Fayl turi qo‘llanilmaydi (rasm yoki video bo‘lishi kerak)"));
    cb(null, true);
  },
});

/* ---------- Auth ---------- */
const SESSION_TTL_SHORT = 8 * 60 * 60 * 1000;
const SESSION_TTL_LONG = 30 * 24 * 60 * 60 * 1000;

function createSession(adminId, remember) {
  const token = crypto.randomBytes(32).toString("hex");
  const ttl = remember ? SESSION_TTL_LONG : SESSION_TTL_SHORT;
  const expires = new Date(Date.now() + ttl);
  setSession(token, adminId, remember ? 1 : 0, expires.toISOString());
  return { token, maxAge: ttl };
}
import { run as dbRun, all as dbAll, get as dbGet, persist } from "./db.js";
function setSession(token, adminId, remember, expiresAt) {
  dbRun("INSERT INTO admin_sessions (token, admin_id, remember, expires_at) VALUES (?, ?, ?, ?)", [
    token,
    adminId,
    remember,
    expiresAt,
  ]);
}
function currentAdmin(req) {
  const token = req.cookies?.admire_admin;
  if (!token) return null;
  const row = dbGet("SELECT * FROM admin_sessions WHERE token = ?", [token]);
  if (!row || new Date(row.expires_at) < new Date()) return null;
  const admin = dbGet("SELECT id, username, role FROM admin_users WHERE id = ?", [row.admin_id]);
  return admin ?? null;
}
function destroySession(token) {
  dbRun("DELETE FROM admin_sessions WHERE token = ?", [token]);
}

function requireAuth(req, res, next) {
  const admin = currentAdmin(req);
  if (!admin) return res.redirect("/admin/login");
  req.admin = admin;
  next();
}
function requireSuper(req, res, next) {
  if (req.admin?.role !== "SUPER_ADMIN") {
    return res.status(403).send(page("Ruxsat yo‘q", `<div class="card empty">⛔ Bu bo‘lim faqat SUPER_ADMIN uchun.</div>`, req));
  }
  next();
}

/* ---------- CSRF ---------- */
function csrfToken(req) {
  const admin = currentAdmin(req);
  return crypto.createHash("sha256").update("csrf:" + admin?.id + ":" + (req.cookies?.admire_admin ?? "")).digest("hex");
}
function checkCsrf(req, res, next) {
  const t = req.body?._csrf;
  if (!t || t !== csrfToken(req)) {
    return res.status(403).send("CSRF xatosi");
  }
  next();
}

/* ---------- HTML yordamchilar ---------- */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function page(title, body, req, opts = {}) {
  const active = opts.active ?? "";
  const role = req.admin?.role ?? "";
  const nav = [
    ["📊", "/admin/dashboard", "Dashboard", "dashboard"],
    ["🌐", "/admin/landing", "Landing Page", "landing"],
    ["🎓", "/admin/courses", "Kurslar", "courses"],
    ["👨‍🏫", "/admin/teachers", "Ustozlar", "teachers"],
    ["🏆", "/admin/results", "Natijalar", "results"],
    ["🎥", "/admin/videos", "Videolar", "videos"],
    ["🖼", "/admin/media", "Galereya / Media", "media"],
    ["⭐", "/admin/reviews", "Sharhlar", "reviews"],
    ["📩", "/admin/applications", "Arizalar", "applications"],
    ["📋", "/admin/audit", "Audit log", "audit"],
    ["⚙️", "/admin/settings", "Sozlamalar", "settings"],
    ["👤", "/admin/users", "Adminlar", "users"],
  ]
    .filter(([,, label, key]) => key !== "users" || role === "SUPER_ADMIN")
    .map(
      ([icon, href, label, key]) =>
        `<a href="${href}" class="side__link${key === active ? " side__link--active" : ""}"><span>${icon}</span>${label}</a>`
    )
    .join("");

  return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — ADMIRE L.C. Admin</title>
<meta name="robots" content="noindex">
<link rel="icon" type="image/png" href="/assets/img/logo.png">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${ADMIN_CSS}</style></head>
<body>
<div class="layout">
  <aside class="side" id="side">
    <div class="side__brand"><img src="/assets/img/logo.png" alt=""><span>ADMIRE <em>L.C.</em></span></div>
    <nav class="side__nav">${nav}</nav>
    <form method="post" action="/admin/logout"><button class="side__logout">Chiqish</button></form>
  </aside>
  <div class="main">
    <header class="topbar">
      <button class="topbar__burger" id="sideToggle" aria-label="Menyu">☰</button>
      <h1>${esc(title)}</h1>
      <a class="topbar__preview" href="/" target="_blank">👁 Saytni ko‘rish</a>
      <span class="topbar__user">${esc(req.admin?.username ?? "")} · ${role}</span>
    </header>
    <main class="content">${body}</main>
  </div>
</div>
<script>
document.getElementById('sideToggle')?.addEventListener('click', function(){
  document.getElementById('side').classList.toggle('side--open');
});
</script>
</body></html>`;
}

function confirmDelete(formAction, label) {
  return `<form method="post" action="${formAction}" class="inline" onsubmit="return confirm('Bu ma’lumotni o‘chirishni xohlaysizmi?\\n${esc(label)}')"><input type="hidden" name="_csrf" value="">…</form>`;
}

/* ============================================================
   Responsive data-table (reusable)
   Desktop: oddiy jadval. Mobil (≤768px): har qator — karta,
   har katak ustida data-label yozuvi chiqadi.
   ============================================================ */
function renderDataTable(columns, rows, cellModes = []) {
  // columns: ["#","Sarlavha",...]
  // rows: array of arrays (string html per cell)
  // cellModes: per-column mode: "" | "hide" (mobil'da raqam ko‘rsatilmaydi) | "actions"
  const thead = `<thead><tr>${columns
    .map((c, i) => `<th${cellModes[i] === "actions" ? ' class="th-actions"' : ""}>${esc(c)}</th>`)
    .join("")}</tr></thead>`;
  const tbody = rows
    .map(
      (cells) => `<tr>${cells
        .map((cell, i) => {
          const mode = cellModes[i] ?? "";
          const label = mode === "hide" ? "" : columns[i];
          const cls = [mode === "actions" ? "cell-actions" : "", mode === "hide" ? "cell-index" : ""]
            .filter(Boolean)
            .join(" ");
          return `<td data-label="${esc(label)}" class="${cls}">${cell}</td>`;
        })
        .join("")}</tr>`
    )
    .join("\n");
  return `<div class="tbl"><table class="data-table">${thead}<tbody>${tbody}</tbody></table></div>`;
}

/* ============================================================
   Router
   ============================================================ */
export function createCmsRouter() {
  ensureSeedAdmin();
  const r = express.Router();

  /* ---------- Middleware: cookie parse ---------- */
  r.use((req, res, next) => {
    req.cookies = Object.fromEntries(
      (req.headers.cookie ?? "")
        .split(";")
        .map((s) => s.trim().split("="))
        .filter((p) => p.length === 2)
    );
    next();
  });

  /* ---------- Login ---------- */
  r.get("/", (req, res) => {
    if (currentAdmin(req)) return res.redirect("/admin/dashboard");
    res.redirect("/admin/login");
  });

  r.get("/login", (req, res) => {
    if (currentAdmin(req)) return res.redirect("/admin/dashboard");
    res.send(renderLogin());
  });

  r.post("/login", (req, res) => {
    const { username, password, remember } = req.body ?? {};
    const user = dbGet("SELECT * FROM admin_users WHERE username = ?", [String(username ?? "").trim()]);
    const ok = user && verifyPassword(String(password ?? ""), user.password_hash);
    if (!ok) {
      audit(String(username ?? "?"), "Muvaffaqiyatsiz kirish urinishi");
      return res.status(401).send(renderLogin("Login yoki parol noto‘g‘ri"));
    }
    const s = createSession(user.id, remember === "on");
    audit(user.username, "Tizimga kirdi");
    res.setHeader(
      "Set-Cookie",
      `admire_admin=${s.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(s.maxAge / 1000)}`
    );
    res.redirect("/admin/dashboard");
  });

  r.post("/logout", (req, res) => {
    destroySession(req.cookies?.admire_admin);
    res.setHeader("Set-Cookie", "admire_admin=; Max-Age=0; Path=/");
    res.redirect("/admin/login");
  });

  r.use(requireAuth);

  /* ---------- Dashboard ---------- */
  r.get("/dashboard", (req, res) => {
    const stats = cmsStats();
    const statusCounts = countByStatus();
    const recentApps = listApplications({ limit: 6 });
    const recentAudit = listAudit(6);
    const cards = [
      ["📩", "Yangi arizalar", stats.applicationsNew, "/admin/applications"],
      ["👥", "Jami arizalar", stats.applicationsTotal, "/admin/applications"],
      ["🎓", "Kurslar", stats.courses, "/admin/courses"],
      ["🏆", "Natijalar", stats.results, "/admin/results"],
      ["🎥", "Videolar", stats.videos, "/admin/videos"],
      ["🖼", "Galereya", stats.media, "/admin/media"],
      ["⭐", "Sharhlar", stats.reviews, "/admin/reviews"],
      ["👨‍🏫", "Ustozlar", stats.teachers, "/admin/teachers"],
    ];
    const body = `
    <div class="cards">
      ${cards.map(([i, l, v, h]) => `<a class="card stat" href="${h}"><span class="stat__icon">${i}</span><span class="stat__value">${v}</span><span class="stat__label">${l}</span></a>`).join("")}
    </div>
    <div class="grid2">
      <div class="card">
        <div class="card__head"><h2>📨 So‘nggi arizalar</h2><a class="btn-sm" href="/admin/applications">Hammasi</a></div>
        ${recentApps.length ? renderDataTable(
          ["Ariza", "Ism", "Telefon", "Status"],
          recentApps.map((a) => [
            `<b>${esc(a.application_number)}</b>`,
            esc(a.full_name),
            esc(a.phone),
            statusBadge(a.status),
          ]),
          ["hide", "", "", ""]
        ) : `<div class="empty">Hozircha arizalar yo‘q. Sayt formasida yoki Telegram botda keladi.</div>`}
      </div>
      <div class="card">
        <div class="card__head"><h2>⚡ Tezkor amallar</h2></div>
        <div class="quick">
          <a class="btn-sm" href="/admin/courses/new">➕ Kurs qo‘shish</a>
          <a class="btn-sm" href="/admin/results/new">🏆 Natija qo‘shish</a>
          <a class="btn-sm" href="/admin/videos/new">🎥 Video qo‘shish</a>
          <a class="btn-sm" href="/admin/media">🖼 Rasm yuklash</a>
          <a class="btn-sm" href="/admin/teachers/new">👨‍🏫 Ustoz qo‘shish</a>
        </div>
        <div class="card__head" style="margin-top:20px"><h2>📋 So‘nggi harakatlar</h2></div>
        <ul class="audit-mini">${recentAudit.map((a) => `<li><b>${esc(a.admin_username)}</b> — ${esc(a.action)} <small>${esc(a.created_at)}</small></li>`).join("")}</ul>
      </div>
    </div>`;
    res.send(page("Dashboard", body, req, { active: "dashboard" }));
  });

  /* ---------- Admissions (arizalar) ---------- */
  r.get("/applications", (req, res) => {
    const { status, course, q } = req.query;
    const apps = listApplications({ status, course, q });
    const counts = countByStatus();
    const body = `
    <form method="get" class="filters">
      <input type="search" name="q" placeholder="Ism, telefon yoki ariza raqami…" value="${esc(q)}">
      <select name="status"><option value="">Barcha statuslar</option>
        ${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}" ${status === k ? "selected" : ""}>${v.emoji} ${v.label} (${counts[k]})</option>`).join("")}
      </select>
      <input type="text" name="course" placeholder="Kurs" value="${esc(course)}">
      <button class="btn-p">Filtr</button>
      <a class="btn-s" href="/admin/applications/export.csv?${new URLSearchParams(Object.entries({ status, course, q }).filter(([, v]) => v)).toString()}">⬇️ CSV</a>
    </form>
    <div class="card">
      ${apps.length ? renderDataTable(
        ["Ariza", "Ism", "Telefon", "Telegram", "Yosh", "Kurs", "Izoh", "Manba", "Vaqt", "Status"],
        apps.map((a) => [
          `<b>${esc(a.application_number)}</b>`,
          esc(a.full_name),
          `<a href="tel:${esc(a.phone)}">${esc(a.phone)}</a>`,
          esc(a.telegram_username ? "@" + a.telegram_username : "—"),
          esc(a.age ?? "—"),
          esc(a.course),
          esc(a.message ?? "—"),
          esc(a.source),
          esc(a.created_at),
          `<form method="post" action="/admin/applications/status" class="inline">
            <input type="hidden" name="_csrf" value="${csrfToken(req)}">
            <input type="hidden" name="id" value="${a.id}">
            <select name="status" onchange="this.form.submit()" aria-label="Statusni o‘zgartirish">
              ${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}" ${a.status === k ? "selected" : ""}>${v.emoji} ${v.label}</option>`).join("")}
            </select></form>`
        ]),
        ["hide", "", "", "", "", "", "", "", "", "actions"]
      ) : `<div class="empty">Arizalar topilmadi.</div>`}
    </div>`;
    res.send(page("Qabul arizalari", body, req, { active: "applications" }));
  });

  r.post("/applications/status", checkCsrf, (req, res) => {
    const { id, status } = req.body ?? {};
    if (STATUSES[status] && Number.isInteger(Number(id))) {
      setApplicationStatus(Number(id), status);
      audit(req.admin.username, "Ariza statusi o‘zgardi", `${getApplication(Number(id))?.application_number} → ${status}`);
    }
    res.redirect("/admin/applications");
  });

  r.get("/applications/export.csv", (req, res) => {
    const { status, course, q } = req.query;
    const apps = listApplications({ status, course, q, limit: 10000 });
    const head = "Ariza raqami,Manba,Ism,Telefon,Telegram,Yosh,Kurs,Izoh,Status,Yaratildi,Yangilandi";
    const rows = apps.map((a) =>
      [a.application_number, a.source, a.full_name, a.phone, a.telegram_username ?? "", a.age ?? "", a.course, (a.message ?? "").replace(/\n/g, " "), STATUSES[a.status]?.label ?? a.status, a.created_at, a.updated_at]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    res.type("text/csv").attachment("admire-arizalar.csv").send("\ufeff" + [head, ...rows].join("\n"));
  });

  /* ---------- Landing CMS ---------- */
  r.get("/landing", (req, res) => {
    const hero = getSetting("hero");
    const about = getSetting("about");
    const body = `
    <div class="card"><div class="card__head"><h2>🎯 Hero bo‘limi</h2></div>
      <form method="post" action="/admin/landing/hero" class="form">
        <input type="hidden" name="_csrf" value="${csrfToken(req)}">
        ${input("Badge (yuqori yozuv)", "badge", hero.badge)}
        <div class="row3">
          ${input("Sarlavha (1-qism)", "titleBefore", hero.titleBefore)}
          ${input("Sarlavha (ajratilgan so‘z, ko‘k)", "titleHighlight", hero.titleHighlight)}
          ${input("Sarlavha (oxirgi qism)", "titleAfter", hero.titleAfter)}
        </div>
        ${textarea("Tavsif", "subtitle", hero.subtitle)}
        <div class="row2">
          ${input("Tugma 1 matni", "cta1Text", hero.cta1Text)}
          ${input("Tugma 1 havolasi", "cta1Action", hero.cta1Action)}
        </div>
        <div class="row2">
          ${input("Tugma 2 matni", "cta2Text", hero.cta2Text)}
          ${input("Tugma 2 havolasi", "cta2Action", hero.cta2Action)}
        </div>
        <div class="row2">
          ${input("Fon rasmi URL (yoki Media'dan ko‘chiring)", "bgImage", hero.bgImage)}
          ${input("Fon rasmi tavsifi (alt)", "bgAlt", hero.bgAlt)}
        </div>
        <h3>Statistikalar</h3>
        ${(hero.stats ?? []).map((s, i) => `
        <div class="row3">
          ${input("Raqam", `stats[${i}][value]`, s.value)}
          ${input("Izoh", `stats[${i}][label]`, s.label)}
          <label class="chk"><input type="checkbox" name="stats[${i}][visible]" ${s.visible ? "checked" : ""}> 👁 Ko‘rinadi</label>
        </div>`).join("")}
        <button class="btn-p">Saqlash</button>
      </form>
    </div>

    <div class="card"><div class="card__head"><h2>📖 Biz haqimizda</h2></div>
      <form method="post" action="/admin/landing/about" class="form">
        <input type="hidden" name="_csrf" value="${csrfToken(req)}">
        ${input("Eyebrow", "eyebrow", about.eyebrow)}
        ${input("Sarlavha", "title", about.title)}
        ${textarea("1-paragraf", "lead", about.lead)}
        ${textarea("2-paragraf", "text", about.text)}
        <h3>Afzalliklar</h3>
        ${(about.features ?? []).map((f, i) => `
        <div class="row2">
          ${input("Matn", `features[${i}][text]`, f.text)}
          <label class="chk"><input type="checkbox" name="features[${i}][visible]" ${f.visible ? "checked" : ""}> 👁 Ko‘rinadi</label>
        </div>`).join("")}
        <div class="row2">
          ${input("Rasm URL", "image", about.image)}
          ${input("Rasm alt", "imageAlt", about.imageAlt)}
        </div>
        <div class="row2">
          ${input("Rasm yozuvi", "caption", about.caption)}
          ${input("CTA havolasi", "ctaAction", about.ctaAction)}
        </div>
        ${input("CTA matni", "ctaText", about.ctaText)}
        <button class="btn-p">Saqlash</button>
      </form>
    </div>

    <div class="card"><div class="card__head"><h2>📍 Manzil</h2></div>
      <form method="post" action="/admin/landing/location" class="form">
        <input type="hidden" name="_csrf" value="${csrfToken(req)}">
        <div class="row2">
          ${input("Manzil 1-qator", "addressLine1", getSetting("location").addressLine1)}
          ${input("Manzil 2-qator", "addressLine2", getSetting("location").addressLine2)}
        </div>
        <div class="row2">
          ${input("Kenglik (latitude)", "latitude", getSetting("location").latitude)}
          ${input("Uzunlik (longitude) — ehtiyot bo‘ling: 71.1376099", "longitude", getSetting("location").longitude)}
        </div>
        ${input("Google Maps URL", "mapsUrl", getSetting("location").mapsUrl)}
        <h3>Ish vaqti</h3>
        ${(getSetting("location").hours ?? []).map((h, i) => `
        <div class="row3">
          ${input("Kunlar", `hours[${i}][days]`, h.days)}
          ${input("Soatlar", `hours[${i}][time]`, h.time)}
          <label class="chk"><input type="checkbox" name="hours[${i}][visible]" ${h.visible ? "checked" : ""}> 👁</label>
        </div>`).join("")}
        <button class="btn-p">Saqlash</button>
      </form>
    </div>

    <div class="card"><div class="card__head"><h2>📞 Aloqa</h2></div>
      <form method="post" action="/admin/landing/contact" class="form">
        <input type="hidden" name="_csrf" value="${csrfToken(req)}">
        <div class="row2">
          ${input("Telefon", "phone", getSetting("contact").phone)}
          ${input("Telegram kanal", "telegram", getSetting("contact").telegram)}
        </div>
        <div class="row2">
          ${input("Instagram", "instagram", getSetting("contact").instagram)}
          ${input("Telegram qabulxona", "telegramReception", getSetting("contact").telegramReception)}
        </div>
        <div class="row2">
          ${input("Email (ixtiyoriy)", "email", getSetting("contact").email)}
          ${input("Sayt (ixtiyoriy)", "website", getSetting("contact").website)}
        </div>
        <div class="row2">
          ${input("Google Maps tugma izohi", "mapsNote", getSetting("contact").mapsNote)}
          ${input("Telegram qabul izohi", "telegramApplyNote", getSetting("contact").telegramApplyNote)}
        </div>
        <button class="btn-p">Saqlash</button>
      </form>
    </div>

    <div class="card"><div class="card__head"><h2>🔻 Footer</h2></div>
      <form method="post" action="/admin/landing/footer" class="form">
        <input type="hidden" name="_csrf" value="${csrfToken(req)}">
        ${textarea("Footer tavsif (HTML ruxsat etilgan)", "about", getSetting("footer").about)}
        ${textarea("Manzil (HTML)", "address", getSetting("footer").address)}
        <div class="row2">
          ${input("Ish vaqti", "hours", getSetting("footer").hours)}
          ${input("Copyright", "copyright", getSetting("footer").copyright)}
        </div>
        <button class="btn-p">Saqlash</button>
      </form>
    </div>`;
    res.send(page("Landing Page CMS", body, req, { active: "landing" }));
  });

  const saveSettingHandler = (key, label) => (req, res) => {
    const prev = getSetting(key);
    const data = normalizeBody(req.body);
    setSetting(key, { ...prev, ...data });
    audit(req.admin.username, label + " tahrirlandi");
    res.redirect("/admin/landing");
  };
  r.post("/landing/hero", checkCsrf, saveSettingHandler("hero", "Hero"));
  r.post("/landing/about", checkCsrf, saveSettingHandler("about", "Biz haqimizda"));
  r.post("/landing/location", checkCsrf, saveSettingHandler("location", "Manzil"));
  r.post("/landing/contact", checkCsrf, saveSettingHandler("contact", "Aloqa"));
  r.post("/landing/footer", checkCsrf, saveSettingHandler("footer", "Footer"));

  /* ---------- Video formasi: fayl yuklash (video / thumbnail) ---------- */
  const videoUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, UPLOAD_DIR),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase().slice(0, 8);
        cb(null, Date.now() + "-" + crypto.randomBytes(4).toString("hex") + ext);
      },
    }),
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
    fileFilter: (req, file, cb) => {
      const kind = req.query.type === "thumb" ? "image" : "video";
      const name = String(file.originalname || "").toLowerCase();
      const ok =
        kind === "image"
          ? /\.(jpg|jpeg|png|webp)$/.test(name)
          : /\.(mp4|webm|mov)$/.test(name);
      if (!ok) {
        return cb(new Error(kind === "image" ? "Bu fayl turi qo‘llab-quvvatlanmaydi. Rasm: JPG, PNG, WEBP." : "Bu fayl turi qo‘llab-quvvatlanmaydi. Video: MP4, WebM, MOV."));
      }
      cb(null, true);
    },
  });

  r.post("/videos/upload", (req, res) => {
    const kind = req.query.type === "thumb" ? "thumb" : "video";
    videoUpload.single("file")(req, res, (err) => {
      if (err) {
        const msg =
          err.code === "LIMIT_FILE_SIZE"
            ? kind === "thumb"
              ? "Rasm hajmi ruxsat etilgan limitdan katta."
              : "Video hajmi ruxsat etilgan limitdan katta (maks. 200 MB)."
            : err.message;
        return res.status(400).json({ ok: false, error: msg });
      }
      if (!req.file) return res.status(400).json({ ok: false, error: "Fayl tanlanmadi." });
      res.json({
        ok: true,
        url: "/media/" + req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      });
    });
  });

  /* ---------- Generic CRUD: courses, teachers, results, videos, reviews ---------- */
  const entities = {
    courses: { label: "Kurslar", item: "Kurs", listFields: (x) => [x.title, x.description, x.teacher ?? "—"] },
    teachers: { label: "Ustozlar", item: "Ustoz", listFields: (x) => [x.full_name, x.position, x.specialties ?? "—"] },
    results: { label: "Natijalar", item: "Natija", listFields: (x) => [x.exam + " " + x.overall, x.student_name, x.teacher ?? "—"] },
    videos: { label: "Videolar", item: "Video", listFields: (x) => [x.title, x.student_name ?? "—", x.course ?? "—"] },
    reviews: { label: "Sharhlar", item: "Sharh", listFields: (x) => ["★".repeat(x.rating), x.name, x.text.slice(0, 60) + "…"] },
  };

  for (const [table, meta] of Object.entries(entities)) {
    r.get(`/${table}`, (req, res) => {
      const rows = listTableSafe(table);
      const head = table === "results" ? ["Imtihon / Ball", "O‘quvchi", "Ustoz"] : ["Asosiy", "Qo‘shimcha 1", "Qo‘shimcha 2"];
      const body = `
      <a class="btn-p btn-new" href="/admin/${table}/new">➕ Yangi qo‘shish</a>
      ${renderDataTable(
        ["#", head[0], head[1], head[2], "Holat", "Amallar"],
        rows.map((x, i) => [
          String(i + 1),
          `<b>${esc(meta.listFields(x)[0])}</b>`,
          esc(meta.listFields(x)[1]),
          esc(meta.listFields(x)[2]),
          x.published ? '<span class="pub pub--on">👁 Chop etilgan</span>' : '<span class="pub">🙈 Yashirilgan</span>',
          `<div class="actions">
            <a class="act" href="/admin/${table}/${x.id}/edit" aria-label="Tahrirlash" title="Tahrirlash">✏️ <span>Tahrirlash</span></a>
            <form method="post" action="/admin/${table}/${x.id}/toggle" class="inline"><input type="hidden" name="_csrf" value="${csrfToken(req)}"><button class="act" aria-label="Ko‘rish / yashirish" title="Ko‘rish / yashirish">👁 <span>Ko‘rish</span></button></form>
            <form method="post" action="/admin/${table}/${x.id}/move" class="inline"><input type="hidden" name="_csrf" value="${csrfToken(req)}"><input type="hidden" name="dir" value="-1"><button class="act act--icon" aria-label="Yuqoriga" title="Yuqoriga">↑</button></form>
            <form method="post" action="/admin/${table}/${x.id}/move" class="inline"><input type="hidden" name="_csrf" value="${csrfToken(req)}"><input type="hidden" name="dir" value="1"><button class="act act--icon" aria-label="Pastga" title="Pastga">↓</button></form>
            <form method="post" action="/admin/${table}/${x.id}/delete" class="inline" onsubmit="return confirm('Bu ma’lumotni o‘chirishni xohlaysizmi?')"><input type="hidden" name="_csrf" value="${csrfToken(req)}"><button class="act act--danger act--icon" aria-label="O‘chirish" title="O‘chirish">🗑</button></form>
          </div>`]),
        ["hide", "", "", "", "", "actions"]
      )}
      ${rows.length ? "" : `<div class="empty">Hozircha ma’lumot yo‘q. "➕ Yangi qo‘shish" tugmasini bosing.</div>`}`;
      res.send(page(meta.label, body, req, { active: table }));
    });

    r.get(`/${table}/new`, (req, res) => res.send(editForm(table, null, req)));
    r.get(`/${table}/:id/edit`, (req, res) => {
      const row = getRow(table, Number(req.params.id));
      if (!row) return res.redirect(`/admin/${table}`);
      res.send(editForm(table, row, req));
    });

    const save = (req, res) => {
      const id = Number(req.params.id) || null;
      const data = normalizeBody(req.body);
      data.published = req.body.published === "on" ? 1 : 0;
      if (table === "videos") data.featured = req.body.featured === "on" ? 1 : 0;
      if (table === "courses") data.show_price = req.body.show_price === "on" ? 1 : 0;

      if (table === "videos") {
        // Manbaga qarab validatsiya: faqat bitta faol manba saqlanadi
        if (data.source_type === "youtube") {
          const yt = String(data.video_url ?? "").trim();
          const re = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{6,}/i;
          if (!re.test(yt)) {
            return res.status(400).send(page("Xatolik", `<div class="card empty">❌ YouTube havolasi noto‘g‘ri. Masalan: https://www.youtube.com/watch?v=… yoki https://youtu.be/…<br><br><a class="btn-s" href="javascript:history.back()">Orqaga</a></div>`, req));
          }
          data.video_url = yt;
          data.file_url = null;
          data.video_file_name = null;
          data.video_file_size = null;
          data.video_duration = null;
        } else {
          data.source_type = "file";
          if (!data.file_url || !String(data.file_url).startsWith("/media/")) {
            return res.status(400).send(page("Xatolik", `<div class="card empty">❌ Video fayl yuklanmadi. Iltimos, "Video fayli" bo‘limida videoni yuklang.<br><br><a class="btn-s" href="javascript:history.back()">Orqaga</a></div>`, req));
          }
          data.video_url = null;
        }
      }

      if (id) {
        updateRow(table, TABLE_FIELDS[table], id, data);
        audit(req.admin.username, `${meta.item} tahrirlandi`, `#${id}`);
      } else {
        const max = dbGet(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM ${table}`).m;
        data.sort_order = max + 1;
        const newId = insertRow(table, TABLE_FIELDS[table], data);
        audit(req.admin.username, `${meta.item} qo‘shildi`, `#${newId}`);
      }
      res.redirect(`/admin/${table}`);
    };
    r.post(`/${table}/new`, checkCsrf, save);
    r.post(`/${table}/:id/edit`, checkCsrf, save);

    r.post(`/${table}/:id/toggle`, checkCsrf, (req, res) => {
      togglePublished(table, Number(req.params.id));
      audit(req.admin.username, `${meta.item} holati o‘zgardi`, `#${req.params.id}`);
      res.redirect(`/admin/${table}`);
    });
    r.post(`/${table}/:id/move`, checkCsrf, (req, res) => {
      moveRow(table, Number(req.params.id), Number(req.body.dir) || 0);
      res.redirect(`/admin/${table}`);
    });
    r.post(`/${table}/:id/delete`, checkCsrf, (req, res) => {
      deleteRow(table, Number(req.params.id));
      audit(req.admin.username, `${meta.item} o‘chirildi`, `#${req.params.id}`);
      res.redirect(`/admin/${table}`);
    });
  }

  /* ---------- Media (galereya) ---------- */
  r.get("/media", (req, res) => {
    const rows = listTableSafe("media");
    const cats = ["Building", "Classrooms", "Teachers", "Students", "Events", "Results", "Other"];
    const body = `
    <div class="card"><div class="card__head"><h2>⬆️ Rasm/video yuklash</h2></div>
      <form method="post" action="/admin/media/upload" enctype="multipart/form-data" class="form">
        <input type="hidden" name="_csrf" value="${csrfToken(req)}">
        <input type="file" name="file" accept=".jpg,.jpeg,.png,.webp,.avif,.mp4,.webm,.mov" required>
        <div class="row2">
          ${input("Sarlavha", "title", "")}
          <select name="category">${cats.map((c) => `<option>${c}</option>`).join("")}</select>
        </div>
        ${input("Alt matn", "alt", "")}
        <button class="btn-p">Yuklash</button>
      </form>
    </div>
    <div class="card">
      ${rows.length ? renderDataTable(
        ["Ko‘rinish", "Sarlavha", "Kategoriya", "Holat", "Amallar"],
        rows.map((m) => {
          const src = m.file_url.startsWith("/") ? m.file_url : "/" + m.file_url;
          return [
          m.file_url.match(/\.(mp4|webm|mov)$/i) ? `<a href="${esc(src)}" target="_blank">🎬 Video</a>` : `<img src="${esc(src)}" class="thumb" alt="${esc(m.title ?? "")}">`,
          `<b>${esc(m.title ?? m.original_name)}</b>`,
          esc(m.category),
          m.published ? '<span class="pub pub--on">👁 Chop etilgan</span>' : '<span class="pub">🙈 Yashirilgan</span>',
          `<div class="actions">
            <form method="post" action="/admin/media/${m.id}/toggle" class="inline"><input type="hidden" name="_csrf" value="${csrfToken(req)}"><button class="act" aria-label="Korish / yashirish" title="Korish / yashirish">👁 <span>Ko‘rish</span></button></form>
            <form method="post" action="/admin/media/${m.id}/move" class="inline"><input type="hidden" name="_csrf" value="${csrfToken(req)}"><input type="hidden" name="dir" value="-1"><button class="act act--icon" aria-label="Yuqoriga" title="Yuqoriga">↑</button></form>
            <form method="post" action="/admin/media/${m.id}/move" class="inline"><input type="hidden" name="_csrf" value="${csrfToken(req)}"><input type="hidden" name="dir" value="1"><button class="act act--icon" aria-label="Pastga" title="Pastga">↓</button></form>
            <form method="post" action="/admin/media/${m.id}/delete" class="inline" onsubmit="return confirm('Bu faylni ochirishni xohlaysizmi?')"><input type="hidden" name="_csrf" value="${csrfToken(req)}"><button class="act act--danger act--icon" aria-label="Ochirish" title="Ochirish">🗑</button></form>
          </div>`];
        }),
        ["", "", "", "", "actions"]
      ) : `<div class="empty">Galereya bosh.</div>`}
    </div>`;
    res.send(page("Galereya / Media", body, req, { active: "media" }));
  });

  r.post("/media/upload", checkCsrf, upload.single("file"), (req, res) => {
    if (!req.file) return res.redirect("/admin/media");
    const ext = path.extname(req.file.originalname).toLowerCase();
    const url = "/media/" + req.file.filename;
    const max = dbGet("SELECT COALESCE(MAX(sort_order), -1) AS m FROM media").m;
    insertRow("media", TABLE_FIELDS.media, {
      file_url: url,
      original_name: req.file.originalname,
      title: req.body.title || req.file.originalname,
      alt: req.body.alt || "",
      category: req.body.category || "Other",
      size: req.file.size,
      sort_order: max + 1,
      published: 1,
    });
    audit(req.admin.username, "Fayl yuklandi", req.file.originalname);
    res.redirect("/admin/media");
  });

  r.post("/media/:id/toggle", checkCsrf, (req, res) => { togglePublished("media", Number(req.params.id)); res.redirect("/admin/media"); });
  r.post("/media/:id/move", checkCsrf, (req, res) => { moveRow("media", Number(req.params.id), Number(req.body.dir) || 0); res.redirect("/admin/media"); });
  r.post("/media/:id/delete", checkCsrf, (req, res) => {
    const m = getRow("media", Number(req.params.id));
    if (m && m.file_url.startsWith("/media/")) {
      const p = path.join(UPLOAD_DIR, path.basename(m.file_url));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    deleteRow("media", Number(req.params.id));
    audit(req.admin.username, "Fayl o‘chirildi", m?.original_name ?? "");
    res.redirect("/admin/media");
  });

  /* ---------- Settings + SEO ---------- */
  r.get("/settings", (req, res) => {
    const seo = getSetting("seo");
    const general = getSetting("general");
    const body = `
    <div class="card"><div class="card__head"><h2>🌐 Umumiy</h2></div>
      <form method="post" action="/admin/settings/general" class="form">
        <input type="hidden" name="_csrf" value="${csrfToken(req)}">
        ${input("Sayt nomi", "siteName", general.siteName)}
        ${input("Til", "language", general.language)}
        <button class="btn-p">Saqlash</button>
      </form>
    </div>
    <div class="card"><div class="card__head"><h2>🔍 SEO</h2></div>
      <form method="post" action="/admin/settings/seo" class="form">
        <input type="hidden" name="_csrf" value="${csrfToken(req)}">
        ${input("Sayt sarlavhasi (title)", "title", seo.title)}
        ${textarea("Meta description", "description", seo.description)}
        ${input("OG rasm", "ogImage", seo.ogImage)}
        ${input("Favicon", "favicon", seo.favicon)}
        <button class="btn-p">Saqlash</button>
      </form>
    </div>`;
    res.send(page("Sozlamalar", body, req, { active: "settings" }));
  });
  r.post("/settings/general", checkCsrf, (req, res) => {
    setSetting("general", { ...getSetting("general"), ...normalizeBody(req.body) });
    audit(req.admin.username, "Umumiy sozlamalar saqlandi");
    res.redirect("/admin/settings");
  });
  r.post("/settings/seo", checkCsrf, (req, res) => {
    setSetting("seo", { ...getSetting("seo"), ...normalizeBody(req.body) });
    audit(req.admin.username, "SEO saqlandi");
    res.redirect("/admin/settings");
  });

  /* ---------- Audit ---------- */
  r.get("/audit", (req, res) => {
    const rows = listAudit(200);
    res.send(page("Audit log", rows.length ? renderDataTable(
      ["Kim", "Amal", "Tafsilot", "Vaqt"],
      rows.map((a) => [
        `<b>${esc(a.admin_username)}</b>`,
        esc(a.action),
        esc(a.details ?? "—"),
        esc(a.created_at),
      ]),
      ["", "", "", ""]
    ) + "" : `<div class="card"><div class="empty">Log bo‘sh.</div></div>`, req, { active: "audit" }));
  });

  /* ---------- Admin users (SUPER_ADMIN) ---------- */
  r.get("/users", requireSuper, (req, res) => {
    const users = dbAll("SELECT id, username, role, created_at FROM admin_users ORDER BY id");
    res.send(page("Admin foydalanuvchilar", `
    <div class="card"><div class="card__head"><h2>➕ Yangi admin</h2></div>
      <form method="post" action="/admin/users" class="form">
        <input type="hidden" name="_csrf" value="${csrfToken(req)}">
        <div class="row2">
          ${input("Login", "username", "")}
          <label class="fld">Rol<select name="role"><option>EDITOR</option><option>SUPER_ADMIN</option></select></label>
        </div>
        <div class="row2">
          <label class="fld">Parol<input type="password" name="password" required minlength="6"></label>
          <label class="fld">Parolni tasdiqlash<input type="password" name="password2" required></label>
        </div>
        <button class="btn-p">Qo‘shish</button>
      </form>
    </div>
    <div class="card">
      ${renderDataTable(
        ["Login", "Rol", "Yaratilgan", "Amallar"],
        users.map((u) => [
          `<b>${esc(u.username)}</b>`,
          esc(u.role),
          esc(u.created_at),
          u.username === req.admin.username
            ? '<span class="pub">—</span>'
            : `<form method="post" action="/admin/users/${u.id}/delete" class="inline" onsubmit="return confirm('O‘chirishni xohlaysizmi?')"><input type="hidden" name="_csrf" value="${csrfToken(req)}"><button class="act act--danger" aria-label="O‘chirish">🗑 <span>O‘chirish</span></button></form>`
        ]),
        ["", "", "", "actions"]
      )}
    </div>`, req, { active: "users" }));
  });

  r.post("/users", requireSuper, checkCsrf, (req, res) => {
    const { username, password, password2, role } = req.body ?? {};
    if (!username || String(username).length < 3) return res.redirect("/admin/users");
    if (!password || password !== password2) return res.redirect("/admin/users");
    if (dbGet("SELECT id FROM admin_users WHERE username = ?", [String(username).trim()])) {
      return res.redirect("/admin/users");
    }
    dbRun("INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)", [
      String(username).trim(),
      hashPassword(String(password)),
      role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "EDITOR",
    ]);
    audit(req.admin.username, "Yangi admin qo‘shildi", String(username));
    res.redirect("/admin/users");
  });

  r.post("/users/:id/delete", requireSuper, checkCsrf, (req, res) => {
    const u = dbGet("SELECT * FROM admin_users WHERE id = ?", [Number(req.params.id)]);
    if (u && u.username !== req.admin.username) {
      dbRun("DELETE FROM admin_users WHERE id = ?", [u.id]);
      audit(req.admin.username, "Admin o‘chirildi", u.username);
    }
    res.redirect("/admin/users");
  });

  return r;
}

/* ============================================================
   Yordamchilar
   ============================================================ */
import { STATUSES } from "./db.js";
import { listTable } from "./cms-db.js";
function listTableSafe(table) {
  return listTable(table);
}
function statusBadge(status) {
  const s = STATUSES[status];
  return `<span class="pub">${s ? s.emoji + " " + s.label : status}</span>`;
}
function input(label, name, value) {
  return `<label class="fld">${esc(label)}<input type="text" name="${esc(name)}" value="${esc(value ?? "")}"></label>`;
}
function textarea(label, name, value) {
  return `<label class="fld">${esc(label)}<textarea name="${esc(name)}" rows="3">${esc(value ?? "")}</textarea></label>`;
}
/** checkbox -> 1/0, arrays (stats[i][field]) -> obyekt ro'yxati */
function normalizeBody(body) {
  const out = {};
  for (const [key, value] of Object.entries(body ?? {})) {
    if (key === "_csrf") continue;
    if (key === "published" || key === "featured" || key === "show_price") continue;
    const m = key.match(/^(\w+)\[(\d+)\]\[(\w+)\]$/);
    if (m) {
      const [, arr, idx, field] = m;
      out[arr] = out[arr] ?? [];
      out[arr][Number(idx)] = out[arr][Number(idx)] ?? {};
      out[arr][Number(idx)][field] = value === "on" ? true : value;
      continue;
    }
    out[key] = value;
  }
  // checkbox "visible" yo'q bo'lsa false
  for (const key of ["stats", "features", "hours"]) {
    if (out[key]) {
      out[key] = out[key].filter(Boolean).map((o) => ({ ...o, visible: Boolean(o.visible) }));
    }
  }
  return out;
}
function editForm(table, row, req) {
  if (table === "videos") return videoForm(row, req);
  const v = row ?? {};
  const isEdit = Boolean(row);
  const fields = {
    courses: `
      ${input("Kurs nomi", "title", v.title)}
      ${textarea("Qisqa tavsif", "description", v.description)}
      ${textarea("To‘liq tavsif (ixtiyoriy)", "full_description", v.full_description)}
      <div class="row2">
        <label class="fld">Ikona<select name="icon">
          ${["book", "star", "check", "school", "book2"].map((o) => `<option ${v.icon === o ? "selected" : ""}>${o}</option>`).join("")}
        </select></label>
        ${input("Rasm URL (ixtiyoriy)", "image_url", v.image_url)}
      </div>
      <div class="row2">
        ${input("Davomiylik (ixtiyoriy)", "duration", v.duration)}
        ${input("Jadval (ixtiyoriy)", "schedule", v.schedule)}
      </div>
      <div class="row2">
        ${input("Narx (ixtiyoriy)", "price", v.price)}
        <label class="chk"><input type="checkbox" name="show_price" ${v.show_price ? "checked" : ""}> Narxni saytda ko‘rsatish</label>
      </div>
      ${input("Ustoz (ixtiyoriy)", "teacher", v.teacher)}
      ${input("CTA matni", "cta_text", v.cta_text ?? "Batafsil ma’lumot")}`,
    teachers: `
      ${input("F.I.Sh", "full_name", v.full_name)}
      ${input("Lavozim", "position", v.position)}
      ${textarea("Biografiya (ixtiyoriy)", "biography", v.biography)}
      ${input("Rasm URL (ixtiyoriy)", "photo_url", v.photo_url)}
      <div class="row2">
        ${input("Yo‘nalishlar", "specialties", v.specialties)}
        ${input("IELTS ball (tasdiqlangan bo‘lsa)", "ielts_score", v.ielts_score)}
      </div>`,
    results: `
      <div class="row2">
        <label class="fld">Imtihon<select name="exam">${["IELTS", "CEFR", "SAT", "English", "Other"].map((o) => `<option ${v.exam === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>
        ${input("O‘quvchi ismi", "student_name", v.student_name)}
      </div>
      ${input("Umumiy ball", "overall", v.overall)}
      <div class="row4">
        ${input("Listening", "listening", v.listening)}
        ${input("Reading", "reading", v.reading)}
        ${input("Writing", "writing", v.writing)}
        ${input("Speaking", "speaking", v.speaking)}
      </div>
      <div class="row2">
        ${input("Sana (YYYY-MM-DD)", "result_date", v.result_date)}
        ${input("Ustoz", "teacher", v.teacher)}
      </div>
      ${textarea("Tavsif (ixtiyoriy)", "description", v.description)}
      ${input("O‘quvchi rasmi URL (ixtiyoriy)", "photo_url", v.photo_url)}`,
    videos: null, // maxsus forma: videoForm()
    reviews: `
      <div class="row2">
        ${input("Ism", "name", v.name)}
        <label class="fld">Baho<select name="rating">${[5, 4, 3, 2, 1].map((n) => `<option ${v.rating === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      </div>
      ${textarea("Sharh matni", "text", v.text)}
      <div class="row2">
        <label class="fld">Manba<select name="source">${["Google Maps", "Telegram", "Instagram", "Sayt", "Boshqa"].map((o) => `<option ${v.source === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>
        ${input("Sana", "review_date", v.review_date)}
      </div>
      <p class="hint">⚠️ Faqat haqiqiy sharhlarni qo‘shing.</p>`,
  }[table];

  const action = isEdit ? `/admin/${table}/${row.id}/edit` : `/admin/${table}/new`;
  return page(
    (isEdit ? "Tahrirlash" : "Yangi qo‘shish") + " — " + table,
    `<div class="card"><form method="post" action="${action}" class="form">
      <input type="hidden" name="_csrf" value="${csrfToken(req)}">
      ${fields}
      <label class="chk"><input type="checkbox" name="published" ${isEdit ? (row.published ? "checked" : "") : "checked"}> 👁 Chop etilgan (saytda ko‘rinadi)</label>
      <div class="row2">
        <button class="btn-p">Saqlash</button>
        <a class="btn-s" href="/admin/${table}">Bekor qilish</a>
      </div>
    </form></div>`,
    req,
    { active: table }
  );
}

/** Video maxsus formasi — dinamik manba, real yuklash, preview */
function videoForm(row, req) {
  const v = row ?? {};
  const csrf = csrfToken(req);
  const isEdit = Boolean(row);
  const sourceType = v.source_type === "youtube" ? "youtube" : "file";
  const courseOptions = listTableSafe("courses")
    .map((c) => `<option ${v.course === c.title ? "selected" : ""}>${esc(c.title)}</option>`)
    .join("");

  const state = JSON.stringify({
    source: sourceType,
    fileUrl: v.file_url ?? "",
    fileName: v.video_file_name ?? "",
    fileSize: v.video_file_size ?? 0,
    duration: v.video_duration ?? "",
    thumbUrl: v.thumbnail_url ?? "",
    thumbName: "",
    thumbSize: 0,
    thumbW: 0,
    thumbH: 0,
  });

  return page(
    (isEdit ? "Video tahrirlash" : "Yangi video") ,
    `<div class="card"><form method="post" action="${isEdit ? `/admin/videos/${v.id}/edit` : "/admin/videos/new"}" class="form" id="videoForm">
      <input type="hidden" name="_csrf" value="${csrf}">
      <input type="hidden" name="source_type" id="f_source" value="${sourceType}">
      <input type="hidden" name="file_url" id="f_fileUrl" value="${esc(v.file_url ?? "")}">
      <input type="hidden" name="video_file_name" id="f_fileName" value="${esc(v.video_file_name ?? "")}">
      <input type="hidden" name="video_file_size" id="f_fileSize" value="${esc(v.video_file_size ?? "")}">
      <input type="hidden" name="video_duration" id="f_duration" value="${esc(v.video_duration ?? "")}">
      <input type="hidden" name="thumbnail_url" id="f_thumbUrl" value="${esc(v.thumbnail_url ?? "")}">

      ${input("Video nomi", "title", v.title)}
      <div class="row2">
        ${input("O‘quvchi ismi (ixtiyoriy)", "student_name", v.student_name)}
        ${input("Natija (masalan IELTS 8.5)", "result", v.result)}
      </div>
      ${textarea("Tavsif", "description", v.description)}

      <label class="fld">Manba
        <select name="source_ui" id="sourceSelect">
          <option value="youtube" ${sourceType === "youtube" ? "selected" : ""}>YouTube</option>
          <option value="file" ${sourceType === "file" ? "selected" : ""}>Yuklangan video</option>
        </select>
      </label>

      <div id="ytSection" style="display:none">
        <label class="fld">YouTube URL<input type="text" name="video_url" id="ytUrl" value="${esc(v.video_url ?? "")}" placeholder="https://youtube.com/watch?v=… yoki https://youtu.be/…"></label>
        <p class="hint" id="ytError" style="display:none"></p>
        <div id="ytPreview" style="margin-top:8px"></div>
      </div>

      <div id="fileSection" style="display:none">
        <h3 style="font-family:Sora,sans-serif;font-size:15px;margin:4px 0 8px">🎬 Video fayli</h3>
        <div class="drop" id="videoDrop" tabindex="0">
          <div class="drop__icon">📤</div>
          <div class="drop__title">Faylni shu yerga tashlang</div>
          <div class="drop__sub">yoki tanlang · MP4, WebM, MOV · maks. 200 MB</div>
          <button type="button" class="btn-p" id="videoPick">📤 Video yuklash</button>
          <input type="file" id="videoInput" accept=".mp4,.webm,.mov" hidden>
        </div>
        <div id="videoProgress" class="up-progress" style="display:none">
          <div class="up-progress__label">⏳ Video yuklanmoqda… <span id="videoPct">0%</span></div>
          <div class="up-bar"><div class="up-bar__fill" id="videoBar"></div></div>
        </div>
        <div id="videoStatus" class="up-status" style="display:none">
          <div class="up-status__head">✅ Video yuklandi</div>
          <div id="videoMeta" class="up-status__meta"></div>
          <div id="videoPlayer" class="up-status__player"></div>
          <div class="row2" style="margin-top:10px">
            <button type="button" class="btn-s" id="videoReplace">Almashtirish</button>
            <button type="button" class="btn-sm btn-danger" id="videoRemove">O‘chirish</button>
          </div>
          <p class="hint" id="videoPath"></p>
        </div>
        <div id="videoError" class="up-error" style="display:none"></div>
      </div>

      <h3 style="font-family:Sora,sans-serif;font-size:15px;margin:8px 0 4px">🖼 Video thumbnail</h3>
      <div class="drop drop--thumb" id="thumbDrop" tabindex="0">
        <div id="thumbEmpty">
          <div class="drop__icon">🖼</div>
          <div class="drop__title">Rasmni shu yerga tashlang</div>
          <div class="drop__sub">yoki tanlang · JPG, PNG, WEBP</div>
          <button type="button" class="btn-p" id="thumbPick">📤 Thumbnail yuklash</button>
        </div>
        <input type="file" id="thumbInput" accept=".jpg,.jpeg,.png,.webp" hidden>
        <div id="thumbPreview" class="thumb-preview" style="display:none">
          <img id="thumbImg" src="" alt="Thumbnail">
          <div id="thumbMeta" class="up-status__meta"></div>
          <div class="row2" style="margin-top:8px">
            <button type="button" class="btn-s" id="thumbReplace">Almashtirish</button>
            <button type="button" class="btn-sm btn-danger" id="thumbRemove">O‘chirish</button>
          </div>
        </div>
        <div id="thumbProgress" class="up-progress" style="display:none">
          <div class="up-progress__label">⏳ Thumbnail yuklanmoqda… <span id="thumbPct">0%</span></div>
          <div class="up-bar"><div class="up-bar__fill" id="thumbBar"></div></div>
        </div>
        <div id="thumbError" class="up-error" style="display:none"></div>
      </div>

      <div class="row2">
        <label class="fld">Kategoriya / Kurs
          <select name="course"><option value="">—</option>${courseOptions}</select>
        </label>
        <label class="chk" style="align-self:end;padding-bottom:12px"><input type="checkbox" name="featured" ${v.featured ? "checked" : ""}> ⭐ Asosiy video</label>
      </div>
      <label class="chk"><input type="checkbox" name="published" ${isEdit ? (v.published ? "checked" : "") : "checked"}> 👁 Chop etilgan (saytda ko‘rinadi)</label>
      <p class="up-error" id="formError" style="display:none"></p>
      <div class="row2">
        <button class="btn-p" id="saveBtn">Saqlash</button>
        <a class="btn-s" href="/admin/videos">Bekor qilish</a>
      </div>
    </form></div>

    <script>
    (function(){
      var S = ${state};
      var MAX_VIDEO = 200 * 1024 * 1024;
      var MAX_THUMB = 10 * 1024 * 1024;

      var $ = function(id){ return document.getElementById(id); };
      function show(id, on){ $(id).style.display = on ? "" : "none"; }
      function fmtSize(b){
        if (!b) return "";
        if (b >= 1048576) return (b/1048576).toFixed(1) + " MB";
        return Math.round(b/1024) + " KB";
      }
      function ext(name){ return (name.match(/\\.[^.]+$/) || [""])[0].toLowerCase(); }

      /* ---- Manba almashtirish ---- */
      function applySource(){
        var src = $("sourceSelect").value;
        S.source = src;
        $("f_source").value = src;
        show("ytSection", src === "youtube");
        show("fileSection", src === "file");
      }
      $("sourceSelect").addEventListener("change", applySource);

      /* ---- YouTube ---- */
      function ytId(url){
        var m = url.match(/(?:youtube\\.com\\/(?:watch\\?v=|shorts\\/)|youtu\\.be\\/)([\\w-]{6,})/);
        return m ? m[1] : null;
      }
      function ytCheck(){
        var url = $("ytUrl").value.trim();
        var id = url ? ytId(url) : null;
        var err = $("ytError");
        if (!url) { show("ytError", false); show("ytPreview", false); return true; }
        if (!id) {
          err.textContent = "❌ YouTube havolasi noto‘g‘ri. Masalan: https://www.youtube.com/watch?v=…";
          show("ytError", true); show("ytPreview", false);
          return false;
        }
        show("ytError", false);
        $("ytPreview").innerHTML = '<iframe width="420" height="236" style="max-width:100%;border:0;border-radius:10px" src="https://www.youtube.com/embed/' + id + '" title="YouTube preview" allowfullscreen></iframe>';
        show("ytPreview", true);
        return true;
      }
      $("ytUrl").addEventListener("input", ytCheck);

      /* ---- Umumiy yuklash (XHR progress bilan) ---- */
      function upload(file, kind, onProgress, onDone, onFail){
        var fd = new FormData();
        fd.append("file", file);
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/videos/upload?type=" + kind);
        xhr.upload.addEventListener("progress", function(e){
          if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
        });
        xhr.onload = function(){
          try {
            var r = JSON.parse(xhr.responseText);
            if (xhr.status === 200 && r.ok) onDone(r);
            else onFail(r.error || "Yuklashda xatolik");
          } catch(e){ onFail("Yuklashda xatolik"); }
        };
        xhr.onerror = function(){ onFail("Tarmoq xatosi — qayta urinib ko‘ring"); };
        xhr.send(fd);
      }

      /* ---- Video fayli ---- */
      function renderVideo(){
        var has = S.fileUrl && S.source === "file";
        show("videoStatus", has);
        show("videoDrop", !has);
        if (!has) return;
        $("videoMeta").innerHTML =
          "🎥 <b>" + escHtml(S.fileName) + "</b><br>" + fmtSize(S.fileSize) +
          (S.duration ? " · " + S.duration : "");
        $("videoPlayer").innerHTML = '<video controls preload="metadata" style="width:100%;max-width:420px;border-radius:10px;margin-top:8px" src="' + S.fileUrl + '"></video>';
        $("videoPath").textContent = "Saqlash joyi: " + S.fileUrl;
        $("f_fileUrl").value = S.fileUrl;
        $("f_fileName").value = S.fileName;
        $("f_fileSize").value = S.fileSize;
        $("f_duration").value = S.duration;
      }
      function escHtml(s){ var map = {"&":"&amp;","<":"&lt;",">":"&gt;"}; map[String.fromCharCode(34)] = "&quot;"; map["'"] = "&#39;"; return String(s).replace(/[&<>"']/g, function(c){ return map[c]; }); }

      function pickVideo(){ $("videoInput").click(); }
      $("videoPick").addEventListener("click", pickVideo);
      $("videoReplace").addEventListener("click", pickVideo);
      $("videoRemove").addEventListener("click", function(){
        S.fileUrl = ""; S.fileName = ""; S.fileSize = 0; S.duration = "";
        renderVideo();
      });
      $("videoInput").addEventListener("change", function(){
        if (this.files[0]) handleVideo(this.files[0]);
        this.value = "";
      });
      function handleVideo(file){
        var ok = ["mp4","webm","mov"].indexOf(ext(file.name).slice(1)) >= 0;
        var errEl = $("videoError");
        if (!ok) { errEl.textContent = "❌ Bu fayl turi qo‘llab-quvvatlanmaydi. Video: MP4, WebM, MOV."; show("videoError", true); return; }
        if (file.size > MAX_VIDEO) { errEl.textContent = "❌ Video hajmi ruxsat etilgan limitdan katta (maks. 200 MB)."; show("videoError", true); return; }
        show("videoError", false);
        show("videoProgress", true); show("videoStatus", false); show("videoDrop", false);
        upload(file, "video",
          function(p){ $("videoPct").textContent = p + "%"; $("videoBar").style.width = p + "%"; },
          function(r){
            S.fileUrl = r.url; S.fileName = r.originalName; S.fileSize = r.size;
            show("videoProgress", false);
            renderVideo();
            // davomiylikni olish
            var v = document.createElement("video");
            v.preload = "metadata";
            v.src = S.fileUrl;
            v.onloadedmetadata = function(){
              var d = Math.round(v.duration);
              var mm = String(Math.floor(d/60)).padStart(2,"0");
              var ss = String(d%60).padStart(2,"0");
              S.duration = mm + ":" + ss;
              renderVideo();
            };
          },
          function(msg){
            show("videoProgress", false);
            renderVideo();
            errEl.innerHTML = "❌ Video yuklanmadi — " + escHtml(msg) + ' <button type="button" class="btn-sm" onclick="window.__retryVideo()">Qayta urinish</button>';
            show("videoError", true);
            window.__retryVideo = pickVideo;
          });
      }
      ["dragover","dragenter"].forEach(function(ev){
        $("videoDrop").addEventListener(ev, function(e){ e.preventDefault(); this.classList.add("drop--over"); });
      });
      ["dragleave","drop"].forEach(function(ev){
        $("videoDrop").addEventListener(ev, function(e){ e.preventDefault(); this.classList.remove("drop--over"); });
      });
      $("videoDrop").addEventListener("drop", function(e){
        if (e.dataTransfer.files[0]) handleVideo(e.dataTransfer.files[0]);
      });

      /* ---- Thumbnail ---- */
      function renderThumb(){
        var has = S.thumbUrl;
        show("thumbEmpty", !has);
        show("thumbPreview", has);
        if (!has) return;
        $("thumbImg").src = S.thumbUrl;
        $("thumbMeta").innerHTML =
          (S.thumbName ? "<b>" + escHtml(S.thumbName) + "</b><br>" : "") +
          (S.thumbSize ? fmtSize(S.thumbSize) + "<br>" : "") +
          (S.thumbW ? S.thumbW + " × " + S.thumbH : "");
        $("f_thumbUrl").value = S.thumbUrl;
      }
      function pickThumb(){ $("thumbInput").click(); }
      $("thumbPick").addEventListener("click", pickThumb);
      $("thumbReplace").addEventListener("click", pickThumb);
      $("thumbRemove").addEventListener("click", function(){
        S.thumbUrl = ""; S.thumbName = ""; S.thumbSize = 0; S.thumbW = 0; S.thumbH = 0;
        renderThumb();
      });
      $("thumbInput").addEventListener("change", function(){
        if (this.files[0]) handleThumb(this.files[0]);
        this.value = "";
      });
      function handleThumb(file){
        var ok = ["jpg","jpeg","png","webp"].indexOf(ext(file.name).slice(1)) >= 0;
        var errEl = $("thumbError");
        if (!ok) { errEl.textContent = "❌ Bu fayl turi qo‘llab-quvvatlanmaydi. Rasm: JPG, PNG, WEBP."; show("thumbError", true); return; }
        if (file.size > MAX_THUMB) { errEl.textContent = "❌ Rasm hajmi ruxsat etilgan limitdan katta (maks. 10 MB)."; show("thumbError", true); return; }
        show("thumbError", false);
        show("thumbProgress", true);
        upload(file, "thumb",
          function(p){ $("thumbPct").textContent = p + "%"; $("thumbBar").style.width = p + "%"; },
          function(r){
            S.thumbUrl = r.url; S.thumbName = r.originalName; S.thumbSize = r.size;
            show("thumbProgress", false);
            renderThumb();
            var img = new Image();
            img.onload = function(){ S.thumbW = img.naturalWidth; S.thumbH = img.naturalHeight; renderThumb(); };
            img.src = S.thumbUrl;
          },
          function(msg){ show("thumbProgress", false); errEl.textContent = "❌ " + msg; show("thumbError", true); });
      }
      ["dragover","dragenter"].forEach(function(ev){
        $("thumbDrop").addEventListener(ev, function(e){ e.preventDefault(); this.classList.add("drop--over"); });
      });
      ["dragleave","drop"].forEach(function(ev){
        $("thumbDrop").addEventListener(ev, function(e){ e.preventDefault(); this.classList.remove("drop--over"); });
      });
      $("thumbDrop").addEventListener("drop", function(e){
        if (e.dataTransfer.files[0]) handleThumb(e.dataTransfer.files[0]);
      });

      /* ---- Saqlash validatsiyasi ---- */
      $("videoForm").addEventListener("submit", function(e){
        var src = $("sourceSelect").value;
        if (src === "youtube" && !ytCheck()) { e.preventDefault(); return; }
        if (src === "youtube" && !$("ytUrl").value.trim()) {
          e.preventDefault();
          var er = $("ytError");
          er.textContent = "❌ YouTube havolasini kiriting yoki manbani 'Yuklangan video' ga o‘zgartiring.";
          show("ytError", true);
          return;
        }
        if (src === "file" && !S.fileUrl) {
          e.preventDefault();
          var fe = $("formError");
          fe.textContent = "❌ Video fayl yuklanmadi. Iltimos, videoni yuklang yoki manbani YouTube'ga o‘zgartiring.";
          show("formError", true);
          return;
        }
        var b = $("saveBtn");
        b.disabled = true; b.textContent = "Saqlanmoqda…";
      });

      /* ---- Boshlang'ich holat ---- */
      applySource();
      renderVideo();
      renderThumb();
      ytCheck();
    })();
    </script>`,
    req,
    { active: "videos" }
  );
}

function renderLogin(error = "") {
  return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kirish — ADMIRE L.C. Admin</title><meta name="robots" content="noindex">
<link rel="icon" type="image/png" href="/assets/img/logo.png">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>${LOGIN_CSS}</style></head>
<body><div class="wrap">
  <div class="card">
    <div class="brand"><img src="/assets/img/logo.png" alt="ADMIRE logotipi"><span>ADMIRE <em>L.C.</em></span></div>
    <p class="sub">Admin panelga kirish</p>
    <form method="post" action="/admin/login" id="loginForm">
      <label>Login<input type="text" name="username" autocomplete="username" required></label>
      <label class="pw">Parol<input type="password" name="password" id="pw" autocomplete="current-password" required>
        <button type="button" class="eye" id="eye" aria-label="Parolni ko‘rsatish">👁</button></label>
      <label class="chk"><input type="checkbox" name="remember"> Sessionni eslab qolish</label>
      <p class="err">${esc(error)}</p>
      <button class="btn" id="submit">Kirish</button>
    </form>
  </div>
</div>
<script>
document.getElementById('eye').addEventListener('click', function(){
  var p = document.getElementById('pw');
  p.type = p.type === 'password' ? 'text' : 'password';
});
document.getElementById('loginForm').addEventListener('submit', function(){
  var b = document.getElementById('submit');
  b.disabled = true; b.textContent = 'Kirilyapti…';
});
</script>
</body></html>`;
}

/* ---------- CSS ---------- */
const ADMIN_CSS = `
*{box-sizing:border-box;margin:0}
:root{font-family:Inter,system-ui,sans-serif;--navy:#0c1330;--blue:#1d6fe0;--line:#e6e9f0;--muted:#5b6478}
body{background:#f4f6fb;color:#1a2138;font-size:15px}
a{color:inherit;text-decoration:none}
.layout{display:flex;min-height:100vh}
.side{width:250px;background:var(--navy);color:#fff;padding:20px 14px;display:flex;flex-direction:column;gap:6px;position:sticky;top:0;height:100vh;flex-shrink:0}
.side__brand{display:flex;align-items:center;gap:10px;font-family:Sora,sans-serif;font-weight:800;font-size:17px;margin-bottom:18px}
.side__brand img{width:38px;height:38px;border-radius:10px;background:#fff;padding:3px}
.side__brand em{font-style:normal;color:#7db4ff}
.side__nav{display:flex;flex-direction:column;gap:2px;flex:1;overflow-y:auto}
.side__link{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;color:rgba(255,255,255,.75);font-size:14px;font-weight:500}
.side__link:hover{background:rgba(255,255,255,.08);color:#fff}
.side__link--active{background:rgba(29,111,224,.4);color:#fff;font-weight:600}
.side__logout{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:10px;padding:9px;cursor:pointer;width:100%}
.main{flex:1;min-width:0}
.topbar{display:flex;align-items:center;gap:14px;padding:16px 26px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}
.topbar h1{font-size:19px;font-family:Sora,sans-serif;flex:1}
.topbar__user{font-size:13px;color:var(--muted)}
.topbar__preview{font-size:13px;color:var(--blue);font-weight:600}
.topbar__burger{display:none;background:none;border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-size:16px;cursor:pointer}
.content{padding:26px;max-width:1200px}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px}
a.card.stat{display:flex;flex-direction:column;gap:4px;transition:transform .15s,box-shadow .15s}
a.card.stat:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(12,19,48,.08)}
.stat__icon{font-size:22px}
.stat__value{font-family:Sora,sans-serif;font-size:26px;font-weight:800;color:var(--navy)}
.stat__label{font-size:13px;color:var(--muted)}
.card__head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.card__head h2{font-size:16px;font-family:Sora,sans-serif}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
table{width:100%;border-collapse:collapse;font-size:13.5px}
th{text-align:left;padding:9px 10px;background:#f0f3fa;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
td{padding:9px 10px;border-top:1px solid var(--line);vertical-align:top}
.msg{max-width:200px}
.filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
.filters input,.filters select{padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:#fff}
.btn-p{background:var(--blue);color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:600;cursor:pointer}
.btn-s{background:#e8f0fc;color:#1558b4;border-radius:10px;padding:10px 18px;font-weight:600;text-decoration:none;display:inline-block}
.btn-sm{background:#eef1f8;border:1px solid var(--line);border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12.5px;text-decoration:none;display:inline-block}
.btn-danger{background:#fdecec;color:#c22;border-color:#f5c6c6}
.pub{font-size:12px;color:var(--muted)}
.pub--on{color:#1d8a4b;font-weight:600}
.empty{color:var(--muted);padding:26px;text-align:center;background:#f8f9fd;border-radius:12px;border:1px dashed var(--line)}
.form{display:flex;flex-direction:column;gap:12px}
.fld{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:600;color:var(--navy);flex:1}
.fld input,.fld textarea,.fld select{padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;font:inherit;font-weight:400;background:#fafbfe}
.fld input:focus,.fld textarea:focus{outline:none;border-color:var(--blue)}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;align-items:end}
.row4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.chk{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:500;color:var(--navy)}
.quick{display:flex;gap:8px;flex-wrap:wrap}
.audit-mini{list-style:none;display:flex;flex-direction:column;gap:8px;font-size:13.5px}
.audit-mini small{color:var(--muted);margin-left:6px}
.actions{display:flex;gap:5px;flex-wrap:wrap;align-items:center}
.inline{display:inline}
.act{
  display:inline-flex;align-items:center;gap:5px;
  background:#eef1f8;border:1px solid var(--line);border-radius:9px;
  padding:7px 12px;min-height:38px;cursor:pointer;font-size:12.5px;font-weight:600;
  color:var(--ink);text-decoration:none;font-family:inherit
}
.act:hover{background:#e2e8f4}
.act--danger{background:#fdecec;color:#c22;border-color:#f5c6c6}
.act--danger:hover{background:#f9dada}
.act span{font-weight:600}
/* ---------- Responsive data-table: mobil = kartalar ---------- */
.tbl{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(12,19,48,.06);margin-top:14px}
.data-table{width:100%;border-collapse:collapse;font-size:13.5px}
.data-table th{text-align:left;padding:11px 14px;background:#f0f3fa;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.data-table td{padding:11px 14px;border-top:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere;word-break:normal;white-space:normal}
.data-table td b{color:var(--navy)}
@media(min-width:769px){
  .act span{display:none}
  .act{min-height:34px;padding:6px 10px}
  .btn-new{display:inline-block;margin-bottom:14px}
}
@media(max-width:768px){
  .tbl{background:transparent;border:0;box-shadow:none;border-radius:0;overflow:visible}
  .data-table thead{display:none}
  .data-table, .data-table tbody, .data-table tr, .data-table td{display:block;width:100%}
  .data-table tr{
    background:#fff;border:1px solid var(--line);border-radius:14px;
    padding:14px 16px;margin-bottom:14px;box-shadow:0 2px 8px rgba(12,19,48,.05)
  }
  .data-table td{
    border-top:0;border-bottom:1px dashed var(--line);
    padding:9px 0;display:flex;gap:14px;justify-content:space-between;align-items:flex-start
  }
  .data-table tr td:last-child{border-bottom:0;padding-bottom:0}
  .data-table tr td:first-child{padding-top:0}
  .data-table td::before{
    content:attr(data-label);
    font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
    color:var(--muted);flex-shrink:0;max-width:42%;padding-top:2px
  }
  .data-table td.cell-index::before{display:none}
  .data-table td.cell-index{font-family:Sora,sans-serif;font-weight:700;color:#9aa3b8;font-size:13px;margin-bottom:2px}
  .data-table td.cell-actions::before{align-self:center}
  .data-table td.cell-actions .actions{flex-wrap:wrap;justify-content:flex-start;gap:8px;width:100%}
  .data-table td.cell-actions .act{min-height:44px;padding:10px 14px;font-size:13.5px}
  .data-table td.cell-actions form.inline{flex:1;min-width:130px}
  .data-table td.cell-actions form.inline .act{width:100%;justify-content:center}
  .data-table select{min-height:44px;font-size:14px;width:100%}
  .thumb{width:88px;height:60px}
  .btn-new{display:flex;width:100%;justify-content:center;min-height:48px;align-items:center;margin-bottom:16px}
  .filters{flex-direction:column;align-items:stretch}
  .filters input,.filters select{width:100%;min-height:46px;font-size:15px}
  .filters .btn-p,.filters .btn-s{width:100%;text-align:center;min-height:46px;display:flex;justify-content:center;align-items:center}
  .topbar{flex-wrap:wrap;row-gap:6px}
  .topbar h1{font-size:16px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .topbar__preview{font-size:13px;padding:8px 10px;border:1px solid var(--line);border-radius:9px}
  .topbar__user{display:none}
}
@media(max-width:480px){
  .content{padding:12px}
  .card{padding:14px}
  .data-table td{flex-direction:column;gap:4px}
  .data-table td::before{max-width:100%}
  .data-table td.cell-actions{flex-direction:row;flex-wrap:wrap}
  .row2,.row3,.row4{grid-template-columns:1fr}
}
.thumb{width:64px;height:44px;object-fit:cover;border-radius:8px}
.hint{font-size:12.5px;color:var(--muted)}
.drop{border:2px dashed #c9d2e3;border-radius:14px;padding:26px;text-align:center;background:#fafbfe;transition:border-color .2s,background .2s;margin-bottom:6px}
.drop--over{border-color:var(--blue);background:var(--blue-soft, #e8f0fc)}
.drop__icon{font-size:26px;margin-bottom:4px}
.drop__title{font-weight:600;color:var(--navy)}
.drop__sub{font-size:12.5px;color:var(--muted);margin:4px 0 12px}
.up-progress{margin:10px 0}
.up-progress__label{font-size:13.5px;font-weight:600;color:var(--navy);margin-bottom:6px}
.up-bar{height:10px;background:#e8ecf5;border-radius:999px;overflow:hidden}
.up-bar__fill{height:100%;width:0;background:var(--blue);border-radius:999px;transition:width .2s}
.up-status{border:1px solid #d6e6d8;background:#f2faf4;border-radius:14px;padding:16px}
.up-status__head{font-weight:700;color:#1d8a4b;margin-bottom:8px}
.up-status__meta{font-size:13.5px;color:var(--ink);line-height:1.7}
.up-error{color:#c0392b;font-size:13.5px;font-weight:600;margin:8px 0}
.thumb-preview img{max-width:280px;max-height:160px;border-radius:10px;display:block;margin-bottom:8px}
@media(max-width:1024px){.cards{grid-template-columns:repeat(2,1fr)}.grid2{grid-template-columns:1fr}}
@media(max-width:820px){
  .side{position:fixed;left:-260px;z-index:50;transition:left .25s}
  .side--open{left:0}
  .topbar__burger{display:block}
  .row2,.row3,.row4{grid-template-columns:1fr}
  .content{padding:16px}
  table{display:block;overflow-x:auto}
}`;

const LOGIN_CSS = `
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,sans-serif;background:radial-gradient(900px 500px at 80% -10%,rgba(29,111,224,.35),transparent),#0c1330;min-height:100vh;display:grid;place-items:center}
.wrap{width:100%;display:grid;place-items:center;padding:20px}
.card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);backdrop-filter:blur(14px);border-radius:20px;padding:38px;width:min(400px,92vw);color:#fff;box-shadow:0 24px 70px rgba(0,0,0,.4)}
.brand{display:flex;align-items:center;gap:12px;font-family:Sora,sans-serif;font-weight:800;font-size:22px}
.brand img{width:46px;height:46px;border-radius:12px;background:#fff;padding:3px}
.brand em{font-style:normal;color:#7db4ff}
.sub{color:rgba(255,255,255,.65);font-size:14px;margin:8px 0 22px}
label{display:block;font-size:13px;font-weight:600;margin-bottom:14px;color:rgba(255,255,255,.85)}
input[type=text],input[type=password]{width:100%;margin-top:6px;padding:12px 14px;border-radius:11px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:15px}
input:focus{outline:none;border-color:#7db4ff}
.pw{position:relative;display:block}
.eye{position:absolute;right:10px;bottom:9px;background:none;border:0;cursor:pointer;font-size:15px}
.chk{display:flex;align-items:center;gap:8px;font-weight:500}
.err{color:#ffb3b3;font-size:13px;min-height:1em;margin:4px 0}
.btn{width:100%;padding:13px;border:0;border-radius:12px;background:#1d6fe0;color:#fff;font-weight:700;font-size:15px;cursor:pointer}
.btn:hover{background:#1558b4}
.btn:disabled{opacity:.6}
`;
