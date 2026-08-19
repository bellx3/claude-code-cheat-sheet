/* 스크롤 등장 모션. 예전에는 GSAP + ScrollTrigger(116KB)를 벤더링해서 썼는데, 이 사이트에서
   그 116KB가 하는 일은 "opacity/translateY 를 한 번 트랜지션하고 끝"이 전부였다. 남은 페이지
   중량의 71%였고, 이 장르(조회하고 떠나는 레퍼런스)의 체류 시간을 생각하면 모션이 다 재생되기
   전에 떠난다. IntersectionObserver + CSS 트랜지션으로 같은 동작을 만들고 걷어냈다.
   실측: 리프 페이지 163KB → 47KB.

   원본 파라미터를 그대로 옮겼다 — 카드 y10/0.45s/stagger 0.06/"top 90%",
   섹션 y14/0.5s/"top 88%", 히어로 타이핑 22ms/자.
   "top 90%" = 요소 위쪽이 뷰포트 90% 선을 넘을 때 → rootMargin 아래쪽 -10%.

   시작 상태(숨김)를 CSS 기본값으로 두지 않는 것이 이 파일의 유일한 안전 규칙이다.
   .rv 클래스는 JS가 붙일 때만 걸리므로, 이 파일이 실패하면 콘텐츠는 전부 보이는 채로 남는다.
   CSS 에 `.section { opacity: 0 }` 을 적어두는 순간 JS 한 줄 오류가 백지 페이지가 된다. */
(function () {
  "use strict";
  if (!window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  // 한 콜백에 함께 들어온 것들이 곧 "같이 등장하는 묶음"이다 — ScrollTrigger.batch 와 같은 단위.
  // 화면에 이미 걸쳐 있던 요소들은 observe 직후 한 번에 들어오므로 초기 로드에서도 순차 등장한다.
  function revealer(margin, stagger, dur) {
    return new IntersectionObserver(
      function (entries, obs) {
        var i = 0;
        for (var n = 0; n < entries.length; n++) {
          var e = entries[n];
          if (!e.isIntersecting) continue;
          var el = e.target;
          var del = stagger ? i * stagger : 0;
          if (del) el.style.setProperty("--rv-del", del.toFixed(3) + "s");
          el.classList.add("in");
          obs.unobserve(el);
          // 등장이 끝나면 모션 클래스를 아예 떼어낸다. content-visibility:auto 인 섹션은
          // 화면 밖에 있는 동안 렌더를 건너뛰어 트랜지션이 진행되지 않는다 — 빠르게 스크롤로
          // 지나가면 .in 은 붙었는데 opacity 가 0 근처에서 멈춘 채 남는다
          // (실측: /ref/cli/ 36개 중 23개가 스크롤 후에도 opacity<0.99).
          // 클래스를 떼면 스타일시트 기본값(보임)으로 돌아가므로 "안 보이는 채로 남기"가 불가능해진다.
          cleanup(el, (del + dur + 0.15) * 1000);
          i++;
        }
      },
      { rootMargin: "0px 0px " + margin + " 0px", threshold: 0 }
    );
  }

  function cleanup(el, ms) {
    setTimeout(function () {
      el.classList.remove("rv", "rv-card", "rv-sec", "in");
      el.style.removeProperty("--rv-del");
    }, ms);
  }

  function arm(nodes, cls, io) {
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.add("rv", cls);
      io.observe(nodes[i]);
    }
  }

  // ── 카드 그리드: 등장 시 살짝 떠오르며 순서대로 ──────────────
  var cardIO = revealer("-10%", 0.06, 0.45);
  document.querySelectorAll(".cards").forEach(function (grid) {
    arm(grid.querySelectorAll(":scope > li"), "rv-card", cardIO);
  });

  // ── 레퍼런스 섹션: 묶음 단위로 등장 ───────────────────────
  // content-visibility:auto 인 섹션도 contain-intrinsic-size 로 자리 상자가 잡혀 있어
  // IntersectionObserver 가 정상 관측한다. GSAP 때 필요했던 load 후 refresh 는 없어도 된다.
  arm(document.querySelectorAll(".section"), "rv-sec", revealer("-12%", 0, 0.5));

  // 홈 히어로의 타이핑 인은 없앴다 — 랜딩을 devdocs.io 형 2단(사이드바 + 안내)으로
  // 바꾸면서 히어로 자체가 사라졌다. 대상 없는 코드를 남겨두면 다음 사람이 히어로가
  // 아직 있는 줄 안다.
})();
