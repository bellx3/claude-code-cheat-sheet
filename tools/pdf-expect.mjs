// PDF 에 무엇이 들어 있어야 하는지를 데이터에서 도출한다.
// 기대값을 손으로 적으면 데이터가 바뀔 때 같이 안 바뀌어 검사가 거짓말을 한다.
import fs from "node:fs";
import refIndexFn from "../src/_data/refIndex.js";

const ref = refIndexFn();
const out = {};
for (const s of ref.surfaces) {
  const core = s.sections.flatMap((sec) => sec.items.filter((i) => i.tier === "core"));
  out[s.id] = {
    // 안전 경고는 하나도 빠지면 안 된다. 실제로 일어난 사고의 회귀 테스트.
    pins: core.filter((i) => i.pin).map((i) => String(i.desc).trim()),
    // 텍스트 추출로 확인할 항목. 짧거나 기호뿐인 term 은 오탐이 많아 뺀다.
    terms: core
      .filter((i) => !i.tone && i.term && i.term.length >= 4 && /[A-Za-z가-힣]/.test(i.term))
      .map((i) => i.term.split(/\s{2,}|\s+#/)[0].trim())
      .filter((t) => t.length >= 4),
  };
}
fs.mkdirSync("dist-artifacts", { recursive: true });
fs.writeFileSync("dist-artifacts/expect.json", JSON.stringify(out, null, 1) + "\n");
for (const [k, v] of Object.entries(out)) console.log(`${k}: pin ${v.pins.length} · 확인할 term ${v.terms.length}`);
