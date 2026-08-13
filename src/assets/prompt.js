/* 프롬프트 페이지: 슬롯 치환 · 복사 · .claude/commands/*.md 내려받기 */
(function () {
  "use strict";
  var pre = document.getElementById("ptext");
  if (!pre) return;
  var raw = pre.dataset.raw || pre.textContent;

  function filled() {
    var text = raw;
    document.querySelectorAll("[data-slot]").forEach(function (inp) {
      // 단일 중괄호 {key} 는 이 페이지의 폼 채우기용이지 Claude Code 런타임 치환 문법이 아니다.
      // Claude Code 쪽은 $ARGUMENTS / $1 / $name 계열이다.
      text = text.split("{" + inp.dataset.slot + "}").join(inp.value);
    });
    return text;
  }

  function repaint() {
    var code = pre.querySelector("code") || pre;
    code.textContent = filled();
  }
  document.querySelectorAll("[data-slot]").forEach(function (inp) {
    inp.addEventListener("input", repaint);
  });

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = filled();
      var done = function () {
        btn.dataset.copied = "1";
        var old = btn.textContent;
        btn.textContent = "복사됨";
        setTimeout(function () { btn.textContent = old; delete btn.dataset.copied; }, 1400);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { /* 사용자가 직접 선택하면 된다 */ }
        document.body.removeChild(ta);
      }
    });
  });

  document.querySelectorAll("[data-download]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.dataset.download;
      var title = (document.querySelector("h1") || {}).textContent || id;
      var summary = (document.querySelector(".lede") || {}).textContent || "";
      // frontmatter는 Claude Code가 받는 키만 쓴다. claude.ai 업로드로 가져갈 거면
      // name/description/license/compatibility/metadata/allowed-tools 6개로 줄여야 한다 —
      // 그 외 키가 있으면 무시가 아니라 실패한다.
      var md =
        "---\n" +
        "description: " + JSON.stringify(summary.trim()) + "\n" +
        "---\n\n" +
        "<!-- " + title.trim() + " · " + location.href + " -->\n\n" +
        // $ARGUMENTS 로 받도록 첫 슬롯을 바꿔준다
        filled().replace(/^/, "") + "\n";
      var blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = id + ".md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
  });
})();
