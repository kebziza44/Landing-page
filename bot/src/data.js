// Faqat ADMIRE L.C. rasmiy manbalarida (Telegram kanal / Google Maps) tasdiqlangan ma'lumotlar.
// Narx va aniq dars jadvallari ochiq manbalarda e'lon qilinmagan — shuning uchun kiritilmagan.

export const CENTER = {
  name: "ADMIRE L.C.",
  phone: "+998 90 666 66 77",
  phoneHref: "+998906666677",
  telegramChannel: "https://t.me/admire_learning_center",
  reception: "https://t.me/Admire_Qabulxona",
  instagram: "https://www.instagram.com/admire_learning_center/",
  mapsUrl:
    "https://www.google.com/maps/place/Admire/@40.5619302,71.1376099,17z/data=!4m6!3m5!1s0x38bae3c348b0a535:0x9c9f88a453624e7!8m2!3d40.5619302!4d71.1376099!16s%2Fg%2F11l22p0c34",
  address: "Farg‘ona viloyati, Buvayda tumani, Ibrat shaharchasi (sobiq Yangiqo‘rg‘on)",
  latitude: 40.5619302,
  longitude: 71.1376099,
  hours: [
    ["Dushanba – Shanba", "06:00 – 19:00"],
    ["Yakshanba", "Dam olish kuni"],
  ],
  website: "https://t.me/admire_learning_center", // rasmiy sayt hozircha yo'q; kanal
};

export const COURSES = [
  {
    key: "english",
    title: "Ingliz tili",
    description:
      "Noldan boshlovchilar uchun alohida guruhlar (Starter / English from zero). Haftada 3 marta darslar, qulay vaqt tanlash imkoniyati.",
    facts: ["Noldan boshlash mumkin", "Haftada 3 dars"],
  },
  {
    key: "ielts",
    title: "IELTS",
    description:
      "Imtihon formatiga to‘liq moslashtirilgan tayyorlov. Har yakshanba mock imtihonlar bilan real tajriba orttiring.",
    facts: ["Har yakshanba mock imtihon", "Speaking + Main exam 2 smena"],
  },
  {
    key: "cefr",
    title: "CEFR",
    description:
      "Milliy sertifikat (CEFR) imtihonlariga tayyorlov, jumladan noldan boshlanuvchilar uchun alohida kurs.",
    facts: ["CEFR from zero guruhi mavjud", "Mock imtihonlar yakshanba kunlari"],
  },
  {
    key: "sat",
    title: "SAT",
    description: "Xorijiy universitetlarga kirish uchun SAT imtihoniga tayyorlov kurslari.",
    facts: ["Natijalar kanalda e’lon qilinadi"],
  },
  {
    key: "arabic",
    title: "Arab tili",
    description: "Markazda yangi yo‘nalish sifatida ochilgan arab tili kurslari.",
    facts: ["Yangi yo‘nalish"],
  },
];

export const courseByKey = Object.fromEntries(COURSES.map((c) => [c.key, c]));
export const courseByTitle = Object.fromEntries(COURSES.map((c) => [c.title, c]));
