/* ============================================================
   ADMIRE L.C. — main.js
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Sticky navbar ---------- */
  var navbar = document.getElementById("navbar");
  function onScroll() {
    navbar.classList.toggle("navbar--scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile drawer ---------- */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  var backdrop = document.getElementById("navBackdrop");

  function setMenu(open) {
    nav.classList.toggle("nav--open", open);
    burger.classList.toggle("burger--open", open);
    backdrop.classList.toggle("nav-backdrop--show", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Menyuni yopish" : "Menyuni ochish");
    document.body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () {
    setMenu(!nav.classList.contains("nav--open"));
  });
  backdrop.addEventListener("click", function () { setMenu(false); });
  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal--visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("reveal--visible"); });
  }

  /* ---------- Active nav item (scrollspy) ---------- */
  var navLinks = Array.prototype.slice.call(nav.querySelectorAll(".nav__link"));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle(
            "nav__link--active",
            a.getAttribute("href") === "#" + entry.target.id
          );
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Gallery lightbox ---------- */
  var galleryItems = Array.prototype.slice.call(document.querySelectorAll("#galleryGrid .gallery__item img"));
  var lightbox = document.getElementById("lightbox");
  var lbImg = document.getElementById("lightboxImg");
  var lbCounter = document.getElementById("lightboxCounter");
  var current = 0;

  function openLightbox(i) {
    current = i;
    lbImg.src = galleryItems[i].src;
    lbImg.alt = galleryItems[i].alt;
    lbCounter.textContent = (i + 1) + " / " + galleryItems.length;
    lightbox.hidden = false;
    requestAnimationFrame(function () { lightbox.classList.add("lightbox--open"); });
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lightbox.classList.remove("lightbox--open");
    document.body.style.overflow = "";
    setTimeout(function () { lightbox.hidden = true; }, 250);
  }
  function show(offset) {
    current = (current + offset + galleryItems.length) % galleryItems.length;
    openLightbox(current);
  }

  galleryItems.forEach(function (img, i) {
    img.closest(".gallery__item").addEventListener("click", function () { openLightbox(i); });
  });
  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  document.getElementById("lightboxPrev").addEventListener("click", function (e) { e.stopPropagation(); show(-1); });
  document.getElementById("lightboxNext").addEventListener("click", function (e) { e.stopPropagation(); show(1); });
  lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", function (e) {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") show(-1);
    if (e.key === "ArrowRight") show(1);
  });

  /* ---------- Course CTA preselect ---------- */
  var courseSelect = document.getElementById("course");
  document.querySelectorAll(".course__cta").forEach(function (cta) {
    cta.addEventListener("click", function () {
      var name = cta.getAttribute("data-course");
      Array.prototype.forEach.call(courseSelect.options, function (opt) {
        if (opt.text === name) courseSelect.value = opt.value || opt.text;
      });
      courseSelect.value = name;
    });
  });

  /* ============================================================
     CONTACT FORM
     1) POST /api/applications — ADMIRE qabul backendiga saqlanadi
        (Telegram admin bildirishnomasi bilan).
     2) Backend mavjud bo'lmasa (statik fayl sifatida ochilganda)
        — ariza matni clipboard'ga nusxalanadi va qabulxonaga
        yuborish uchun havola ko'rsatiladi. Soxta "yuborildi"
        xabari HECH QACHON ko'rsatilmaydi.
     ============================================================ */
  var form = document.getElementById("contactForm");
  var notice = document.getElementById("formNotice");
  var RECEIPTION_URL = "https://t.me/Admire_Qabulxona";

  /* Telegram qabul boti havolasi: backend ADMIRE_CONFIG beradi,
     aks holda tasdiqlangan qabulxona hisobidan foydalanamiz */
  (function initTelegramLink() {
    var cfg = window.ADMIRE_CONFIG || {};
    var url = cfg.botUsername
      ? "https://t.me/" + cfg.botUsername
      : RECEIPTION_URL;
    var link = document.getElementById("telegramApply");
    if (link) link.href = url;
  })();

  function setError(fieldName, message) {
    var field = document.getElementById(fieldName);
    var errorEl = form.querySelector('[data-error-for="' + fieldName + '"]');
    field.closest(".form__field").classList.toggle("form__field--invalid", !!message);
    if (errorEl) errorEl.textContent = message || "";
  }

  function validate() {
    var ok = true;
    var name = form.name.value.trim();
    var phone = form.phone.value.trim();
    var course = form.course.value;

    if (name.length < 2) { setError("name", "Ismingizni kiriting."); ok = false; } else setError("name", "");

    var digits = phone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 12) {
      setError("phone", "To‘g‘ri telefon raqam kiriting (masalan +998 90 000 00 00).");
      ok = false;
    } else setError("phone", "");

    if (!course) { setError("course", "Kursni tanlang."); ok = false; } else setError("course", "");

    return ok;
  }

  function buildPayload() {
    return {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      course: form.course.value,
      message: form.message.value.trim(),
      source: "admire-lc landing page"
    };
  }

  function showSuccess(number, duplicate) {
    notice.classList.add("form__notice--ok");
    notice.textContent = duplicate
      ? "Sizning arizangiz allaqachon qabul qilingan. Ariza raqami: " + number
      : "✅ Arizangiz qabul qilindi! Ariza raqamingiz: " + number + ". Qabul bo‘limi siz bilan bog‘lanadi.";
  }

  function showFallback(text) {
    var link = document.createElement("a");
    link.href = RECEIPTION_URL;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Telegram’da ochish →";
    notice.classList.remove("form__notice--ok");
    notice.textContent = text;
    notice.appendChild(document.createElement("br"));
    notice.appendChild(link);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;
    var payload = buildPayload();

    fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (r.status === 429) return { ok: false, rateLimited: true };
        if (!r.ok && r.status !== 400) throw new Error("server");
        return r.json();
      })
      .then(function (data) {
        if (data.rateLimited) {
          notice.classList.remove("form__notice--ok");
          notice.textContent = "Iltimos, bir daqiqa kuting va qaytadan yuboring.";
          return;
        }
        if (data.errors) {
          Object.keys(data.errors).forEach(function (k) { setError(k, data.errors[k]); });
          return;
        }
        if (data.ok) {
          form.reset();
          showSuccess(data.applicationNumber, !!data.duplicate);
        } else {
          showFallback("Xatolik yuz berdi. Iltimos, qabulxonaga murojaat qiling.");
        }
      })
      .catch(function () {
        // Backend mavjud emas (statik ochilgan) — halol fallback
        var text =
          "Yangi ariza (ADMIRE L.C.)\n" +
          "Ism: " + payload.name + "\n" +
          "Telefon: " + payload.phone + "\n" +
          "Kurs: " + payload.course + "\n" +
          (payload.message ? "Xabar: " + payload.message : "");
        form.reset();
        var copied = navigator.clipboard && navigator.clipboard.writeText;
        if (copied) {
          navigator.clipboard.writeText(text).then(
            function () {
              showFallback("Xabar matni nusxalandi. Qabulxona hisobiga yuboring (@Admire_Qabulxona) yoki +998 90 666 66 77 raqamiga qo‘ng‘iroq qiling.");
            },
            function () {
              showFallback("Iltimos, qabulxonaga murojaat qiling: @Admire_Qabulxona yoki +998 90 666 66 77");
            }
          );
        } else {
          showFallback("Iltimos, qabulxonaga murojaat qiling: @Admire_Qabulxona yoki +998 90 666 66 77");
        }
      });
  });


  /* ---------- Video results carousel + modal ---------- */
  (function initVideoResults() {
    var track = document.getElementById("vresTrack");
    var modal = document.getElementById("vmodal");

    if (track) {
      var prev = document.getElementById("vresPrev");
      var next = document.getElementById("vresNext");
      var dots = document.getElementById("vresDots");

      function cardsPerView() {
        if (window.innerWidth <= 640) return 1;
        if (window.innerWidth <= 1024) return 2;
        return 3;
      }
      function pageCount() {
        return Math.max(1, Math.ceil(track.children.length / cardsPerView()));
      }
      function currentPage() {
        return Math.round(track.scrollLeft / track.clientWidth);
      }
      function buildDots() {
        if (!dots) return;
        dots.innerHTML = "";
        for (var i = 0; i < pageCount(); i++) {
          var b = document.createElement("button");
          b.className = "vres__dot" + (i === currentPage() ? " vres__dot--active" : "");
          b.setAttribute("aria-label", (i + 1) + "-sahifa");
          (function (idx) {
            b.addEventListener("click", function () { scrollToPage(idx); });
          })(i);
          dots.appendChild(b);
        }
      }
      function scrollToPage(p) {
        track.scrollTo({ left: p * track.clientWidth, behavior: "smooth" });
      }
      function page() { return Math.min(pageCount() - 1, Math.max(0, currentPage())); }
      prev.addEventListener("click", function () { scrollToPage(page() - 1); });
      next.addEventListener("click", function () { scrollToPage(page() + 1); });
      track.addEventListener("scroll", buildDots, { passive: true });
      window.addEventListener("resize", buildDots);
      track.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); scrollToPage(page() - 1); }
        if (e.key === "ArrowRight") { e.preventDefault(); scrollToPage(page() + 1); }
      });
      var dragging = false, startX = 0, startScroll = 0, moved = 0;
      track.addEventListener("mousedown", function (e) {
        dragging = true; moved = 0;
        startX = e.pageX; startScroll = track.scrollLeft;
        track.classList.add("vres__track--dragging");
      });
      window.addEventListener("mousemove", function (e) {
        if (!dragging) return;
        var dx = e.pageX - startX;
        moved = Math.abs(dx);
        track.scrollLeft = startScroll - dx;
      });
      window.addEventListener("mouseup", function () {
        dragging = false;
        track.classList.remove("vres__track--dragging");
      });
      track.addEventListener("click", function (e) {
        if (moved > 8) { e.preventDefault(); e.stopPropagation(); moved = 0; }
      }, true);
      buildDots();
    }

    if (modal) {
      var player = document.getElementById("vmodalPlayer");
      var info = document.getElementById("vmodalInfo");
      var closeBtn = document.getElementById("vmodalClose");
      var lastFocus = null;

      function openModal(card) {
        var source = card.getAttribute("data-video-source");
        var embed = card.getAttribute("data-video-embed");
        var src = card.getAttribute("data-video-src");
        var title = card.getAttribute("data-video-title");
        var student = card.getAttribute("data-video-student");
        var result = card.getAttribute("data-video-result");
        var desc = card.getAttribute("data-video-desc");

        if (source === "youtube" && embed) {
          player.innerHTML = '<iframe src="' + embed + '?autoplay=1" title="' + title + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
        } else if (src) {
          player.innerHTML = '<video controls preload="metadata" src="' + src + '"></video>';
        } else {
          return;
        }
        var h = "<h3>" + title + "</h3>";
        if (result) h += '<p class="vmodal__result">' + result + "</p>";
        if (student) h += "<p>" + student + "</p>";
        if (desc) h += "<p>" + desc + "</p>";
        info.innerHTML = h;

        lastFocus = document.activeElement;
        modal.hidden = false;
        requestAnimationFrame(function () { modal.classList.add("vmodal--open"); });
        document.body.style.overflow = "hidden";
        closeBtn.focus();
      }
      function closeModal() {
        modal.classList.remove("vmodal--open");
        document.body.style.overflow = "";
        setTimeout(function () {
          modal.hidden = true;
          player.innerHTML = "";
        }, 250);
        if (lastFocus) lastFocus.focus();
      }
      document.querySelectorAll(".vres__card").forEach(function (card) {
        card.addEventListener("click", function () { openModal(card); });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(card); }
        });
      });
      closeBtn.addEventListener("click", closeModal);
      modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !modal.hidden) closeModal();
      });
    }
  })();

})();
