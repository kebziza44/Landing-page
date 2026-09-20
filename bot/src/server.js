import express from "express";
import path from "node:path";
import { config, ROOT } from "./config.js";
import { createApplication, getApplication } from "./db.js";
import { notifyNewApplication } from "./bot.js";
import { seedCms, renderSite } from "./render-site.js";
import { createCmsRouter } from "./cms.js";

const SITE_DIR = path.resolve(ROOT, "..");
const UPLOAD_DIR = path.join(ROOT, "data", "uploads");

export function createServer(bot) {
  seedCms();

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Netlify/Render proksi ortida haqiqiy IP uchun
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  /* ---------- CMS admin ---------- */
  app.use("/admin", createCmsRouter());

  /* ---------- Yuklangan media ---------- */
  app.use("/media", express.static(UPLOAD_DIR, { maxAge: "7d" }));

  /* ---------- Statik sayt fayllari (css/js/assets) ---------- */
  app.use(express.static(SITE_DIR, { index: false, extensions: false }));

  /* ---------- Bosh sahifa — CMS'dan render ---------- */
  app.get("/", (req, res) => {
    res.type("html").send(renderSite("/"));
  });

  app.get("/results", (req, res) => {
    res.type("html").send(renderSite("/results"));
  });

  /* ---------- Sayt formasi API ---------- */
  const recent = new Map();
  function limited(key) {
    const last = recent.get(key) ?? 0;
    return Date.now() - last < 60_000;
  }
  function mark(key) {
    recent.set(key, Date.now());
    if (recent.size > 1000) {
      const cutoff = Date.now() - 60_000;
      for (const [k, v] of recent) if (v < cutoff) recent.delete(k);
    }
  }

  app.post("/api/applications", async (req, res) => {
    try {
      const { name, phone, course, message } = req.body ?? {};
      const errors = {};
      if (!name || String(name).trim().length < 2 || String(name).trim().length > 80)
        errors.name = "Ismni kiriting";
      const digits = String(phone ?? "").replace(/\D/g, "");
      if (digits.length < 9 || digits.length > 12) errors.phone = "Telefon raqam noto‘g‘ri";
      if (!course) errors.course = "Kursni tanlang";
      if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });

      const ip = req.ip;
      if (limited(ip)) return res.status(429).json({ ok: false, error: "Juda tez-tez yuborildi. Bir daqiqa kuting." });
      mark(ip);

      const result = createApplication({
        source: "Sayt formasi",
        fullName: String(name).trim().slice(0, 80),
        phone: String(phone).trim().slice(0, 24),
        course: String(course).slice(0, 40),
        message: message ? String(message).trim().slice(0, 500) : null,
      });

      if (result.duplicate) {
        return res.json({ ok: true, duplicate: true, applicationNumber: result.applicationNumber });
      }

      const created = getApplication(result.dbId);
      notifyNewApplication(bot, result.applicationNumber, {
        fullName: String(name).trim(),
        phone: String(phone).trim(),
        course,
        message: message ? String(message).trim() : null,
        source: "Sayt formasi",
        createdAt: created?.created_at,
        dbId: result.dbId,
      });

      res.json({ ok: true, applicationNumber: result.applicationNumber });
    } catch (e) {
      console.error("[api] Ariza saqlashda xatolik:", e);
      res.status(500).json({ ok: false, error: "Server xatosi" });
    }
  });

  app.get("/api/config", (req, res) => {
    res.json({ botUsername: config.botUsername || null, reception: "https://t.me/Admire_Qabulxona" });
  });

  return app;
}
