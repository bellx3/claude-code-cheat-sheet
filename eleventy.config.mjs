import yaml from "js-yaml";

export default function (ec) {
  // 11ty는 YAML 데이터 파일을 기본 지원하지 않는다. 이 줄이 없으면 _data/*.yaml이 조용히 무시된다.
  ec.addDataExtension("yaml,yml", (contents) => yaml.load(contents));

  ec.addPassthroughCopy({ "src/assets": "assets" });
  // 스크롤 모션(gsap-scrolltrigger 스킬)은 CDN이 아니라 벤더링한다 — 이 사이트는 지금
  // 외부 런타임 의존성이 0개고, Netlify가 빌드 실패 시 직전 성공본을 계속 서빙하는 구조상
  // CDN 장애가 "조용히 구버전 노출"로 이어질 수 있다.
  ec.addPassthroughCopy({
    "node_modules/gsap/dist/gsap.min.js": "assets/vendor/gsap/gsap.min.js",
    "node_modules/gsap/dist/ScrollTrigger.min.js": "assets/vendor/gsap/ScrollTrigger.min.js",
  });

  // 한국어 제목을 slugify에 넣으면 빈 문자열이 나와 DuplicatePermalinkOutputError로 빌드가 죽는다.
  // 모든 데이터는 사람이 정한 ascii id를 갖고, 이 필터는 그 id가 규칙을 지키는지만 본다.
  ec.addFilter("asciiId", (v) => {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(v ?? ""))) {
      throw new Error(`ascii id 규칙 위반: ${JSON.stringify(v)}`);
    }
    return v;
  });

  ec.addFilter("count", (v) => (Array.isArray(v) ? v.length : 0));

  // term 639개 중 248개(39%)가 한글이다 — 「설명」·「주의」처럼 명령이 아니라 라벨인 것들.
  // 이걸 코드 칩으로 렌더하면 잘못된 신호를 주고, 한글이 모노스페이스 폴백 페이스로 떨어져
  // 본문과 다른 글꼴로 보인다(실측: 같은 문자열이 192.9px vs 204.1px).
  ec.addFilter("hasHangul", (v) => /[가-힣]/.test(String(v ?? "")));

  // 항목이 참조하는 작업축을 역방향으로 뒤집어 "이 항목이 쓰이는 작업"을 만든다.
  ec.addFilter("tasksOf", (tasks, ids) => {
    if (!ids?.length) return [];
    return tasks.filter((t) => ids.includes(t.id));
  });

  ec.addFilter("json", (v) => JSON.stringify(v));

  // 데이터에 쓴 인라인 마크다운을 렌더한다. **굵게** 와 `코드` 두 가지만.
  // 이게 없으면 화면에 별표와 백틱이 그대로 나온다(실측으로 잡았다).
  // 마크다운 파서를 붙이지 않는 이유: 데이터에 링크·목록을 허용하면 HTML 주입 경로가 생기고,
  // 실제로 쓰는 문법은 이 둘뿐이다.
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  ec.addFilter("md", (v) => {
    if (!v) return "";
    const paras = String(v).trim().split(/\n\s*\n/);
    return paras
      .map((p) => {
        const body = esc(p.replace(/\n/g, " ").trim())
          .replace(/`([^`]+)`/g, "<code>$1</code>")
          .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        return `<p>${body}</p>`;
      })
      .join("\n");
  });

  // 줄바꿈만 살리는 버전 (caveat 처럼 한 덩어리로 보여줄 때)
  ec.addFilter("mdInline", (v) => {
    if (!v) return "";
    return esc(String(v).trim().replace(/\n/g, " "))
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  });

  ec.addFilter("ymd", (v) => (v ? String(v).slice(0, 10) : ""));

  // 마지막 확인 날짜가 얼마나 오래됐는지 화면에 띄운다. 손 입력 거짓말이 눈에 띄게 하는 장치.
  ec.addFilter("staleness", (dateStr, nowStr) => {
    if (!dateStr) return "";
    const then = Date.parse(String(dateStr).slice(0, 10));
    const now = Date.parse(String(nowStr).slice(0, 10));
    if (Number.isNaN(then) || Number.isNaN(now)) return "";
    const days = Math.round((now - then) / 86400000);
    if (days < 0) return "미래 날짜";
    if (days < 31) return `${days}일 전`;
    const months = Math.floor(days / 30);
    return `${months}개월 전`;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
