/* 스크롤 모션(gsap-scrolltrigger 스킬). search.js/prompt.js 와 같은 무모듈 IIFE 패턴.
   reduced-motion 이거나 GSAP 로드가 실패하면 아무것도 등록하지 않는다 — 시작 상태를
   CSS 로 숨겨두지 않으므로 이 경우에도 콘텐츠는 기본값(전부 보임)으로 남는다. */
(function () {
  "use strict";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  // ── 카드 그리드: 등장 시 살짝 떠오르며 순서대로 ──────────────
  document.querySelectorAll(".cards").forEach(function (grid) {
    var items = grid.querySelectorAll(":scope > li");
    if (!items.length) return;
    gsap.set(items, { autoAlpha: 0, y: 10 });
    ScrollTrigger.batch(items, {
      start: "top 90%",
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: 0.06 });
      },
    });
  });

  // ── 레퍼런스 섹션: 묶음 단위로 등장 ───────────────────────
  var sections = document.querySelectorAll(".section");
  if (sections.length) {
    gsap.set(sections, { autoAlpha: 0, y: 14 });
    sections.forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec,
        start: "top 88%",
        once: true,
        onEnter: function () {
          gsap.to(sec, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" });
        },
      });
    });
    // content-visibility:auto 인 섹션은 화면 밖에 있을 때 레이아웃을 미룬다.
    // 폰트·이미지 로드 후 위치가 밀릴 수 있어 한 번 더 갱신한다.
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  // ── 홈 히어로: 프롬프트 줄 타이핑 인 (스크롤과 무관, 로드 1회) ──
  var typed = document.querySelector(".hero .promptline .typed");
  if (typed) {
    var text = typed.textContent;
    typed.textContent = "";
    var frag = document.createDocumentFragment();
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement("span");
      span.textContent = text[i];
      frag.appendChild(span);
    }
    typed.appendChild(frag);
    gsap.set(typed.children, { autoAlpha: 0 });
    gsap.to(typed.children, { autoAlpha: 1, duration: 0.01, stagger: 0.022, ease: "none" });
  }
})();
