// tools/summaries.json 의 섹션 summary 를 YAML 에 반영한다.
// 일회성이 아니라 반복 실행 가능해야 한다 — 이미 채워진 값은 건드리지 않고, 비어 있는 것만 채운다.
// (덮어쓰기로 만들면 손으로 다듬은 문장이 다음 실행에 날아간다.)
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const MAP = JSON.parse(fs.readFileSync("tools/summaries.json", "utf8"));
const force = process.argv.includes("--force");

let filled = 0, skipped = 0, missing = [];
for (const [surface, m] of Object.entries(MAP)) {
  if (surface.startsWith("_")) continue;
  const dir = `src/_data/ref/${surface}`;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".yaml")) continue;
    const file = path.join(dir, f);
    let t = fs.readFileSync(file, "utf8");
    const id = (t.match(/^id:\s*(\S+)/m) || [])[1];
    const s = m[id];
    if (!s) { missing.push(`${surface}/${id}`); continue; }

    const doc = yaml.load(t);
    if (doc.summary && !force) { skipped += 1; continue; }

    // YAML 을 다시 덤프하지 않는다 — 손으로 쓴 detail 블록의 서식이 바뀐다. 해당 줄만 교체한다.
    const block = `summary: >-\n  ${s.replace(/(.{1,96})(\s|$)/g, "$1\n  ").trim()}\n`;
    if (/^summary:\s*""\s*$/m.test(t)) t = t.replace(/^summary:\s*""\s*$/m, block.trimEnd());
    else if (/^summary:\s*>-\n(?:  .*\n)+/m.test(t)) t = t.replace(/^summary:\s*>-\n(?:  .*\n)+/m, block);
    else { missing.push(`${surface}/${id} (summary 자리를 못 찾음)`); continue; }

    fs.writeFileSync(file, t, "utf8");
    filled += 1;
  }
}

console.log(`summary 채움 ${filled}건 · 이미 있어 건너뜀 ${skipped}건`);
if (missing.length) {
  console.log(`매핑 없음 ${missing.length}건 — summaries.json 에 추가할 것:`);
  for (const x of missing) console.log("  ! " + x);
}
