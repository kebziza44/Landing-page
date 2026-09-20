const fs = require("fs");
const p = "D:/Sayt loyihalari/landing page Admire/js/main.js";
let s = fs.readFileSync(p, "utf8");
if (s.includes("initVideoResults")) { console.log("already patched"); process.exit(0); }
const add = `
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
`;
s = s.replace(/\}\)\(\);\s*$/, "").trimEnd() + "\n\n" + add;
fs.writeFileSync(p, s);
console.log("appended OK");
