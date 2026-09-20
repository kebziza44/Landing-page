import { Keyboard, InlineKeyboard } from "grammy";
import { COURSES } from "./data.js";

export function mainMenuKeyboard() {
  return new Keyboard()
    .text("🎓 Kurslar").row()
    .text("📝 Qabulga yozilish").row()
    .text("📚 ADMIRE haqida").row()
    .text("📍 Manzil").row()
    .text("📞 Bog‘lanish").row()
    .text("📸 Instagram").text("🌐 Sayt")
    .resized().persistent();
}

export function coursesInline() {
  const kb = new InlineKeyboard();
  for (const c of COURSES) kb.text(`🎓 ${c.title}`, `course:${c.key}`).row();
  kb.text("📝 Qabulga yozilish", "apply").text("🏠 Bosh menyu", "home");
  return kb;
}

export function courseKeyboard(key) {
  return new InlineKeyboard()
    .text("📝 Qabulga yozilish", `apply:${key}`)
    .row()
    .text("⬅️ Orqaga", "courses")
    .text("🏠 Bosh menyu", "home");
}

export function skipKeyboard() {
  return new InlineKeyboard().text("⏭ O‘tkazib yuborish", "skip").text("❌ Bekor qilish", "cancel");
}

export function contactKeyboard() {
  return new Keyboard()
    .requestContact("📱 Telefon raqamimni yuborish")
    .row()
    .text("❌ Bekor qilish")
    .resized().oneTime();
}

export function confirmKeyboard() {
  return new InlineKeyboard()
    .text("✅ Tasdiqlash", "confirm").row()
    .text("✏️ O‘zgartirish", "restart").text("❌ Bekor qilish", "cancel");
}

export function courseChoiceKeyboard(currentKey) {
  const kb = new InlineKeyboard();
  for (const c of COURSES) {
    const mark = c.key === currentKey ? "✓ " : "";
    kb.text(`${mark}${c.title}`, `pick:${c.key}`).row();
  }
  kb.text("❌ Bekor qilish", "cancel");
  return kb;
}

export function adminStatusKeyboard(id) {
  return new InlineKeyboard()
    .text("✅ Qabul qilindi", `st:${id}:accepted`)
    .text("📞 Bog‘landim", `st:${id}:contacted`).row()
    .text("⏳ Keyinroq", `st:${id}:later`)
    .text("❌ Bekor qilindi", `st:${id}:rejected`);
}
