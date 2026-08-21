// _data/ref/<surface>/*.yaml 을 읽어 서피스 → 섹션 → 항목 구조로 정리한다.
// 11ty의 디렉터리 데이터 중첩(ref.cli["070-..."])에 의존하지 않는다 — 정렬과 검증을 여기서 통제한다.
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const DATA = path.resolve("src/_data/ref");

import { SURFACES, REF_GROUPS, toYmd } from "../../tools/constants.mjs";

function loadSurface(surface) {
  const dir = path.join(DATA, surface);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => {
      const doc = yaml.load(fs.readFileSync(path.join(dir, f), "utf8"));
      doc._file = `src/_data/ref/${surface}/${f}`;
      if (doc.source?.checked_at) doc.source.checked_at = toYmd(doc.source.checked_at);
      // 항목 id는 섹션 안에서만 유니크하다. 한 페이지에 섹션이 30개 넘게 올라가므로
      // 앵커는 <섹션>--<항목> 으로 만들어 서피스 전체에서 충돌하지 않게 한다.
      doc.items = (doc.items || []).map((it) => {
        const anchor = `${doc.id}--${it.id}`;
        return {
          ...it,
          // 섹션 aliases를 항목까지 내려보낸다 — 검색에서 섹션 단위 별칭이 항목에도 걸리게.
          aliases: [...(doc.aliases || []), ...(it.aliases || [])],
          anchor,
          // 딥링크 주소를 빌드타임에 완성한다. 클라이언트가 조합하지 않는다.
          url: `/ref/${surface}/#${anchor}`,
          ref: `${surface}/${doc.id}#${it.id}`,
        };
      });
      return doc;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export default function () {
  const surfaces = SURFACES.map((s) => {
    const sections = loadSurface(s.id);
    const items = sections.flatMap((sec) => sec.items);
    // 페이지 내 묶음(group). 사이드바가 이 축으로 섹션을 접어 보여준다 —
    // 라벨은 constants.mjs 의 REF_GROUPS 가 정본이고, 없으면 id 를 그대로 쓴다(G1 이 잡는다).
    const groups = [];
    for (const sec of sections) {
      let g = groups.find((x) => x.id === sec.group);
      if (!g) { g = { id: sec.group, label: REF_GROUPS[sec.group] || sec.group, sections: [] }; groups.push(g); }
      g.sections.push(sec);
    }
    return {
      ...s,
      sections,
      groups,
      itemCount: items.length,
      coreCount: items.filter((i) => i.tier === "core").length,
      detailCount: items.filter((i) => i.detail).length,
      pinCount: items.filter((i) => i.pin).length,
    };
  });

  const all = surfaces.flatMap((s) => s.sections.flatMap((sec) => sec.items.map((i) => ({ ...i, surface: s.id, surfaceLabel: s.label, section: sec.id, sectionTitle: sec.title }))));

  // "cli/permission-modes#auto" 한 줄로 항목을 가리킬 수 있게 하는 조회표.
  // 작업축·프롬프트가 이 키로 참조하고, 게이트가 실존 여부를 검사한다.
  const byRef = Object.fromEntries(all.map((i) => [i.ref, i]));

  return {
    surfaces,
    all,
    byRef,
    sectionCount: surfaces.reduce((n, s) => n + s.sections.length, 0),
    itemCount: all.length,
    coreCount: all.filter((i) => i.tier === "core").length,
    detailCount: all.filter((i) => i.detail).length,
    pinCount: all.filter((i) => i.pin).length,
  };
}
