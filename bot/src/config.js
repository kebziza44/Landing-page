import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

function env(name, fallback = "") {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v.trim();
}

// .env faylini oddiy o'qish (dotenv o'rnatilmagan bo'lsa ham ishlaydi)
if (!process.env.TELEGRAM_BOT_TOKEN) {
  const envPath = path.join(ROOT, ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

export const config = {
  botToken: env("TELEGRAM_BOT_TOKEN"),
  botUsername: env("TELEGRAM_BOT_USERNAME").replace(/^@/, ""),
  adminChatId: env("TELEGRAM_ADMIN_CHAT_ID"),
  adminIds: env("TELEGRAM_ADMIN_IDS")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n !== 0),
  adminPassword: env("ADMIN_PASSWORD"),
  port: Number(env("PORT", "3000")),
  baseUrl: env("BASE_URL").replace(/\/$/, ""),
  webhookSecret: env("WEBHOOK_SECRET"),
  databaseUrl: env("DATABASE_URL"),
  isBotConfigured: Boolean(env("TELEGRAM_BOT_TOKEN")),
};

export function assertConfig() {
  const problems = [];
  if (!config.adminChatId) problems.push("TELEGRAM_ADMIN_CHAT_ID — arizalar yuboriladigan chat");
  if (!config.adminPassword) problems.push("ADMIN_PASSWORD — admin panel paroli");
  if (problems.length) {
    console.warn("[config] Ogohlantirish — .env to'ldirilmagan:\n  - " + problems.join("\n  - "));
  }
}
