import { config, assertConfig } from "./config.js";
import { createServer } from "./server.js";
import { createBot, notifyNewApplication } from "./bot.js";
// webhookCallback — grammY'ning alohida eksporti (Bot metodasi EMAS):
import { webhookCallback } from "grammy";

assertConfig();

let bot = null;

/**
 * Webhook'ni timeout va retry bilan o'rnatish.
 * Telegram API vaqtincha unreachable bo'lsa ham server ishlashda davom etadi —
 * fonda qayta urinib ko'radi, process hech qachon crash bo'lmaydi.
 */
function installWebhook(bot) {
  const url = `${config.baseUrl}/${config.webhookSecret}`;
  const maxAttempts = 5;
  let timer = null;
  let attempt = 0;

  const tryInstall = async () => {
    attempt++;
    try {
      await Promise.race([
        bot.api.setWebhook(url, {
          drop_pending_updates: true,
          secret_token: config.webhookSecret,
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout (20s)")), 20000)),
      ]);
      console.log(`[bot] Webhook o'rnatildi: ${url}`);
      return true;
    } catch (e) {
      console.error(`[bot] setWebhook urinish ${attempt}/${maxAttempts} muvaffaqiyatsiz:`, e.message);
      return false;
    }
  };

  const loop = async () => {
    if (await tryInstall()) return;
    while (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 10000)); // 10s kutib qayta urinish
      if (await tryInstall()) return;
    }
    console.error("[bot] Webhook o'rnatilmadi — web qismi ishlashda davom etadi, 60 soniyadan keyin yana uriniladi.");
    timer = setInterval(async () => {
      if (await tryInstall()) clearInterval(timer);
    }, 60000);
  };
  loop().catch((e) => console.error("[bot] Webhook install xatosi:", e.message));
}

if (config.isBotConfigured) {
  bot = createBot();

  if (config.baseUrl && config.webhookSecret) {
    // Production: webhook rejimi.
    // grammY Express adapteri raw body o'qiydi — shuning uchun handler
    // createServer ichida express.json()'dan OLDIN mount qilinadi.
    const handleUpdate = webhookCallback(bot, "express", {
      secretToken: config.webhookSecret,
    });
    const app = createServer(bot, {
      webhookPath: config.webhookSecret,
      webhookHandler: handleUpdate,
    });
    app.listen(config.port, "0.0.0.0", () => {
      console.log(`[server] 0.0.0.0:${config.port} da ishlayapti`);
      // await yo'q — Telegram javob bermasa ham server ishlashda davom etadi
      installWebhook(bot);
    });
  } else {
    // Development: long-polling. Server ishlashini polling xatolari buzmasin:
    bot.start({ drop_pending_updates: true }).catch((e) =>
      console.error("[bot] Long-polling to'xtadi (web qismi ishlashda davom etadi):", e.message)
    );
    const app = createServer(bot);
    app.listen(config.port, "0.0.0.0", () =>
      console.log(`[server] 0.0.0.0:${config.port} da ishlayapti`)
    );
    console.log("[bot] Long-polling rejimida ishga tushdi");
  }
} else {
  // Token yo'q: faqat sayt + admin panel + forma API ishlaydi.
  // Arizalar bazaga saqlanadi, Telegram bildirishnomasi yuborilmaydi.
  console.warn("[bot] TELEGRAM_BOT_TOKEN ko‘rsatilmagan — bot ishga tushmadi (faqat web qismi).");
  const noopBot = {
    api: {
      sendMessage: async () => {
        console.warn("[bot] (token yo‘q) admin bildirishnomasi yuborilmadi");
      },
    },
  };
  const app = createServer(noopBot);
  app.listen(config.port, "0.0.0.0", () =>
    console.log(`[server] 0.0.0.0:${config.port} da ishlayapti`)
  );
}
