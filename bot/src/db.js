import initSqlJs from "sql.js";
import path from "node:path";
import fs from "node:fs";
import { config, ROOT } from "./config.js";

/*
 * Ikki xil saqlash rejimi:
 *  1) FILE (default, lokal dev): sql.js → bot/data/admire.db fayli.
 *  2) POSTGRES (DATABASE_URL=postgres://...): sql.js xotirada ishlaydi,
 *     lekin baza blob sifatida tashqi PostgreSQL'ga (masalan Neon free)
 *     saqlanadi — Render Free'da persistent disk yo'q, shuning uchun
 *     bunday arxitektura ma'lumotlarni restart/redeploy'da saqlab qoladi.
 *     Barcha so'rovlar (run/all/get) o'zgarmagan — ilova kodi SQLite
 *     interfeysida ishlaydi.
 */
const FILE_DB_PATH = path.join(ROOT, "data", "admire.db");
const PG_KV_TABLE = "app_kv";
const PG_KV_KEY = "admire_sqlite_blob";

const isPostgres =
  config.databaseUrl && /^postgres(ql)?:\/\//i.test(config.databaseUrl.trim());

const SQL = await initSqlJs({
  locateFile: (file) => path.join(ROOT, "node_modules", "sql.js", "dist", file),
});

let sqlite = new SQL.Database();
let pool = null;
let fileDbPath = FILE_DB_PATH;

if (isPostgres) {
  const { Pool, Client } = await import("pg");
  const useSsl = !/sslmode=disable/i.test(config.databaseUrl);
  const connOpts = { connectionString: config.databaseUrl, ssl: useSsl ? { rejectUnauthorized: false } : false };
  // Avval bitta Client bilan ulanishni tekshirish (toza xato xabari uchun)
  const probe = new Client(connOpts);
  try {
    await probe.connect();
    await probe.query(
      `CREATE TABLE IF NOT EXISTS ${PG_KV_TABLE} (
        key TEXT PRIMARY KEY,
        value BYTEA NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`
    );
    const res = await probe.query(`SELECT value FROM ${PG_KV_TABLE} WHERE key = $1`, [PG_KV_KEY]);
    if (res.rows.length) {
      sqlite = new SQL.Database(res.rows[0].value);
      console.log("[db] Baza PostgreSQL'dan yuklandi (" + res.rows[0].value.length + " bayt)");
    } else {
      console.log("[db] PostgreSQL bo'sh — yangi baza yaratiladi");
    }
  } catch (err) {
    console.error("[db] DATABASE_URL ga ulanib bo'lmadi:", err.message);
    await probe.end().catch(() => {});
    throw err; // ma'lumot yo'qolishiga yo'l qo'ymaslik uchun fail-fast
  }
  await probe.end().catch(() => {});
  pool = new Pool({ ...connOpts, max: 3 });
  pool.on("error", (e) => console.error("[db] PostgreSQL pool xatosi:", e.message));
} else {
  if (config.databaseUrl && !config.databaseUrl.startsWith("sqlite:")) {
    // maxsus fayl yo'li (lokal testlar uchun)
    fileDbPath = config.databaseUrl;
  } else {
    fileDbPath = FILE_DB_PATH;
  }
  fs.mkdirSync(path.dirname(fileDbPath), { recursive: true });
  if (fs.existsSync(fileDbPath)) sqlite = new SQL.Database(fs.readFileSync(fileDbPath));
}

let flushTimer = null;

async function flushToPostgres() {
  try {
    await pool.query(
      `INSERT INTO ${PG_KV_TABLE} (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [PG_KV_KEY, Buffer.from(sqlite.export())]
    );
  } catch (err) {
    console.error("[db] PostgreSQL'ga saqlashda xato:", err.message);
  }
}

function flushToFile() {
  fs.writeFileSync(fileDbPath, Buffer.from(sqlite.export()));
}

/** Barcha yozuv amallaridan keyin bazani diskka (yoki Postgres'ga) yozish */
export function persist() {
  if (isPostgres) {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flushToPostgres, 1500); // tez ketma-ket yozishlarni birlashtirish
  } else {
    flushToFile();
  }
}

if (isPostgres) {
  for (const sig of ["SIGTERM", "SIGINT"]) {
    process.on(sig, () => {
      clearTimeout(flushTimer);
      flushToPostgres().finally(() => process.exit(0));
    });
  }
}

export function run(sql, params = []) {
  sqlite.run(sql, params);
  persist();
}

export function all(sql, params = []) {
  const stmt = sqlite.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export function get(sql, params = []) {
  return all(sql, params)[0] ?? null;
}

sqlite.run(`
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_number TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL DEFAULT 'bot',
  telegram_user_id TEXT,
  telegram_username TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  age INTEGER,
  course TEXT NOT NULL,
  schedule TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE TABLE IF NOT EXISTS bot_sessions (
  telegram_user_id TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS registration_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT,
  event TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_apps_course ON applications(course);
CREATE INDEX IF NOT EXISTS idx_apps_created ON applications(created_at);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'EDITOR',
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  remember INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  icon TEXT NOT NULL DEFAULT 'book',
  duration TEXT,
  schedule TEXT,
  price TEXT,
  show_price INTEGER NOT NULL DEFAULT 0,
  teacher TEXT,
  cta_text TEXT NOT NULL DEFAULT 'Batafsil ma’lumot',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT '',
  biography TEXT,
  photo_url TEXT,
  specialties TEXT,
  ielts_score TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam TEXT NOT NULL DEFAULT 'IELTS',
  student_name TEXT NOT NULL,
  overall TEXT NOT NULL,
  listening TEXT, reading TEXT, writing TEXT, speaking TEXT,
  result_date TEXT,
  teacher TEXT,
  description TEXT,
  photo_url TEXT,
  video_id INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  student_name TEXT,
  result TEXT,
  description TEXT,
  thumbnail_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'youtube',
  video_url TEXT,
  file_url TEXT,
  course TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_url TEXT NOT NULL,
  original_name TEXT NOT NULL,
  title TEXT,
  alt TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  size INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  source TEXT NOT NULL DEFAULT 'Google Maps',
  review_date TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_courses_pub ON courses(published, sort_order);
CREATE INDEX IF NOT EXISTS idx_results_pub ON results(published, sort_order);
`);

/* Migratsiya: videos jadvaliga fayl metadata ustunlari */
for (const col of [
  ["video_file_name", "TEXT"],
  ["video_file_size", "INTEGER"],
  ["video_duration", "TEXT"],
]) {
  const cols = all(`PRAGMA table_info(videos)`).map((c) => c.name);
  if (!cols.includes(col[0])) {
    run(`ALTER TABLE videos ADD COLUMN ${col[0]} ${col[1]}`);
  }
}
persist();
// Boshlang'ich schema/migratsiyalarni birinchi bo'lib saqlab qo'yish
if (isPostgres) await flushToPostgres();

export const STATUSES = {
  new: { emoji: "🟡", label: "Yangi" },
  contacted: { emoji: "📞", label: "Bog‘landim" },
  accepted: { emoji: "✅", label: "Qabul qilindi" },
  later: { emoji: "⏳", label: "Keyinroq" },
  rejected: { emoji: "❌", label: "Bekor qilindi" },
};

function nextApplicationNumber() {
  const year = new Date().getFullYear();
  const row = get(`SELECT COUNT(*) AS c FROM applications WHERE application_number LIKE ?`, [
    `ADM-${year}-%`,
  ]);
  const seq = String(row.c + 1).padStart(6, "0");
  return `ADM-${year}-${seq}`;
}

/**
 * Yangi ariza saqlash. Ikkilamchi yuborilishlarni cheklash:
 * bir xil telegram_user_id yoki telefon bilan 10 daqiqada bitta "Yangi" ariza.
 */
export function createApplication(data) {
  const phoneDigits = String(data.phone).replace(/\D/g, "").slice(-9);
  const dupe = get(
    `SELECT application_number FROM applications
     WHERE status = 'new'
       AND created_at >= datetime('now', '-10 minutes', 'localtime')
       AND (telegram_user_id IS ? OR replace(replace(replace(replace(phone, ' ', ''), '+', ''), '(', ''), ')', '') LIKE '%' || ?)
     LIMIT 1`,
    [data.telegramUserId ?? null, phoneDigits]
  );
  if (dupe) return { duplicate: true, applicationNumber: dupe.application_number };

  const number = nextApplicationNumber();
  const info = run(
    `INSERT INTO applications
      (application_number, source, telegram_user_id, telegram_username, full_name, phone, age, course, schedule, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      number,
      data.source ?? "bot",
      data.telegramUserId ?? null,
      data.telegramUsername ?? null,
      data.fullName,
      data.phone,
      data.age ?? null,
      data.course,
      data.schedule ?? null,
      data.message ?? null,
    ]
  );
  const row = get("SELECT id FROM applications WHERE application_number = ?", [number]);
  return { duplicate: false, applicationNumber: number, dbId: row.id };
}

export function getApplication(id) {
  return get("SELECT * FROM applications WHERE id = ?", [id]);
}

export function setApplicationStatus(id, status) {
  run(`UPDATE applications SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`, [
    status,
    id,
  ]);
  return getApplication(id);
}

export function listApplications({ status, course, q, limit = 200 } = {}) {
  let sql = "SELECT * FROM applications WHERE 1=1";
  const args = [];
  if (status) { sql += " AND status = ?"; args.push(status); }
  if (course) { sql += " AND course = ?"; args.push(course); }
  if (q) {
    sql += " AND (full_name LIKE ? OR phone LIKE ? OR application_number LIKE ?)";
    const like = `%${q}%`;
    args.push(like, like, like);
  }
  sql += " ORDER BY id DESC LIMIT ?";
  args.push(limit);
  return all(sql, args);
}

export function countByStatus() {
  const rows = all("SELECT status, COUNT(*) AS c FROM applications GROUP BY status");
  const out = Object.fromEntries(Object.keys(STATUSES).map((s) => [s, 0]));
  rows.forEach((r) => { out[r.status] = r.c; });
  out.total = rows.reduce((a, r) => a + r.c, 0);
  return out;
}

/* ---------- Bot sessiyalari (registratsiya holati) ---------- */
export function getSession(userId) {
  const row = get("SELECT state FROM bot_sessions WHERE telegram_user_id = ?", [String(userId)]);
  return row ? JSON.parse(row.state) : null;
}

export function saveSession(userId, state) {
  run(
    `INSERT INTO bot_sessions (telegram_user_id, state, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(telegram_user_id) DO UPDATE SET state = excluded.state, updated_at = datetime('now')`,
    [String(userId), JSON.stringify(state ?? {})]
  );
}

export function clearSession(userId) {
  run("DELETE FROM bot_sessions WHERE telegram_user_id = ?", [String(userId)]);
}

export function logEvent(userId, event) {
  run("INSERT INTO registration_events (telegram_user_id, event) VALUES (?, ?)", [
    String(userId ?? null),
    event,
  ]);
}
