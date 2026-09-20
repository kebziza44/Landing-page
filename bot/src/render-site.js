import fs from "node:fs";
import path from "node:path";
import { config, ROOT } from "./config.js";
import { getSetting, setSetting, publicContent, TABLE_FIELDS } from "./cms-db.js";
import { CENTER } from "./data.js";

const SITE_DIR = path.resolve(ROOT, "..");
const template = fs.readFileSync(path.join(ROOT, "views", "index.template.html"), "utf8");

/* ---------- Boshlang'ich (tasdiqlangan) kontent ---------- */
export function seedCms() {
  if (!getSetting("general").siteName) {
    setSetting("general", { siteName: "ADMIRE L.C.", language: "uz" });
  }
  if (!getSetting("seo").title) {
    setSetting("seo", {
      title: "ADMIRE L.C. — O‘quv markazi | Buvayda, Farg‘ona",
      description:
        "ADMIRE L.C. — Buvayda tumani, Ibrat shaharchasidagi zamonaviy o‘quv markazi. Ingliz tili, IELTS va CEFR tayyorlov kurslari, har yakshanba mock imtihonlar. Qabulga Telegram bot orqali yoziling. Telefon: +998 90 666 66 77",
      ogImage: "assets/img/photos/photo-01.jpg",
      favicon: "assets/img/logo.png",
    });
  }
  if (!getSetting("hero").badge) {
    setSetting("hero", {
      badge: "O‘quv markazi · Buvayda tumani, Ibrat shaharchasi",
      titleBefore: "Kelajagingizni",
      titleHighlight: "ADMIRE",
      titleAfter: "bilan quring",
      subtitle:
        "Ingliz tili, IELTS va CEFR tayyorlov kurslari. Professional ustozlardan ta’lim oling — har yakshanba mock imtihonlar bilan bilimingizni sinab ko‘ring.",
      cta1Text: "Bog‘lanish",
      cta1Action: "tel:+998906666677",
      cta2Text: "Manzilni ko‘rish",
      cta2Action: "#location",
      bgImage: "assets/img/photos/photo-01.jpg",
      bgAlt: "Admire Learning Center binosi, Ibrat shaharchasi",
      stats: [
        { value: "8.5", label: "Asoschimizning IELTS balli (2 marta)", visible: true },
        { value: "5.0★", label: "Google Maps reytingi (24 sharh)", visible: true },
        { value: "Yakshanba", label: "IELTS & CEFR mock imtihonlar", visible: true },
      ],
    });
  }
  if (!getSetting("about").title) {
    setSetting("about", {
      eyebrow: "Biz haqimizda",
      title: "Buvayda tumani markazidagi zamonaviy ta’lim maskani",
      lead:
        "ADMIRE L.C. — Farg‘ona viloyati, Buvayda tumani, Ibrat shaharchasida (sobiq Yangiqo‘rg‘on) joylashgan o‘quv markazi. Markazda ingliz tili noldan boshlab, IELTS va CEFR imtihonlariga tayyorlov kurslari olib boriladi.",
      text:
        "Har bir o‘quvchi uchun qulay guruh jadvali, zamonaviy jihozlangan xonalar va har yakshanba o‘tkaziladigan IELTS & CEFR mock imtihonlari mavjud. Kurslar davomida ustozlar natijalarni muntazam kuzatib boradi va o‘quvchilarni imtihonga tayyorlaydi.",
      features: [
        { text: "Noldan boshlovchilar uchun alohida guruhlar", visible: true },
        { text: "Har yakshanba IELTS & CEFR mock imtihonlar", visible: true },
        { text: "Instagram va Telegram orqali muntazam e’lonlar", visible: true },
      ],
      image: "assets/img/photos/photo-07.jpg",
      imageAlt: "Admire Learning Center o‘quvchilari markaz logotipi ostida",
      caption: "ADMIRE L.C. — Ibrat shaharchasi, Farg‘ona viloyati",
      ctaText: "Kurslar bilan tanishing",
      ctaAction: "#courses",
    });
  }
  if (!getSetting("location").addressLine1) {
    setSetting("location", {
      addressLine1: "Buvayda tumani, Ibrat shaharchasi",
      addressLine2: "(sobiq Yangiqo‘rg‘on), Farg‘ona viloyati, O‘zbekiston",
      latitude: 40.5619302,
      longitude: 71.1376099,
      mapsUrl: CENTER.mapsUrl,
      hours: [
        { days: "Dushanba – Shanba", time: "06:00 – 19:00", visible: true },
        { days: "Yakshanba", time: "Dam olish kuni", visible: true },
      ],
    });
  }
  if (!getSetting("contact").phone) {
    setSetting("contact", {
      phone: "+998 90 666 66 77",
      telegram: "https://t.me/admire_learning_center",
      telegramReception: "https://t.me/Admire_Qabulxona",
      instagram: "https://www.instagram.com/admire_learning_center/",
      email: "",
      website: "",
      mapsNote: "Buvayda, Ibrat shaharchasi",
      telegramApplyNote: "Rasmiy ADMIRE L.C. qabul botida 1 daqiqada ariza qoldiring.",
    });
  }
  if (!getSetting("footer").copyright) {
    setSetting("footer", {
      about: "Ingliz tili · IELTS · CEFR · SAT · Arab tili<br />Buvayda tumani, Ibrat shaharchasi",
      address: "Buvayda tumani, Ibrat shaharchasi,<br />Farg‘ona viloyati, O‘zbekiston",
      hours: "06:00 – 19:00 (Dush–Shan)",
      copyright: "© 2026 ADMIRE L.C. Barcha huquqlar himoyalangan.",
    });
  }

  /* Ma'lumotlar bazasi bo'sh bo'lsa — joriy tasdiqlangan kontent bilan to'ldirish */
  seedIfEmpty("courses", [
    { title: "Ingliz tili", description: "Noldan boshlovchilar uchun Starter va \"English from zero\" guruhlari. Haftada 3 marta darslar, qulay vaqt tanlash imkoniyati.", icon: "book", sort_order: 0 },
    { title: "IELTS", description: "Imtihon formatiga to‘liq moslashtirilgan tayyorlov. Har yakshanba mock imtihonlar bilan real tajriba orttiring.", icon: "star", sort_order: 1 },
    { title: "CEFR", description: "Milliy sertifikat (CEFR) imtihonlariga tayyorlov, jumladan noldan boshlanuvchilar uchun \"CEFR from zero\" kursi.", icon: "check", sort_order: 2 },
    { title: "SAT", description: "Xorijiy universitetlarga kirish uchun SAT imtihoniga tayyorlov kurslari.", icon: "school", sort_order: 3 },
    { title: "Arab tili", description: "Markazda yangi yo‘nalish sifatida arab tili kurslari ochildi.", icon: "book2", sort_order: 4 },
  ]);
  seedIfEmpty("teachers", [
    { full_name: "Farruxjon Abdurabiyev", position: "Asoschi · IELTS ustoz", biography: "IELTS Overall 8.5 — 2 marta erishilgan natija.", specialties: "IELTS", ielts_score: "8.5", sort_order: 0 },
    { full_name: "Muhammadzohid Nosirov", position: "IELTS ustoz", specialties: "IELTS", sort_order: 1 },
    { full_name: "Sherzodjon", position: "Ingliz tili ustoz", specialties: "Ingliz tili", sort_order: 2 },
    { full_name: "Akramjon", position: "CEFR ustoz", specialties: "CEFR", sort_order: 3 },
    { full_name: "Asadbek", position: "IELTS ustoz", specialties: "IELTS", sort_order: 4 },
    { full_name: "Javohir", position: "SAT ustoz", specialties: "SAT", sort_order: 5 },
    { full_name: "Zukhra", position: "CEFR ustoz", specialties: "CEFR", sort_order: 6 },
  ]);
  seedIfEmpty("results", [
    { exam: "IELTS", student_name: "Farruxjon Abdurabiyev (asoschi)", overall: "8.5", description: "IELTS Overall 8.5 — 2 marta", sort_order: 0 },
    { exam: "IELTS", student_name: "Asadbek o‘quvchisi", overall: "7.0", sort_order: 1 },
    { exam: "IELTS", student_name: "Muhammadzohid o‘quvchisi", overall: "6.5", sort_order: 2 },
    { exam: "CEFR", student_name: "Zukhra o‘quvchilari", overall: "2×", description: "CEFR sertifikati — 2 o‘quvchi", sort_order: 3 },
    { exam: "SAT", student_name: "Javohir o‘quvchilari", overall: "3", description: "3 ta yangi SAT natijasi", sort_order: 4 },
  ]);
  seedIfEmpty("reviews", [
    { name: "Durdona Mirzaolimova", text: "“O my good, i have been studying here for 3 years. That’s my fav place.”", rating: 5, source: "Google Maps", sort_order: 0 },
    { name: "Zikrillo Muhammadjonov", text: "“The best place for study, I have ever seen.”", rating: 5, source: "Google Maps", sort_order: 1 },
  ]);
  seedIfEmpty("videos", []);
  seedIfEmpty("media", [
    { file_url: "assets/img/photos/photo-01.jpg", original_name: "photo-01.jpg", title: "Markaz binosi", alt: "Admire Learning Center binosi tashqaridan", category: "Building", sort_order: 0 },
    { file_url: "assets/img/photos/photo-03.jpg", original_name: "photo-03.jpg", title: "Interyer", alt: "Markazning zamonaviy interyeri va qabulxona zonasi", category: "Classrooms", sort_order: 1 },
    { file_url: "assets/img/photos/photo-07.jpg", original_name: "photo-07.jpg", title: "O‘quvchilar", alt: "O‘quvchilar markaz binosi oldida", category: "Students", sort_order: 2 },
    { file_url: "assets/img/photos/photo-02.jpg", original_name: "photo-02.jpg", title: "Bino", alt: "Admire Learning Center binosi", category: "Building", sort_order: 3 },
    { file_url: "assets/img/photos/photo-04.jpg", original_name: "photo-04.jpg", title: "Interyer", alt: "Markaz interyeri", category: "Classrooms", sort_order: 4 },
    { file_url: "assets/img/photos/photo-05.jpg", original_name: "photo-05.jpg", title: "Interyer", alt: "Markaz interyeri", category: "Classrooms", sort_order: 5 },
    { file_url: "assets/img/photos/photo-06.jpg", original_name: "photo-06.jpg", title: "Xona", alt: "Markaz xonalaridan biri", category: "Classrooms", sort_order: 6 },
    { file_url: "assets/img/photos/photo-08.jpg", original_name: "photo-08.jpg", title: "Tadbir", alt: "Tadbir lavhasi", category: "Events", sort_order: 7 },
    { file_url: "assets/img/photos/photo-09.jpg", original_name: "photo-09.jpg", title: "O‘quvchilar va ustozlar", alt: "O‘quvchilar va ustozlar", category: "Students", sort_order: 8 },
    { file_url: "assets/img/photos/photo-10.jpg", original_name: "photo-10.jpg", title: "Jamoat tadbiri", alt: "Markaz jamoasi", category: "Events", sort_order: 9 },
  ]);
}

function seedIfEmpty(table, rows) {
  const n = publicContent[table]?.().length ?? 0;
  if (n > 0) return;
  const fields = TABLE_FIELDS[table];
  for (const r of rows) {
    insertInto(table, fields, r);
  }
}

function insertInto(table, fields, data) {
  const cols = fields.filter((f) => data[f] !== undefined && data[f] !== null);
  const vals = cols.map((f) => data[f]);
  dbRun(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`, vals);
}

import { run as dbRun, all as dbAll } from "./db.js";
void dbAll;

/* ============================================================
   Ikona xaritasi (kurslar)
   ============================================================ */
const ICONS = {
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/><path d="M9 8h7M9 11.5h5"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 8.7l5.4-.8L12 3Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 12l2 2 4-5"/><circle cx="12" cy="12" r="9"/></svg>',
  school: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg>',
  book2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5V6a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2Zm0 0A2.5 2.5 0 0 0 6.5 22H21"/><path d="M8 8h8M8 12h6"/></svg>',
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ============================================================
   Video natijalari (public)
   ============================================================ */
function ytEmbedUrl(url) {
  const m = String(url ?? "").match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function videoCard(v) {
  const hasThumb = Boolean(v.thumbnail_url);
  const thumb = hasThumb
    ? `<img src="${esc(v.thumbnail_url)}" alt="${esc(v.title)}" loading="lazy" />`
    : `<div class="vres__fallback" aria-hidden="true"><span>ADMIRE</span></div>`;
  const score = v.result
    ? `<span class="vres__score">${esc(v.result)}</span>`
    : "";
  const course = v.course
    ? `<span class="vres__tag">${esc(v.course)}</span>`
    : "";
  return `<article class="vres__card" data-video-source="${esc(v.source_type)}"
      data-video-embed="${esc(v.source_type === "youtube" ? ytEmbedUrl(v.video_url) ?? "" : "")}"
      data-video-src="${esc(v.source_type === "file" ? v.file_url ?? "" : "")}"
      data-video-title="${esc(v.title)}"
      data-video-student="${esc(v.student_name ?? "")}"
      data-video-result="${esc(v.result ?? "")}"
      data-video-desc="${esc(v.description ?? "")}" tabindex="0" role="button"
      aria-label="${esc(v.title)} videomini ko‘rish">
      <div class="vres__thumb">
        ${thumb}
        <span class="vres__play" aria-hidden="true">▶</span>
      </div>
      <div class="vres__body">
        <div class="vres__meta">${course}${score}</div>
        <h3 class="vres__title">${esc(v.title)}</h3>
        ${v.student_name ? `<p class="vres__student">${esc(v.student_name)}</p>` : ""}
        <span class="vres__cta">Videoni ko‘rish →</span>
      </div>
    </article>`;
}

function videosSection(videos) {
  if (!videos.length) return "";
  return `<section class="section vresults" id="vresults">
      <div class="container">
        <div class="section__head">
          <p class="section__eyebrow reveal">Natijalarimiz</p>
          <h2 class="section__title reveal">O‘quvchilarimizning haqiqiy natijalari</h2>
        </div>
        <div class="vres reveal">
          <div class="vres__track" id="vresTrack" tabindex="0" aria-label="Video natijalar karusel">
            ${videos.map(videoCard).join("\n            ")}
          </div>
          <div class="vres__nav" aria-hidden="false">
            <button class="vres__btn" id="vresPrev" aria-label="Oldingi">←</button>
            <div class="vres__dots" id="vresDots" aria-hidden="true"></div>
            <button class="vres__btn" id="vresNext" aria-label="Keyingi">→</button>
          </div>
        </div>
        <div class="vres__more reveal">
          <a class="btn btn--secondary" href="/results">Ko‘proq natijalar</a>
        </div>
      </div>
    </section>`;
}

function resultsPage(videos, results) {
  const videoCards = videos.length
    ? `<div class="vres__grid">${videos.map(videoCard).join("\n          ")}</div>`
    : "";
  const scoreCards = results.length
    ? `<h2 class="rpage__h2">Imtihon natijalari</h2>
       <div class="rpage__scores">
        ${results
          .map(
            (r) => `<div class="rpage__score">
              <span class="rpage__exam">${esc(r.exam)}</span>
              <span class="rpage__overall">${esc(r.overall)}</span>
              <span class="rpage__name">${esc(r.student_name)}</span>
              ${r.teacher ? `<span class="rpage__teacher">Ustoz: ${esc(r.teacher)}</span>` : ""}
              ${r.description ? `<span class="rpage__desc">${esc(r.description)}</span>` : ""}
            </div>`
          )
          .join("\n        ")}
       </div>`
    : "";
  return `<!doctype html>
<html lang="uz">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Natijalar — ADMIRE L.C.</title>
  <meta name="description" content="ADMIRE L.C. o‘quvchilarining IELTS, CEFR va SAT natijalari hamda video sharhlar." />
  <meta name="theme-color" content="#0c1330" />
  <link rel="icon" type="image/png" href="assets/img/logo.png" />
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <header class="navbar navbar--scrolled">
    <div class="container navbar__wrap">
      <div class="navbar__inner">
        <a href="/" class="brand">
          <span class="brand__logo-box"><img src="assets/img/logo.png" alt="Admire Learning Center logotipi" class="brand__logo" /></span>
          <span class="brand__text">ADMIRE <em>L.C.</em></span>
        </a>
        <a href="/#contact" class="btn btn--primary nav__cta">Bog‘lanish</a>
      </div>
    </div>
  </header>
  <main style="padding-top:96px">
    <section class="section vresults" style="padding-top:32px">
      <div class="container">
        <p class="section__eyebrow">Natijalarimiz</p>
        <h1 class="section__title" style="margin-bottom:32px">O‘quvchilarimizning haqiqiy natijalari</h1>
        ${videoCards || ""}
        ${scoreCards || ""}
        ${(videos.length || results.length) ? "" : `<div class="empty-results">✨ Natijalar tez orada</div>`}
        <p style="margin-top:36px"><a class="btn btn--primary" href="/">← Bosh sahifaga</a></p>
      </div>
    </section>
  </main>
  <div class="vmodal" id="vmodal" role="dialog" aria-modal="true" aria-label="Video ko‘rish" hidden>
    <button class="vmodal__close" id="vmodalClose" aria-label="Yopish">×</button>
    <div class="vmodal__box">
      <div id="vmodalPlayer" class="vmodal__player"></div>
      <div id="vmodalInfo" class="vmodal__info"></div>
    </div>
  </div>
  <script src="js/main.js" defer></script>
</body>
</html>`;
}

/* ============================================================
   Public saytni render qilish
   ============================================================ */
export function renderSite(pathname = "/") {
  const seo = getSetting("seo");
  const hero = getSetting("hero");
  const about = getSetting("about");
  const location_ = getSetting("location");
  const contact = getSetting("contact");
  const footer = getSetting("footer");

  const courses = publicContent.courses();
  const teachers = publicContent.teachers();
  const results = publicContent.results();
  const videos = publicContent.videos().filter((v) => v.published);
  const reviews = publicContent.reviews();
  const media = publicContent.media();

  const values = {
    SEO_TITLE: esc(seo.title),
    SEO_DESC: esc(seo.description),
    SEO_OG_IMAGE: esc(seo.ogImage),
    SEO_FAVICON: esc(seo.favicon),

    HERO_BG: esc(hero.bgImage),
    HERO_BG_ALT: esc(hero.bgAlt),
    HERO_BADGE: esc(hero.badge),
    HERO_TITLE_HTML: `${esc(hero.titleBefore)} <span>${esc(hero.titleHighlight)}</span> ${esc(hero.titleAfter)}`,
    HERO_SUBTITLE: esc(hero.subtitle),
    HERO_CTA1_HREF: esc(hero.cta1Action),
    HERO_CTA1_TEXT: esc(hero.cta1Text),
    HERO_CTA2_HREF: esc(hero.cta2Action),
    HERO_CTA2_TEXT: esc(hero.cta2Text),
    HERO_STATS_HTML: (hero.stats ?? [])
      .filter((s) => s.visible)
      .map(
        (s) =>
          `<div class="hero__badge"><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`
      )
      .join("\n          "),

    ABOUT_EYEBROW: esc(about.eyebrow),
    ABOUT_TITLE: esc(about.title),
    ABOUT_LEAD: esc(about.lead),
    ABOUT_TEXT: esc(about.text),
    ABOUT_FEATURES_HTML: (about.features ?? [])
      .filter((f) => f.visible)
      .map((f) => `<li>${esc(f.text)}</li>`)
      .join("\n            "),
    ABOUT_IMAGE: esc(about.image),
    ABOUT_IMAGE_ALT: esc(about.imageAlt),
    ABOUT_CAPTION: esc(about.caption),
    ABOUT_CTA_HREF: esc(about.ctaAction),
    ABOUT_CTA_TEXT: esc(about.ctaText),

    COURSES_LEAD:
      "Barcha kurslar bo‘yicha to‘liq ma’lumot (jadval, narx va guruhlar) uchun qabulxonaga murojaat qiling.",
    COURSES_HTML: courses
      .map(
        (c, i) => `<article class="course reveal">
            <div class="course__icon" aria-hidden="true">${ICONS[c.icon] ?? ICONS.book}</div>
            <h3>${esc(c.title)}</h3>
            <p>${esc(c.description)}${c.show_price && c.price ? ` <b>${esc(c.price)}</b>` : ""}</p>
            <a href="#contact" class="course__cta" data-course="${esc(c.title)}">${esc(c.cta_text)} <span aria-hidden="true">→</span></a>
          </article>`
      )
      .join("\n          "),

    TEACHERS_FEATURED_HTML: (teachers[0]
      ? `<div class="teachers__monogram" aria-hidden="true">${esc(initials(teachers[0].full_name))}</div>
          <div>
            <h3>${esc(teachers[0].full_name)}</h3>
            <p class="teachers__role">${esc(teachers[0].position)}</p>
            <p>${esc(teachers[0].biography ?? "")}</p>
          </div>`
      : ""),
    TEACHERS_HTML: teachers
      .slice(1)
      .map(
        (t) => `<div class="teacher reveal"><div class="teacher__monogram" aria-hidden="true">${esc(initials(t.full_name))}</div><h4>${esc(t.full_name)}</h4><p>${esc(t.position)}${t.ielts_score ? ` · IELTS ${esc(t.ielts_score)}` : ""}</p></div>`
      )
      .join("\n          "),

    RESULTS_HTML: results
      .map(
        (r, i) => `<div class="result${i === 0 ? " result--accent" : ""} reveal">
            <span class="result__value">${esc(r.overall)}</span>
            <span class="result__label">${esc(r.exam)} — ${esc(r.student_name)}${r.description ? ` · ${esc(r.description)}` : ""}</span>
          </div>`
      )
      .join("\n          "),

    GALLERY_HTML: media
      .map(
        (m, i) =>
          `<figure class="gallery__item${i === 0 ? " gallery__item--wide" : ""} reveal"><img src="${esc(m.file_url)}" alt="${esc(m.alt || m.title || "ADMIRE L.C. rasmi")}" loading="lazy" /></figure>`
      )
      .join("\n          "),

    RATING_CARDS_HTML: ratingCards(reviews),
    REVIEWS_HTML: reviews
      .map(
        (r) => `<blockquote class="review reveal">
            <p class="review__stars" aria-label="${r.rating} yulduz">${"★".repeat(r.rating)}</p>
            <p class="review__text">${esc(r.text)}</p>
            <footer>— ${esc(r.name)}, ${esc(r.source)}</footer>
          </blockquote>`
      )
      .join("\n          "),

    LOCATION_ADDRESS_HTML: `<strong>ADMIRE L.C.</strong><br />\n              ${esc(location_.addressLine1)}<br />\n              ${esc(location_.addressLine2)}`,
    LOCATION_COORDS_TEXT: `Koordinatalar: ${location_.latitude}, ${location_.longitude}`,
    LOCATION_HOURS_HTML: (location_.hours ?? [])
      .filter((h) => h.visible)
      .map((h) => `<li><span>${esc(h.days)}</span><span>${esc(h.time)}</span></li>`)
      .join("\n              "),
    MAPS_URL: esc(location_.mapsUrl),
    MAP_EMBED_URL: `https://maps.google.com/maps?q=${location_.latitude},${location_.longitude}&z=16&output=embed`,

    CONTACT_PHONE_HREF: `tel:${esc(String(contact.phone).replace(/\D/g, ""))}`,
    CONTACT_PHONE: esc(contact.phone),
    CONTACT_TELEGRAM_HREF: esc(contact.telegram),
    CONTACT_INSTAGRAM_HREF: esc(contact.instagram),
    CONTACT_MAPS_NOTE: esc(contact.mapsNote),
    TELEGRAM_APPLY_URL: config.botUsername ? `https://t.me/${config.botUsername}` : esc(contact.telegramReception),
    TELEGRAM_APPLY_NOTE: esc(contact.telegramApplyNote),

    FOOTER_ABOUT_HTML: footer.about,
    FOOTER_ADDRESS_HTML: footer.address,
    FOOTER_HOURS_TEXT: esc(footer.hours),
    FOOTER_COPYRIGHT: esc(footer.copyright),
  };

  let html = template;
  for (const [key, val] of Object.entries(values)) {
    html = html.split(`{{${key}}}`).join(String(val ?? ""));
  }
  html = html.split("{{VIDEOS_SECTION}}").join(videosSection(videos));
  const cfgScript = `<script>window.ADMIRE_CONFIG=${JSON.stringify({
    botUsername: config.botUsername || null,
    reception: "https://t.me/Admire_Qabulxona",
  })};</script>`;
  html = html.replace("</head>", `${cfgScript}\n</head>`);
  if (pathname === "/results") {
    return resultsPage(videos, publicContent.results());
  }
  return html;
}

function initials(name) {
  return String(name ?? "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ratingCards(reviews) {
  // Platforma reytinglari — faqat real, statik (Google/Yandex) ma'lumotlar
  return `<div class="rating-card">
            <span class="rating-card__platform">Google Maps</span>
            <span class="rating-card__score">5.0<span>★</span></span>
            <span class="rating-card__count">24 sharh asosida</span>
          </div>
          <div class="rating-card">
            <span class="rating-card__platform">Yandex Maps</span>
            <span class="rating-card__score">4.9<span>★</span></span>
            <span class="rating-card__count">17 baho asosida</span>
          </div>`;
}
