// 검색 인덱스를 빌드타임에 만들어 클래식 스크립트로 낸다.
// fetch가 아니라 <script src>인 이유: 요청 1회, CORS 무관, file://에서도 동작,
// 그리고 --print-to-pdf 가 fetch 완료를 기다리지 않아 빈 페이지가 찍히는 사고가 원천 차단된다.
export default class {
  data() {
    return { permalink: "/search-index.js", eleventyExcludeFromCollections: true };
  }

  render({ refIndex, taskIndex, promptIndex, officialdocs }) {
    const rows = [];

    // 작업축이 가장 높은 가중치를 갖는다. 자연어 질의의 착지점이기 때문.
    for (const t of taskIndex.all) {
      rows.push({
        t: "task",
        w: 4,
        u: t.url,
        ti: t.title,
        s: t.summary || "",
        // phrasings — 부분문자열 검색이 "커밋 전에 자동으로"를 hooks로 잇는 유일한 다리
        k: (t.phrasings || []).join(" "),
        b: [t.intro, ...(t.steps || []).flatMap((x) => [x.what, x.how, x.code]), t.caveat]
          .filter(Boolean)
          .join(" ")
          .slice(0, 1200),
      });
    }

    for (const p of promptIndex.all) {
      rows.push({
        t: "prompt",
        w: 3,
        u: p.url,
        ti: p.title,
        s: p.summary || "",
        k: (p.tags || []).join(" "),
        // link_only 는 본문을 인덱스에도 넣지 않는다. 페이지에 안 띄워도 인덱스에 들어가면
        // 전문이 정적 파일로 배포된다 — gate-index-leak 이 산출물에서 직접 검사한다.
        b: p.origin === "link_only" ? "" : [p.body, p.teaches].filter(Boolean).join(" ").slice(0, 1200),
      });
    }

    // 레거시 HTML의 산문 블록은 term이 없어 "설명"·"주의" 같은 자리표시자가 들어간다.
    // 그대로 제목으로 쓰면 짧은 제목 보너스를 받아 조회 대상보다 위로 올라간다(실측).
    // 검색에서는 섹션 제목을 제목으로 쓰고, 짧은 제목 보너스 대상에서 뺀다.
    const PLACEHOLDER = new Set(["설명", "주의", "위험", "예시"]);

    for (const i of refIndex.all) {
      const ph = PLACEHOLDER.has(i.term);
      rows.push({
        t: "ref",
        w: 2,
        ph: ph ? 1 : undefined,
        u: i.url,
        ti: ph ? `${i.sectionTitle} — ${i.term}` : i.term,
        c: `${i.sectionTitle} · ${i.surfaceLabel}`,
        s: i.desc || "",
        // 섹션 aliases — 한국어는 활용형이 부분문자열로 안 잡힌다("샌드박스"는 "샌드박싱"의
        // 부분문자열이 아니다). 형태소 분석기를 안 쓰기로 한 이상 데이터로 메우는 수밖에 없다.
        k: (i.aliases || []).join(" "),
        b: [i.detail, i.code, i.example, i.caveat].filter(Boolean).join(" ").slice(0, 800),
      });
    }

    for (const p of officialdocs.pages) {
      rows.push({ t: "doc", w: 1, u: p.url, ti: p.title, s: p.blurb || "", b: "" });
    }

    // 허브 페이지도 착지 대상이다. "프롬프트 복사" 같은 질의가 0건으로 끝나면 안 된다.
    const hubs = [
      { u: "/task/", ti: "작업 목록", s: "하고 싶은 일에서 기능 찾기", k: "작업 할일 하고싶은 일 목록" },
      { u: "/ref/", ti: "레퍼런스 전체 목차", s: "명령어·플래그·설정 전체", k: "레퍼런스 목차 전체 명령어 목록" },
      { u: "/prompts/", ti: "프롬프트 저장소", s: "복사해서 바로 쓰는 프롬프트 모음", k: "프롬프트 복사 저장소 모음 커맨드 만들기" },
      { u: "/docs/", ti: "공식 문서 색인", s: "원문으로 바로 가기", k: "공식문서 원문 docs 링크" },
      { u: "/download/", ti: "다운로드", s: "A3 치트시트·커맨드 파일", k: "다운로드 치트시트 인쇄 pdf a3 출력" },
      { u: "/about/", ti: "출처·라이선스·한계", s: "갱신 정책과 알려진 한계", k: "라이선스 출처 한계 갱신" },
    ];
    for (const h of hubs) rows.push({ t: "hub", w: 3, ...h, b: "" });

    return `window.SEARCH_INDEX=${JSON.stringify(rows)};\n`;
  }
}
