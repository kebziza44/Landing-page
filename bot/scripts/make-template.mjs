// index.html -> views/index.template.html (CMS placeholderlar bilan)
// Bir marta ishga tushiriladi: node scripts/make-template.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = fs.readFileSync(path.join(root, "..", "index.html"), "utf8");
let t = src;

function replaceOnce(find, repl, label) {
  const isRegex = find instanceof RegExp;
  const matches = isRegex
    ? (t.match(new RegExp(find.source, find.flags.includes("g") ? find.flags : find.flags + "g")) || []).length
    : t.split(find).length - 1;
  if (matches === 0) {
    throw new Error("Topilmadi: " + label);
  }
  if (matches > 1) {
    throw new Error("Bir nechta mos keldi (" + matches + "): " + label);
  }
  t = isRegex ? t.replace(find, repl) : t.replace(find, repl);
}

/* ---------- SEO ---------- */
replaceOnce(/<title>[\s\S]*?<\/title>/, "<title>{{SEO_TITLE}}</title>", "title");
replaceOnce(
  /<meta name="description" content="[^"]*" \/>/,
  '<meta name="description" content="{{SEO_DESC}}" />',
  "meta description"
);
replaceOnce(
  /<meta property="og:title" content="[^"]*" \/>/,
  '<meta property="og:title" content="{{SEO_TITLE}}" />',
  "og:title"
);
replaceOnce(
  /<meta property="og:description" content="[^"]*" \/>/,
  '<meta property="og:description" content="{{SEO_DESC}}" />',
  "og:description"
);
replaceOnce(
  /<meta property="og:image" content="[^"]*" \/>/,
  '<meta property="og:image" content="{{SEO_OG_IMAGE}}" />',
  "og:image"
);
replaceOnce(
  /<link rel="icon" type="image\/png" href="[^"]*" \/>/,
  '<link rel="icon" type="image/png" href="{{SEO_FAVICON}}" />',
  "favicon"
);

/* ---------- HERO ---------- */
replaceOnce(/<p class="hero__eyebrow reveal">[^<]*<\/p>/, '<p class="hero__eyebrow reveal">{{HERO_BADGE}}</p>', "hero badge");
replaceOnce(
  /<h1 class="hero__title reveal">[\s\S]*?<\/h1>/,
  '<h1 class="hero__title reveal">{{HERO_TITLE_HTML}}</h1>',
  "hero title"
);
replaceOnce(
  /<p class="hero__subtitle reveal">[\s\S]*?<\/p>/,
  '<p class="hero__subtitle reveal">{{HERO_SUBTITLE}}</p>',
  "hero subtitle"
);
replaceOnce(
  /<a href="tel:\+998906666677" class="btn btn--primary btn--lg">[^<]*<\/a>/,
  '<a href="{{HERO_CTA1_HREF}}" class="btn btn--primary btn--lg">{{HERO_CTA1_TEXT}}</a>',
  "hero cta1"
);
replaceOnce(
  /<a href="#location" class="btn btn--ghost btn--lg">[^<]*<\/a>/,
  '<a href="{{HERO_CTA2_HREF}}" class="btn btn--ghost btn--lg">{{HERO_CTA2_TEXT}}</a>',
  "hero cta2"
);
replaceOnce(
  /<div class="hero__badges reveal">[\s\S]*?\n      <\/div>/,
  '<div class="hero__badges reveal">{{HERO_STATS_HTML}}</div>',
  "hero stats"
);
// hero fon rasmi (picture source + img)
replaceOnce(
  /<picture class="hero__bg">[\s\S]*?<\/picture>/,
  '<picture class="hero__bg"><img src="{{HERO_BG}}" alt="{{HERO_BG_ALT}}" fetchpriority="high" /></picture>',
  "hero bg"
);

/* ---------- ABOUT ---------- */
replaceOnce(
  /(<div class="about__body">\s*<p class="section__eyebrow reveal">)[^<]*(<\/p>)/,
  "$1{{ABOUT_EYEBROW}}$2",
  "about eyebrow"
);
replaceOnce(
  /<h2 class="section__title reveal">[\s\S]*?<\/h2>\s*<p class="reveal">/,
  '<h2 class="section__title reveal">{{ABOUT_TITLE}}</h2>\n          <p class="reveal">',
  "about title"
);
replaceOnce(
  /(<h2 class="section__title reveal">{{ABOUT_TITLE}}<\/h2>\s*<p class="reveal">)[\s\S]*?(<\/p>)\s*<p class="reveal">[\s\S]*?(<\/p>)/,
  '<h2 class="section__title reveal">{{ABOUT_TITLE}}</h2>\n          <p class="reveal">{{ABOUT_LEAD}}</p>\n          <p class="reveal">{{ABOUT_TEXT}}</p>',
  "about paragraphs"
);
replaceOnce(/<ul class="about__list reveal">[\s\S]*?<\/ul>/, '<ul class="about__list reveal">{{ABOUT_FEATURES_HTML}}</ul>', "about features");
replaceOnce(
  /<img src="assets\/img\/photos\/photo-07\.jpg" alt="Admire Learning Center o‘quvchilari markaz logotipi ostida" loading="lazy" \/>/,
  '<img src="{{ABOUT_IMAGE}}" alt="{{ABOUT_IMAGE_ALT}}" loading="lazy" />',
  "about image"
);
replaceOnce(/<div class="about__media-caption">[^<]*<\/div>/, '<div class="about__media-caption">{{ABOUT_CAPTION}}</div>', "about caption");
replaceOnce(
  /<a href="#courses" class="btn btn--secondary reveal">[^<]*<\/a>/,
  '<a href="{{ABOUT_CTA_HREF}}" class="btn btn--secondary reveal">{{ABOUT_CTA_TEXT}}</a>',
  "about cta"
);

/* ---------- COURSES ---------- */
replaceOnce(
  /(<p class="section__lead reveal">)Barcha kurslar bo‘yicha[\s\S]*?(<\/p>)/,
  "$1{{COURSES_LEAD}}$2",
  "courses lead"
);
replaceOnce(/<div class="courses__grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/, '<div class="courses__grid">{{COURSES_HTML}}</div>\n      </div>\n    </section>', "courses grid");

/* ---------- TEACHERS ---------- */
replaceOnce(/<div class="teachers__featured reveal">[\s\S]*?<\/div>\s*<\/div>\s*<div class="teachers__grid">/, '<div class="teachers__featured reveal">{{TEACHERS_FEATURED_HTML}}</div>\n        <div class="teachers__grid">', "teachers featured");
replaceOnce(/<div class="teachers__grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/, '<div class="teachers__grid">{{TEACHERS_HTML}}</div>\n      </div>\n    </section>', "teachers grid");

/* ---------- RESULTS ---------- */
replaceOnce(/<div class="results__grid">[\s\S]*?<\/div>\s*<p class="results__note/, '<div class="results__grid">{{RESULTS_HTML}}</div>\n        <p class="results__note', "results grid");

/* ---------- GALLERY ---------- */
replaceOnce(/<div class="gallery__grid" id="galleryGrid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/, '<div class="gallery__grid" id="galleryGrid">{{GALLERY_HTML}}</div>\n      </div>\n    </section>', "gallery grid");

/* ---------- REVIEWS ---------- */
replaceOnce(/<div class="reviews__ratings reveal">[\s\S]*?<\/div>\s*<div class="reviews__grid">/, '<div class="reviews__ratings reveal">{{RATING_CARDS_HTML}}</div>\n        <div class="reviews__grid">', "rating cards");
replaceOnce(/<div class="reviews__grid">[\s\S]*?<\/div>\s*<div class="reviews__actions reveal">/, '<div class="reviews__grid">{{REVIEWS_HTML}}</div>\n        <div class="reviews__actions reveal">', "reviews grid");

/* ---------- LOCATION ---------- */
replaceOnce(
  /<address>[\s\S]*?<\/address>/,
  "<address>{{LOCATION_ADDRESS_HTML}}</address>",
  "location address"
);
replaceOnce(
  /<p class="location__coords">[^<]*<\/p>/,
  '<p class="location__coords">{{LOCATION_COORDS_TEXT}}</p>',
  "location coords"
);
replaceOnce(/<ul class="location__hours">[\s\S]*?<\/ul>/, '<ul class="location__hours">{{LOCATION_HOURS_HTML}}</ul>', "location hours");
replaceOnce(
  /<a class="btn btn--primary" target="_blank" rel="noopener"\s*href="https:\/\/www\.google\.com\/maps[^"]*">/,
  '<a class="btn btn--primary" target="_blank" rel="noopener" href="{{MAPS_URL}}">',
  "location maps btn"
);
replaceOnce(
  /<iframe\s+title="ADMIRE L\.C\. xaritada"\s+src="[^"]*"/,
  '<iframe\n              title="ADMIRE L.C. xaritada"\n              src="{{MAP_EMBED_URL}}"',
  "map iframe"
);

/* ---------- CONTACT ---------- */
replaceOnce(
  /<a class="contact-btn" href="tel:\+998906666677">\s*<span class="contact-btn__icon" aria-hidden="true">\s*<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"\/><\/svg>\s*<\/span>\s*<span class="contact-btn__label">Telefon qilish<small>\+998 90 666 66 77<\/small><\/span>\s*<\/a>/,
  '<a class="contact-btn" href="{{CONTACT_PHONE_HREF}}">\n            <span class="contact-btn__icon" aria-hidden="true">\n              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>\n            </span>\n            <span class="contact-btn__label">Telefon qilish<small>{{CONTACT_PHONE}}</small></span>\n          </a>',
  "contact phone btn"
);
replaceOnce(
  /<a class="contact-btn" href="https:\/\/t\.me\/admire_learning_center" target="_blank" rel="noopener">/,
  '<a class="contact-btn" href="{{CONTACT_TELEGRAM_HREF}}" target="_blank" rel="noopener">',
  "contact telegram btn"
);
replaceOnce(
  /<a class="contact-btn" href="https:\/\/www\.instagram\.com\/admire_learning_center\/" target="_blank" rel="noopener">/,
  '<a class="contact-btn" href="{{CONTACT_INSTAGRAM_HREF}}" target="_blank" rel="noopener">',
  "contact instagram btn"
);
replaceOnce(
  /<span class="contact-btn__label">Google Maps<small>Buvayda, Ibrat shaharchasi<\/small><\/span>/,
  '<span class="contact-btn__label">Google Maps<small>{{CONTACT_MAPS_NOTE}}</small></span>',
  "contact maps note"
);
replaceOnce(
  /<a class="btn btn--primary btn--lg" id="telegramApply"\s*href="https:\/\/t\.me\/Admire_Qabulxona" target="_blank" rel="noopener">/,
  '<a class="btn btn--primary btn--lg" id="telegramApply"\n             href="{{TELEGRAM_APPLY_URL}}" target="_blank" rel="noopener">',
  "telegram apply btn"
);
replaceOnce(
  /<p class="contact__telegram-note">[^<]*<\/p>/,
  '<p class="contact__telegram-note">{{TELEGRAM_APPLY_NOTE}}</p>',
  "telegram apply note"
);

/* ---------- FOOTER ---------- */
replaceOnce(
  /<p>Ingliz tili · IELTS · CEFR · SAT · Arab tili<br \/>\s*Buvayda tumani, Ibrat shaharchasi<\/p>/,
  "<p>{{FOOTER_ABOUT_HTML}}</p>",
  "footer about"
);
replaceOnce(
  /<p>Buvayda tumani, Ibrat shaharchasi,<br \/>\s*Farg‘ona viloyati, O‘zbekiston<\/p>\s*<p>06:00 – 19:00 \(Dush–Shan\)<\/p>/,
  "<p>{{FOOTER_ADDRESS_HTML}}</p>\n        <p>{{FOOTER_HOURS_TEXT}}</p>",
  "footer address"
);
replaceOnce(
  /<a href="tel:\+998906666677">\+998 90 666 66 77<\/a>/,
  '<a href="{{CONTACT_PHONE_HREF}}">{{CONTACT_PHONE}}</a>',
  "footer phone"
);
replaceOnce(
  /<p>© 2026 ADMIRE L\.C\. Barcha huquqlar himoyalangan\.<\/p>/,
  "<p>{{FOOTER_COPYRIGHT}}</p>",
  "footer copyright"
);

fs.mkdirSync(path.join(root, "views"), { recursive: true });
fs.writeFileSync(path.join(root, "views", "index.template.html"), t);
console.log("OK: views/index.template.html yaratildi (" + t.length + " belgi)");
