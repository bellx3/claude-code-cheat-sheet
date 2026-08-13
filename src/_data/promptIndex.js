// 프롬프트 저장소. origin 이 라이선스 게이트의 축이다.
//   own       — 내가 쓴 것. 본문 수록, 라이선스 제약 없음
//   adapted   — 남의 아이디어를 내 문장으로 다시 쓴 것. inspired_by 로 출처 표기
//   verbatim  — 원문 그대로. source_license 가 화이트리스트에 있어야만 허용
//   link_only — 전재 불가. body 키가 있으면 빌드 실패
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const DIR = path.resolve("src/_data/prompts");

import { PROMPT_STAGES as STAGES, toYmd } from "../../tools/constants.mjs";

export default function () {
  if (!fs.existsSync(DIR)) return { all: [], stages: [] };
  const all = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => {
      const doc = yaml.load(fs.readFileSync(path.join(DIR, f), "utf8"));
      doc._file = `src/_data/prompts/${f}`;
      doc._basename = f.replace(/\.yaml$/, "");
      doc.url = `/prompts/${doc.id}/`;
      // js-yaml이 따옴표 없는 날짜를 Date로 만든다. 손 입력에 따옴표를 강제하지 않기 위해 여기서 정규화.
      for (const k of ["license_verified_at", "retrieved_at", "checked_at"]) if (doc[k]) doc[k] = toYmd(doc[k]);
      doc.slots = doc.slots || {};
      doc.slotKeys = Object.keys(doc.slots);
      return doc;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const stages = STAGES.map((s) => ({ ...s, prompts: all.filter((p) => p.stage === s.id) })).filter(
    (s) => s.prompts.length
  );

  return { all, stages };
}
