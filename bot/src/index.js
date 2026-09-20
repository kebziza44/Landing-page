import { config, assertConfig } from "./config.js";
import { createServer } from "./server.js";
import { createBot, notifyNewApplication } from "./bot.js";

assertConfig();

let bot = null;

if (config.isBotConfigured) {
  bot = createBot();

  if (config.baseUrl && config.webhookSecret) {
    // Production: webhook rejimi
    const app = createServer(bot);
    app.use(bot.webhookCallback(`/${config.webhookSecret}`));
    app.listen(config.port, async () => {
      console.log(`[server] http://localhost:${config.port}`);
      await bot.api.setWebhook(`${config.baseUrl}/${config.webhookSecret}`, {
        drop_pending_updates: true,
      });
      console.log(`[bot] Webhook o‘rnatildi: ${config.baseUrl}/${config.webhookSecret}`);
    });
  } else {
    // Development: long-polling
    const app = createServer(bot);
    app.listen(config.port, () => console.log(`[server] http://localhost:${config.port}`));
    bot.start({ drop_pending_updates: true });
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
  app.listen(config.port, () => console.log(`[server] http://localhost:${config.port}`));
}
