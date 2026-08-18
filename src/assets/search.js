/* 부분문자열 검색 + 자체 랭커. 라이브러리를 쓰지 않는 이유는 취향이 아니라 측정이다.
   이 리포의 실제 데이터로 6개 방식을 돌린 결과:
     Lunr        한국어 0건 (trimmer가 한글 토큰을 빈 문자열로 만든다. 에러도 안 난다)
     Pagefind    결과 단위가 페이지. CLI가 "ko는 stemming 미지원"이라고 직접 경고
     Fuse 기본값 '-p' 검색에 503개 중 224개
     FlexSearch  Charset.CJK 소스가 {split:""} 한 줄 — 문자 단위 분해라 정밀도 붕괴
     MiniSearch  복합명사 중간 일치를 놓침 ('서브에이전트'에서 '에이전트' → 3건, 정답 8건)
   부분문자열은 조사·대시·점·중간일치를 전부 맞히고 5,030건에서도 질의당 0.21ms였다. */
(function () {
  "use strict";
  var input = document.getElementById("q");
  var out = document.getElementById("results");
  if (!input || !out || !window.SEARCH_INDEX) return;

  var IDX = window.SEARCH_INDEX;
  // 한국어 띄어쓰기 흔들림을 흡수한다 ("권한 모드" ↔ "권한모드")
  function norm(s) { return s.toLowerCase().replace(/\s+/g, ""); }

  // 필드를 미리 소문자로 만들어둔다. 매 질의마다 다시 만들지 않는다.
  var PRE = IDX.map(function (r) {
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

  var LABEL = { task: "작업", hub: "이 사이트", prompt: "프롬프트", ref: "레퍼런스", doc: "공식문서" };
  var ORDER = ["task", "hub", "prompt", "ref", "doc"];

  function search(q) {
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
      // 질의에 한글이 있으면 사용자가 이름을 모르는 상황이라 보고 설명 쪽 가중치를 올린다.
      if (/[가-힣]/.test(q) && p.s && allIn(p.s, toks)) sc += 25;
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
  function render(q, rows) {
    if (!q.trim()) { out.innerHTML = ""; return; }
    if (!rows.length) {
      // 0건에서 끝내면 막다른 길이다. 30초 안에 못 찾았을 때의 탈출구가 검색 UX의 절반이다.
      out.innerHTML =
        '<div class="empty">「' + esc(q) + '」 일치 없음.' +
        ' <a href="/ref/">레퍼런스 목차</a>를 훑거나' +
        ' <a href="https://code.claude.com/docs" rel="noopener">공식 문서에서 검색 ↗</a>' +
        '<br><span class="s">치트시트에 없는 주제일 수 있습니다. 이 사이트가 다루는 범위는 ' +
        IDX.length + '개 항목입니다.</span></div>';
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

  var timer;
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(function () { render(input.value, search(input.value)); }, 60);
  });

  // 키보드: / 로 포커스, ↑↓ 이동, Enter 이동, Esc 초기화.
  // combobox ARIA 풀세트는 넣지 않는다 — 반쯤 구현한 ARIA는 없는 것보다 나쁘다.
  var sel = -1;
  function items() { return Array.prototype.slice.call(out.querySelectorAll("a.hit")); }
  function mark(list) {
    list.forEach(function (a, i) { a.classList.toggle("sel", i === sel); });
    if (sel >= 0 && list[sel]) list[sel].scrollIntoView({ block: "nearest" });
  }
  input.addEventListener("keydown", function (e) {
    var list = items();
    if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, list.length - 1); mark(list); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, -1); mark(list); }
    else if (e.key === "Enter" && sel >= 0 && list[sel]) { e.preventDefault(); list[sel].click(); }
    else if (e.key === "Escape") { input.value = ""; out.innerHTML = ""; sel = -1; input.blur(); }
    else { sel = -1; }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== input && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      input.focus();
    }
  });

  // ?q=... 로 들어오면 바로 검색한다
  var pq = new URLSearchParams(location.search).get("q");
  if (pq) { input.value = pq; render(pq, search(pq)); }
})();
