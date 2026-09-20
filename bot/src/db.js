import initSqlJs from "sql.js";
import path from "node:path";
import fs from "node:fs";
import { config, ROOT } from "./config.js";

const dbPath =
  config.databaseUrl && !config.databaseUrl.startsWith("sqlite:")
    ? config.databaseUrl
    : path.join(ROOT, "data", "admire.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const SQL = await initSqlJs({
  locateFile: (file) => path.join(ROOT, "node_modules", "sql.js", "dist", file),
});

const sqlite = fs.existsSync(dbPath)
  ? new SQL.Database(fs.readFileSync(dbPath))
  : new SQL.Database();

/** Barcha yozuv amallaridan keyin bazani diskka yozish */
export function persist() {
  fs.writeFileSync(dbPath, Buffer.from(sqlite.export()));
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
