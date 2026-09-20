import { Bot, GrammyError, HttpError, InlineKeyboard } from "grammy";
import { config } from "./config.js";
import {
  clearSession,
  createApplication,
  getApplication,
  getSession,
  logEvent,
  saveSession,
  setApplicationStatus,
  STATUSES,
} from "./db.js";
import { CENTER, COURSES, courseByKey } from "./data.js";
import {
  adminStatusKeyboard,
  confirmKeyboard,
  contactKeyboard,
  courseChoiceKeyboard,
  courseKeyboard,
  coursesInline,
  mainMenuKeyboard,
  skipKeyboard,
} from "./keyboards.js";

const WELCOME =
  "Assalomu alaykum! 👋\nADMIRE L.C. ga xush kelibsiz.\n\n" +
  "Bu bot orqali kurslar haqida ma’lumot olishingiz va qabul uchun ariza qoldirishingiz mumkin.";

function pad(n) {
  return String(n).padStart(2, "0");
}
function formatTime(d = new Date()) {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function adminApplicationText(number, d) {
  return (
    "🔔 YANGI QABUL ARIZASI\n\n" +
    `🆔 Ariza: ${number}\n\n` +
    `👤 Ism: ${d.fullName}\n` +
    `📱 Telefon: ${d.phone}\n` +
    (d.age ? `🎂 Yosh: ${d.age}\n` : "") +
    `🎓 Kurs: ${d.course}\n` +
    (d.message ? `💬 Izoh: ${d.message}\n` : "") +
    (d.username ? `🔗 Telegram: ${d.username}\n` : "") +
    `\n🌐 Manba: ${d.source}\n🕐 Vaqt: ${formatTime(new Date(d.createdAt || Date.now()))}\n\n` +
    "Status:\n🟡 Yangi"
  );
}

/** Yangi arizani admin chatga yuborish (status tugmalari bilan). */
export async function notifyNewApplication(bot, number, data) {
  if (!config.adminChatId) {
    console.warn("[bot] TELEGRAM_ADMIN_CHAT_ID sozlanmagan — ariza faqat bazada saqlandi");
    return;
  }
  try {
    await bot.api.sendMessage(config.adminChatId, adminApplicationText(number, data), {
      reply_markup: adminStatusKeyboard(data.dbId),
      link_preview_options: { is_disabled: true },
    });
  } catch (e) {
    console.error("[bot] Admin xabari yuborilmadi:", e.description ?? e.message);
  }
}

export function createBot() {
  const bot = new Bot(config.botToken);

  /* ---------- Umumiy ekranlar ---------- */
  async function sendMenu(ctx, text = WELCOME) {
    await ctx.reply(text, { reply_markup: mainMenuKeyboard() });
  }

  function applicationText(d) {
    return (
      "📋 ARIZA MA’LUMOTLARI\n\n" +
      `👤 Ism: ${d.fullName}\n` +
      `📱 Telefon: ${d.phone}\n` +
      (d.age ? `🎂 Yosh: ${d.age}\n` : "") +
      `🎓 Kurs: ${d.course}\n` +
      (d.message ? `💬 Izoh: ${d.message}\n` : "")
    );
  }

  async function sendAbout(ctx) {
    await ctx.reply(
      "📚 ADMIRE L.C.\n\n" +
        "Farg‘ona viloyati, Buvayda tumani, Ibrat shaharchasida joylashgan zamonaviy o‘quv markazi.\n\n" +
        "• Ingliz tili, IELTS, CEFR, SAT va arab tili kurslari\n" +
        "• Asoschi Farruxjon Abdurabiyev — IELTS Overall 8.5 (2 marta)\n" +
        "• Har yakshanba IELTS & CEFR mock imtihonlari\n" +
        "• Google Maps: 5.0★ (24 sharh)\n\n" +
        `📰 Yangiliklar: ${CENTER.telegramChannel}`,
      { link_preview_options: { is_disabled: true } }
    );
  }

  async function sendContact(ctx) {
    await ctx.reply(
      "📞 Bog‘lanish:\n\n" +
        `☎️ Telefon: ${CENTER.phone}\n` +
        `💬 Qabulxona (Telegram): @Admire_Qabulxona\n` +
        `📢 Kanal: @admire_learning_center\n` +
        `📸 Instagram: @admire_learning_center`,
      {
        reply_markup: new InlineKeyboard()
          .url("☎️ Qo‘ng‘iroq qilish", `tel:${CENTER.phoneHref}`)
          .url("💬 Telegram", CENTER.reception),
      }
    );
  }

  async function sendLocation(ctx) {
    await ctx.replyLocation(CENTER.latitude, CENTER.longitude);
    await ctx.reply(
      `📍 ${CENTER.address}\n\n🕒 Ish vaqti:\n` +
        CENTER.hours.map(([d, h]) => `• ${d}: ${h}`).join("\n"),
      {
        reply_markup: new InlineKeyboard().url("🗺 Google Maps’da ochish", CENTER.mapsUrl),
      }
    );
  }

  /* ---------- Oqim boshqaruvi ---------- */
  async function startApplication(ctx, courseKey = null) {
    clearSession(ctx.from.id);
    saveSession(ctx.from.id, { step: "name", courseKey });
    logEvent(ctx.from.id, "apply_started");
    await ctx.reply("📝 Qabul uchun ariza.\n\n1/5 — Ism va familiyangizni kiriting:", {
      reply_markup: { keyboard: [[{ text: "❌ Bekor qilish" }]], resize_keyboard: true },
    });
  }

  async function cancelFlow(ctx) {
    clearSession(ctx.from.id);
    await ctx.reply("❌ Ariza bekor qilindi.", { reply_markup: mainMenuKeyboard() });
  }

  async function gotoMessageStep(ctx, s) {
    s.step = "message";
    saveSession(ctx.from.id, s);
    return ctx.reply("💬 Qo‘shimcha savolingiz yoki izohingiz bo‘lsa yozing.", {
      reply_markup: skipKeyboard(),
    });
  }

  async function askConfirm(ctx, s) {
    s.step = "confirm";
    saveSession(ctx.from.id, s);
    await ctx.reply(applicationText(s), { reply_markup: confirmKeyboard() });
  }

  async function handleFlowText(ctx, text) {
    const s = getSession(ctx.from.id);
    if (!s?.step) {
      return sendMenu(ctx, "Menyudan kerakli bo‘limni tanlang 👇");
    }
    if (s.step === "name") {
      if (text.length < 3 || text.length > 80) {
        return ctx.reply("⚠️ Ism va familiyani to‘liq kiriting (kamida 3 belgi).");
      }
      s.fullName = text;
      s.step = "phone";
      saveSession(ctx.from.id, s);
      return ctx.reply("📱 Telefon raqamingizni yuboring (tugma orqali yoki qo‘lda):", {
        reply_markup: contactKeyboard(),
      });
    }
    if (s.step === "phone") {
      const digits = text.replace(/\D/g, "");
      if (digits.length < 9 || digits.length > 12) {
        return ctx.reply("⚠️ Telefon raqam noto‘g‘ri. Masalan: +998 90 123 45 67");
      }
      s.phone = text;
      s.step = "age";
      saveSession(ctx.from.id, s);
      return ctx.reply("🎂 Yoshingizni kiriting:");
    }
    if (s.step === "age") {
      const age = Number(text);
      if (!Number.isInteger(age) || age < 5 || age > 90) {
        return ctx.reply("⚠️ Yoshni raqam bilan kiriting (5–90).");
      }
      s.age = age;
      s.step = "course";
      saveSession(ctx.from.id, s);
      await ctx.reply("🎓 Qaysi kursga yozilmoqchisiz?");
      return ctx.reply("Kursni tanlang:", { reply_markup: courseChoiceKeyboard() });
    }
    if (s.step === "course") {
      const c = COURSES.find((x) => x.title.toLowerCase() === text.toLowerCase());
      if (!c) {
        return ctx.reply("⚠️ Iltimos, tugmalardan kursni tanlang yoki /cancel bosing.");
      }
      s.course = c.title;
      saveSession(ctx.from.id, s);
      return gotoMessageStep(ctx, s);
    }
    if (s.step === "message") {
      s.message = text.slice(0, 500);
      saveSession(ctx.from.id, s);
      return askConfirm(ctx, s);
    }
    return sendMenu(ctx);
  }

  /* ---------- /start va komandalar ---------- */
  bot.command("start", async (ctx) => {
    logEvent(ctx.from?.id, "start");
    clearSession(ctx.from.id);
    await sendMenu(ctx);
  });
  bot.command("menu", (ctx) => sendMenu(ctx, "🏠 Bosh menyu:"));
  bot.command("courses", (ctx) => ctx.reply("🎓 Bizning kurslar:", { reply_markup: coursesInline() }));
  bot.command("apply", (ctx) => startApplication(ctx));
  bot.command("about", (ctx) => sendAbout(ctx));
  bot.command("contact", (ctx) => sendContact(ctx));
  bot.command("location", (ctx) => sendLocation(ctx));

  bot.on("message:text", async (ctx) => {
    const t = ctx.message.text.trim();
    if (t.startsWith("/")) {
      if (t === "/cancel") return cancelFlow(ctx);
      return;
    }
    switch (t) {
      case "🎓 Kurslar":
        return ctx.reply("🎓 Bizning kurslar:", { reply_markup: coursesInline() });
      case "📝 Qabulga yozilish":
        return startApplication(ctx);
      case "📚 ADMIRE haqida":
        return sendAbout(ctx);
      case "📍 Manzil":
        return sendLocation(ctx);
      case "📞 Bog‘lanish":
        return sendContact(ctx);
      case "📸 Instagram":
        return ctx.reply(`📸 Instagram: ${CENTER.instagram}`);
      case "🌐 Sayt":
        return ctx.reply(`🌐 Sayt / kanal: ${CENTER.website}`);
      case "❌ Bekor qilish":
        return cancelFlow(ctx);
    }
    return handleFlowText(ctx, t);
  });

  /* ---------- Telefon contact ---------- */
  bot.on("message:contact", async (ctx) => {
    const s = getSession(ctx.from.id) || {};
    if (s.step !== "phone") return sendMenu(ctx);
    if (ctx.message.contact.user_id && ctx.message.contact.user_id !== ctx.from.id) {
      return ctx.reply("⚠️ Iltimos, o‘zingizning telefon raqamingizni yuboring.");
    }
    s.phone = ctx.message.contact.phone_number;
    s.step = "age";
    saveSession(ctx.from.id, s);
    await ctx.reply("🎂 Yoshingizni kiriting:");
  });

  /* ---------- Inline callback'lar ---------- */
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    await ctx.answerCallbackQuery().catch(() => {});

    if (data.startsWith("course:")) {
      const c = courseByKey[data.split(":")[1]];
      if (!c) return;
      return ctx.reply(
        `🎓 ${c.title}\n\n${c.description}\n` +
          c.facts.map((f) => `• ${f}`).join("\n") +
          (c.key === "ielts" || c.key === "cefr"
            ? "\n\nℹ️ IELTS & CEFR mock imtihonlari har yakshanba o‘tkaziladi."
            : ""),
        { reply_markup: courseKeyboard(c.key) }
      );
    }
    if (data === "courses") return ctx.reply("🎓 Bizning kurslar:", { reply_markup: coursesInline() });
    if (data === "apply") return startApplication(ctx);
    if (data.startsWith("apply:")) return startApplication(ctx, data.split(":")[1]);
    if (data === "home") return sendMenu(ctx, "🏠 Bosh menyu:");
    if (data === "cancel") return cancelFlow(ctx);
    if (data === "restart") return startApplication(ctx);

    if (data.startsWith("pick:")) {
      const s = getSession(ctx.from.id) || {};
      if (s.step !== "course") return;
      const c = courseByKey[data.split(":")[1]];
      if (!c) return;
      s.course = c.title;
      saveSession(ctx.from.id, s);
      return gotoMessageStep(ctx, s);
    }

    if (data === "skip") {
      const s = getSession(ctx.from.id) || {};
      if (s.step !== "message") return;
      s.message = null;
      saveSession(ctx.from.id, s);
      return askConfirm(ctx, s);
    }

    if (data === "confirm") {
      const s = getSession(ctx.from.id);
      if (!s || !s.fullName || !s.phone || !s.course) {
        return sendMenu(ctx, "Ariza ma’lumotlari topilmadi. Qaytadan boshlaymiz.");
      }
      const res = createApplication({
        source: "Telegram bot",
        telegramUserId: String(ctx.from.id),
        telegramUsername: ctx.from.username ?? null,
        fullName: s.fullName,
        phone: s.phone,
        age: s.age,
        course: s.course,
        message: s.message,
      });
      clearSession(ctx.from.id);
      if (res.duplicate) {
        return ctx.reply(
          `ℹ️ So‘rovingiz allaqachon qabul qilingan.\nAriza raqamingiz: <b>${res.applicationNumber}</b>`,
          { parse_mode: "HTML" }
        );
      }
      logEvent(ctx.from.id, "application_submitted");
      const created = getApplication(res.dbId);
      await notifyNewApplication(bot, res.applicationNumber, {
        ...s,
        username: ctx.from.username ? "@" + ctx.from.username : null,
        source: "Telegram bot",
        createdAt: created?.created_at,
        dbId: res.dbId,
      });
      return ctx.reply(
        `✅ Arizangiz muvaffaqiyatli qabul qilindi!\n\nAriza raqamingiz:\n<b>${res.applicationNumber}</b>\n\nQabul bo‘limi tez orada siz bilan bog‘lanadi.\n\n📞 ${CENTER.phone}`,
        { parse_mode: "HTML", reply_markup: mainMenuKeyboard() }
      );
    }

    /* Admin: status o‘zgartirish */
    if (data.startsWith("st:")) {
      const [, id, status] = data.split(":");
      const fromAdminGroup = ctx.callbackQuery.message?.chat?.id?.toString() === config.adminChatId;
      const allowed = config.adminIds.includes(ctx.from.id) || fromAdminGroup;
      if (!allowed) {
        return ctx.answerCallbackQuery({ text: "⛔ Ruxsat yo‘q", show_alert: true }).catch(() => {});
      }
      if (!STATUSES[status]) return;
      const app = setApplicationStatus(Number(id), status);
      if (!app) return;
      const st = STATUSES[status];
      await ctx.editMessageText(
        `${ctx.callbackQuery.message.text}\n\n${st.emoji} Status: ${st.label} — ${ctx.from.first_name} (${formatTime()})`,
        { link_preview_options: { is_disabled: true } }
      ).catch(async () => {
        await ctx.reply(`${st.emoji} Ariza #${app.application_number} statusi: ${st.label}`);
      });
      return ctx.answerCallbackQuery({ text: `Status: ${st.label}` }).catch(() => {});
    }
  });

  /* ---------- Global xatoliklar ---------- */
  bot.catch((err) => {
    console.error(`[bot] Xatolik (update ${err.ctx?.update?.update_id}):`);
    const e = err.error;
    if (e instanceof GrammyError) console.error("Telegram API:", e.description);
    else if (e instanceof HttpError) console.error("HTTP:", e.error);
    else console.error(e);
  });

  return bot;
}
