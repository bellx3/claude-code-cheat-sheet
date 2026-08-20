/* 부분문자열 검색 + 자체 랭커. 라이브러리를 쓰지 않는 이유는 취향이 아니라 측정이다.
   이 리포의 실제 데이터로 6개 방식을 돌린 결과:
     Lunr        한국어 0건 (trimmer가 한글 토큰을 빈 문자열로 만든다. 에러도 안 난다)
     Pagefind    결과 단위가 페이지. CLI가 "ko는 stemming 미지원"이라고 직접 경고
     Fuse 기본값 '-p' 검색에 503개 중 224개
     FlexSearch  Charset.CJK 소스가 {split:""} 한 줄 — 문자 단위 분해라 정밀도 붕괴
     MiniSearch  복합명사 중간 일치를 놓침 ('서브에이전트'에서 '에이전트' → 3건, 정답 8건)
   부분문자열은 조사·대시·점·중간일치를 전부 맞히고 5,030건에서도 질의당 0.21ms였다.

   구조는 랭커 1개 + 마운트 2개다. 인라인 검색창(#q, 허브 페이지)과 전역 팔레트(#pq, 모든
   페이지)가 같은 search()/render()를 쓴다 — 검색 UI를 둘로 갈라 두면 랭킹이 조용히 갈라진다.
   인덱스(251KB)는 파싱 시점이 아니라 필요한 순간에 주입한다. */
(function () {
  "use strict";

  // ── 인덱스 지연 로드 ─────────────────────────────────────
  // 예전에는 base.njk 가 blocking <script> 로 모든 페이지에 251KB를 걸었다. 검색창이 없는
  // 리프 페이지 29개는 그걸 받아놓고 쓰지 않았다. 지금은 아래 3개 경로로만 들어온다:
  //   (1) 검색창 포커스/입력  (2) / · Ctrl+K · ? 로 팔레트 열기  (3) ?q= 로 진입
  var IDX = null;
  var PRE = null;
  var loading = 0; // 0 미시작 · 1 로딩중 · 2 끝(성공/실패 모두)
  var waiting = [];

  // 필드를 미리 소문자로 만들어둔다. 매 질의마다 다시 만들지 않는다.
  function prep() {
    if (PRE) return true;
    if (!window.SEARCH_INDEX) return false;
    IDX = window.SEARCH_INDEX;
    PRE = IDX.map(function (r) {
      var ti = (r.ti || "").toLowerCase();
      var k = (r.k || "").toLowerCase();
      var s = (r.s || "").toLowerCase();
      var c = (r.c || "").toLowerCase();
      var b = (r.b || "").toLowerCase();
      return {
        ti: ti, k: k, s: s, c: c, b: b,
        nti: norm(ti), nk: norm(k), ns: norm(s), nc: norm(c),
        nall: norm(ti + k + s + c + b),
        all: ti + " " + k + " " + s + " " + c + " " + b,
      };
    });
    return true;
  }

  function ensureIndex(cb) {
    if (prep()) { if (cb) cb(true); return; }
    if (cb) waiting.push(cb);
    if (loading) return;
    loading = 1;
    var s = document.createElement("script");
    s.src = "/search-index.js";
    s.onload = function () { loading = 2; done(prep()); };
    // 인덱스만 못 받은 상태에서 검색창이 조용히 0건을 뱉으면 "없는 항목"과 구분이 안 된다.
    s.onerror = function () { loading = 2; done(false); };
    (document.head || document.body).appendChild(s);
  }

  function done(ok) {
    var q = waiting;
    waiting = [];
    for (var i = 0; i < q.length; i++) q[i](ok);
  }

  // 한국어 띄어쓰기 흔들림을 흡수한다 ("권한 모드" ↔ "권한모드")
  function norm(s) { return s.toLowerCase().replace(/\s+/g, ""); }

  var LABEL = { task: "작업", hub: "이 사이트", prompt: "프롬프트", ref: "레퍼런스", doc: "공식문서" };
  var ORDER = ["task", "hub", "prompt", "ref", "doc"];

  function search(q) {
    if (!prep()) return [];
    var toks = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    var nq = norm(q);
    var hits = [];

    for (var i = 0; i < IDX.length; i++) {
      var p = PRE[i];
      // 다중 토큰은 AND. OR로 두면 '.mcp.json' 이 mcp + json 으로 쪼개져 무관한 게 쏟아진다.
      var ok = true;
      for (var t = 0; t < toks.length; t++) {
        if (p.all.indexOf(toks[t]) === -1) { ok = false; break; }
      }
      // 붙여 쓴 질의 구제 — "권한모드" 같은 입력
      if (!ok && !(nq.length > 1 && p.nall.indexOf(nq) !== -1)) continue;

      var sc = 0;
      var first = toks[0];
      if (p.ti.indexOf(first) === 0) sc += 100;      // 제목 접두 일치
      if (allIn(p.ti, toks)) sc += 60;               // 제목 전체 포함
      if (p.k && allIn(p.k, toks)) sc += 70;         // phrasings·aliases 직격 — 사람이 일부러 적어둔 표현
      if (p.s && allIn(p.s, toks)) sc += 25;         // 요약
      if (p.c && allIn(p.c, toks)) sc += 15;         // 소속(섹션·서피스)
      if (p.b && allIn(p.b, toks)) sc += 10;         // 본문
      // 붙여 쓴 질의("권한모드")는 토큰 매칭이 전부 빗나간다. 정규화 필드로 따로 점수를 준다.
      if (nq.length > 1) {
        if (p.nti.indexOf(nq) !== -1) sc += 30;
        if (p.nk.indexOf(nq) !== -1) sc += 70;
        if (p.ns.indexOf(nq) !== -1) sc += 25;
        if (p.nc.indexOf(nq) !== -1) sc += 20;
      }
      // 조회(정확한 이름) vs 발견(설명 어휘)은 다른 랭킹을 요구한다.
      // 질의에 한글이 있으면 사용자가 이름을 모르는 상황이라 보고 설명 쪽 가중치를 올린다 —
      // 단, 복수 토큰일 때만. 「샌드박스」 같은 단일 한글 명사는 목적 서술이 아니라 조회라,
      // 이 보너스가 그 단어를 요약에 스친 작업들을 정작 그 기능의 레퍼런스 위로 올렸다(실측:
      // 작업 데이터가 늘자 /ref/cli/#sandbox--sandbox 가 6위로 밀렸다).
      if (/[가-힣]/.test(q) && toks.length > 1 && p.s && allIn(p.s, toks)) sc += 25;
      // 짧은 제목 우선 — '--resume' 이 '--resume 세션 재개 예시'보다 위로.
      // 단 자리표시자 제목(설명·주의)은 조회 대상이 아니므로 보너스에서 뺀다.
      if (!IDX[i].ph) sc += Math.max(0, 24 - p.ti.length) * 0.4;
      else sc -= 15;
      hits.push([sc * (IDX[i].w || 1), i]);
    }
    hits.sort(function (a, b) { return b[0] - a[0]; });
    return hits.map(function (h) { return IDX[h[1]]; });
  }

  function allIn(hay, toks) {
    for (var i = 0; i < toks.length; i++) if (hay.indexOf(toks[i]) === -1) return false;
    return true;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  var LIMIT = 6;
  function render(out, q, rows) {
    if (!q.trim()) { out.innerHTML = ""; return; }
    if (!rows.length) {
      // 0건에서 끝내면 막다른 길이다. 30초 안에 못 찾았을 때의 탈출구가 검색 UX의 절반이다.
      out.innerHTML =
        '<div class="empty">「' + esc(q) + '」 일치 없음.' +
        ' <a href="/ref/cli/">레퍼런스 목차</a>를 훑거나' +
        ' <a href="https://code.claude.com/docs" rel="noopener">공식 문서에서 검색 ↗</a>' +
        '<br><span class="s">치트시트에 없는 주제일 수 있습니다. 이 사이트가 다루는 범위는 ' +
        (IDX ? IDX.length : 0) + '개 항목입니다.</span></div>';
      return;
    }
    var html = "";
    for (var g = 0; g < ORDER.length; g++) {
      var kind = ORDER[g];
      var group = rows.filter(function (r) { return r.t === kind; });
      if (!group.length) continue;
      html += '<div class="group"><h3>' + LABEL[kind] + " " + group.length + "</h3>";
      for (var i = 0; i < Math.min(group.length, LIMIT); i++) {
        var r = group[i];
        var ext = /^https?:/.test(r.u);
        // 레퍼런스 항목의 39%는 「설명」·「주의」 같은 한글 라벨이라 명령이 아니다.
        // 항목 페이지(item.njk)의 hasHangul 분기와 같은 기준으로 맞춘다 — 한글을 <code>로
        // 감싸면 모노스페이스 폴백 때문에 본문과 다른 글꼴로 나온다.
        var asCode = kind === "ref" && !/[가-힣]/.test(r.ti);
        html +=
          '<a class="hit" href="' + esc(r.u) + '"' + (ext ? ' rel="noopener"' : "") + ">" +
          '<span class="t">' + (asCode ? "<code>" + esc(r.ti) + "</code>" : esc(r.ti)) + (ext ? " ↗" : "") + "</span>" +
          (r.c ? '<span class="c">' + esc(r.c) + "</span>" : "") +
          (r.s ? '<span class="s">' + esc(r.s.slice(0, 120)) + "</span>" : "") +
          "</a>";
      }
      if (group.length > LIMIT) html += '<span class="s">…외 ' + (group.length - LIMIT) + "건</span>";
      html += "</div>";
    }
    out.innerHTML = html;
  }

  // ── 마운트 ───────────────────────────────────────────────
  // 인라인(#q)과 팔레트(#pq)가 같은 코드를 돌린다. 키보드 규약도 같다.
  // combobox ARIA 풀세트는 넣지 않는다 — 반쯤 구현한 ARIA는 없는 것보다 나쁘다.
  function mount(input, out, host) {
    if (!input || !out) return null;
    var sel = -1;
    var timer;

    function items() { return Array.prototype.slice.call(out.querySelectorAll("a.hit")); }
    function mark(list) {
      list.forEach(function (a, i) { a.classList.toggle("sel", i === sel); });
      if (sel >= 0 && list[sel]) list[sel].scrollIntoView({ block: "nearest" });
    }
    function reset() {
      input.value = "";
      out.innerHTML = "";
      sel = -1;
      if (host && host.dataset) host.dataset.q = "";
    }
    function draw() {
      var q = input.value;
      // 질의 유무를 host 에 표시해 둔다 — 팔레트의 "영역 바로가기" 를 CSS로만 숨기고 켠다.
      if (host && host.dataset) host.dataset.q = q.trim() ? "1" : "";
      render(out, q, search(q));
      sel = -1;
    }
    function run() {
      // 인덱스가 아직이면 먼저 받아온다. 받는 동안 0건을 그리면 "없다"는 거짓말이 된다.
      if (prep()) { draw(); return; }
      if (!input.value.trim()) { draw(); return; }
      out.innerHTML = '<div class="empty">검색 인덱스를 불러오는 중…</div>';
      ensureIndex(function (ok) {
        if (!ok) {
          out.innerHTML = '<div class="empty">검색 인덱스를 불러오지 못했습니다. ' +
            '<a href="/ref/cli/">레퍼런스 목차</a>로 찾으세요.</div>';
          return;
        }
        draw();
      });
    }

    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(run, 60);
    });
    // 포커스만 해도 인덱스를 당겨온다 — 첫 글자 입력이 대기 없이 걸리도록.
    input.addEventListener("focus", function () { ensureIndex(null); });

    input.addEventListener("keydown", function (e) {
      var list = items();
      if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, list.length - 1); mark(list); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, -1); mark(list); }
      else if (e.key === "Enter" && sel >= 0 && list[sel]) { e.preventDefault(); list[sel].click(); }
      else if (e.key === "Escape") {
        // 팔레트는 <dialog> 가 Esc 로 알아서 닫힌다 — 여기서 값까지 건드리면 두 주체가
        // 같은 상태를 만지게 된다. 비우기는 "열 때" 한 번만 한다(reset).
        if (host && host.id === "palette") return;
        reset();
        input.blur();
      }
      else { sel = -1; }
    });

    return { input: input, out: out, run: run, reset: reset };
  }

  // 인라인 검색창의 host — 랜딩의 사이드바처럼 "질의가 있으면 목차를 접고 결과를 보이는"
  // 컨테이너가 있으면 그것을 넘긴다(data-search-host). 없으면 null 이고 동작은 예전 그대로다.
  var qBox = document.getElementById("q");
  var inlineHost = qBox && qBox.closest ? qBox.closest("[data-search-host]") : null;
  var inline = mount(qBox, document.getElementById("results"), inlineHost);
  var palette = document.getElementById("palette");
  var pal = mount(document.getElementById("pq"), document.getElementById("presults"), palette);
  var keyhelp = document.getElementById("keyhelp");

  function openDialog(d) {
    if (!d || typeof d.showModal !== "function" || d.open) return false;
    d.showModal();
    return true;
  }

  // ── 전역 키보드 ──────────────────────────────────────────
  // 규칙 하나: "검색 키는 이 페이지에서 쓸 수 있는 검색 입력으로 데려간다."
  // 허브 페이지엔 인라인 검색창이 있으니 그리로, 나머지 29개 페이지에선 팔레트를 연다.
  // 한 페이지에 검색 UI가 두 개 열리는 상황을 만들지 않는다.
  function focusSearch() {
    if (inline) {
      inline.input.focus();
      if (inline.input.select) inline.input.select();
      return;
    }
    if (!pal) return;
    // 지난 질의를 남겨두면 다시 열었을 때 낡은 결과가 한 프레임 스친다.
    // 닫힘(close 이벤트)이 아니라 열림에서 비운다 — close 는 브라우저마다 타이밍이 다르고,
    // 실제로 이 리포의 검증 브라우저에서는 dialog.close() 로 발화하지 않았다.
    pal.reset();
    if (openDialog(palette)) { ensureIndex(null); pal.input.focus(); }
  }

  function typing(el) {
    return !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
  }

  // 헤더의 검색 트리거(2026-08-20 개편) — 인라인 검색창을 없앤 뒤의 유일한 마우스 진입점.
  // hover 에서 인덱스를 미리 당겨 첫 타이핑이 로드를 기다리지 않게 한다.
  var navBtn = document.getElementById("navsearch");
  if (navBtn && navBtn.addEventListener) {
    navBtn.addEventListener("click", function () { focusSearch(); });
    navBtn.addEventListener("pointerenter", function () { ensureIndex(null); });
  }

  // 탭 바로가기 숫자는 팔레트의 "영역 바로가기" 목록에서 읽는다 — nav.yaml 을 JS에 복사하지 않는다.
  var TABS = palette
    ? Array.prototype.map.call(palette.querySelectorAll(".palette-empty a"), function (a) { return a.getAttribute("href"); })
    : [];

  document.addEventListener("keydown", function (e) {
    if (e.altKey) return;
    var act = document.activeElement;

    // Ctrl+K / Cmd+K — 브라우저 기본(주소창 검색)을 가로채는 대신 사이트 검색으로 쓴다.
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      focusSearch();
      return;
    }
    if (e.ctrlKey || e.metaKey) return;
    if (typing(act)) return;

    if (e.key === "/") { e.preventDefault(); focusSearch(); return; }
    if (e.key === "?") { e.preventDefault(); if (palette && palette.open) palette.close(); openDialog(keyhelp); return; }
    // 숫자 1..n — 상위 탭 이동. 검색 입력에 포커스가 있을 때는 위에서 걸러진다.
    if (e.key >= "1" && e.key <= "9") {
      var i = Number(e.key) - 1;
      if (TABS[i]) { e.preventDefault(); location.href = TABS[i]; }
    }
  });

  // backdrop(패널 바깥) 클릭으로 닫기. <dialog> 는 이걸 기본으로 주지 않는다.
  if (palette && palette.addEventListener) {
    palette.addEventListener("click", function (e) { if (e.target === palette) palette.close(); });
  }
  if (keyhelp && keyhelp.addEventListener) {
    keyhelp.addEventListener("click", function (e) { if (e.target === keyhelp) keyhelp.close(); });
  }

  // ?q=... 로 들어오면 바로 검색한다
  var pq = new URLSearchParams(location.search).get("q");
  if (pq && inline) {
    inline.input.value = pq;
    inline.run();
  } else if (inline && window.requestIdleCallback && window.addEventListener) {
    // 인라인 검색창이 있는 페이지 = 검색이 주 동작인 허브 페이지. 미리 받아둔다.
    // load 이후로 미루는 이유: requestIdleCallback 만 걸면 DOMContentLoaded 이전의 유휴
    // 구간에서도 발화해 251KB가 첫 렌더와 대역폭을 다툰다(실측: indexStart 320ms < DCL 331ms).
    // 리프 페이지에는 이 줄 자체가 걸리지 않으므로 251KB를 아예 받지 않는다.
    window.addEventListener("load", function () {
      window.requestIdleCallback(function () { ensureIndex(null); }, { timeout: 3000 });
    });
  }
})();
