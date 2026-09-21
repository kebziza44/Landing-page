import crypto from "node:crypto";
import { run, all, get } from "./db.js";

/* ============================================================
   Parollar (scrypt)
   ============================================================ */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const orig = Buffer.from(hash, "hex");
  return orig.length === test.length && crypto.timingSafeEqual(orig, test);
}

/* Super admin'ni bazadan yaratish (agar adminlar bo'lmasa) */
export function ensureSeedAdmin() {
  const count = get("SELECT COUNT(*) AS c FROM admin_users").c;
  if (count > 0) return;
  const username = "admin";
  const password = config.adminPassword || crypto.randomBytes(8).toString("hex");
  run("INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, 'SUPER_ADMIN')", [
    username,
    hashPassword(password),
  ]);
  audit("system", "Super admin yaratildi", `username=${username}`);
  console.log(`[cms] Super admin yaratildi: ${username} / ${password}`);
}

/* ============================================================
   Audit log
   ============================================================ */
export function audit(adminUsername, action, details = "") {
  run("INSERT INTO audit_log (admin_username, action, details) VALUES (?, ?, ?)", [
    adminUsername,
    action,
    details,
  ]);
}
export function listAudit(limit = 100) {
  return all("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?", [limit]);
}

/* ============================================================
   Settings (key -> JSON)
   ============================================================ */
export function getSetting(key, fallback = {}) {
  const row = get("SELECT value FROM settings WHERE key = ?", [key]);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
}
export function setSetting(key, value) {
  run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, JSON.stringify(value)]
  );
}
export function allSettings() {
  return Object.fromEntries(all("SELECT key, value FROM settings").map((r) => {
    try { return [r.key, JSON.parse(r.value)]; } catch { return [r.key, {}]; }
  }));
}

/* ============================================================
   Generic CRUD yordamchisi
   ============================================================ */
export function listTable(table, { onlyPublished = false, where = "" } = {}) {
  const pub = onlyPublished ? "WHERE published = 1 " : "";
  return all(`SELECT * FROM ${table} ${pub} ${where} ORDER BY sort_order, id`);
}
export function getRow(table, id) {
  return get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
}
export function insertRow(table, fields, data) {
  const cols = fields.filter((f) => data[f] !== undefined);
  const vals = cols.map((f) => data[f]);
  const info = run(
    `INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
    vals
  );
  const id = get("SELECT id FROM " + table + " ORDER BY id DESC LIMIT 1").id;
  return id;
}
export function updateRow(table, fields, id, data) {
  const cols = fields.filter((f) => data[f] !== undefined);
  if (!cols.length) return;
  run(
    `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
    [...cols.map((f) => data[f]), id]
  );
}
export function deleteRow(table, id) {
  run(`DELETE FROM ${table} WHERE id = ?`, [id]);
}
export function togglePublished(table, id) {
  run(`UPDATE ${table} SET published = CASE WHEN published = 1 THEN 0 ELSE 1 END WHERE id = ?`, [id]);
  return getRow(table, id);
}
/** itemni yo'nalishga surish: dir = -1 (yuqoriga) | 1 (pastga) */
export function moveRow(table, id, dir) {
  const item = getRow(table, id);
  if (!item) return;
  const rows = all(`SELECT id, sort_order FROM ${table} ORDER BY sort_order, id`);
  const idx = rows.findIndex((r) => r.id === id);
  const swap = rows[idx + dir];
  if (!swap) return;
  const a = item.sort_order, b = swap.sort_order;
  if (a === b) {
    // bir xil tartib raqamlarini qayta belgilash
    for (const [i, r] of rows.entries()) {
      run(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [i, r.id]);
    }
    run(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [idx + dir, id]);
    run(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [idx, swap.id]);
    return;
  }
  run(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [b, id]);
  run(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [a, swap.id]);
}

/* Public (faqat published) */
export const publicContent = {
  courses: () => listTable("courses", { onlyPublished: true }),
  teachers: () => listTable("teachers", { onlyPublished: true }),
  results: () => listTable("results", { onlyPublished: true }),
  videos: () => listTable("videos", { onlyPublished: true }),
  reviews: () => listTable("reviews", { onlyPublished: true }),
  media: () => listTable("media", { onlyPublished: true }),
};

export const TABLE_FIELDS = {
  courses: ["title", "description", "full_description", "image_url", "icon", "duration", "schedule", "price", "show_price", "teacher", "cta_text", "sort_order", "published"],
  teachers: ["full_name", "position", "biography", "photo_url", "specialties", "ielts_score", "sort_order", "published"],
  results: ["exam", "student_name", "overall", "listening", "reading", "writing", "speaking", "result_date", "teacher", "description", "photo_url", "video_id", "sort_order", "published"],
  videos: ["title", "student_name", "result", "description", "thumbnail_url", "source_type", "video_url", "file_url", "video_file_name", "video_file_size", "video_duration", "course", "sort_order", "featured", "published"],
  media: ["file_url", "original_name", "title", "alt", "category", "size", "sort_order", "published"],
  reviews: ["name", "text", "rating", "source", "review_date", "sort_order", "published"],
};

/* Statistika */
export function cmsStats() {
  const one = (sql) => get(sql).c;
  return {
    applicationsTotal: one("SELECT COUNT(*) AS c FROM applications"),
    applicationsNew: one("SELECT COUNT(*) AS c FROM applications WHERE status='new'"),
    courses: one("SELECT COUNT(*) AS c FROM courses WHERE published=1"),
    teachers: one("SELECT COUNT(*) AS c FROM teachers WHERE published=1"),
    results: one("SELECT COUNT(*) AS c FROM results WHERE published=1"),
    videos: one("SELECT COUNT(*) AS c FROM videos WHERE published=1"),
    media: one("SELECT COUNT(*) AS c FROM media WHERE published=1"),
    reviews: one("SELECT COUNT(*) AS c FROM reviews WHERE published=1"),
  };
}
