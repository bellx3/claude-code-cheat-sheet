// 랭커 통과율 측정. 가중치를 감으로 만지지 않기 위한 고정 케이스.
// 빌드 산출물(_site/search-index.js, _site/assets/search.js)을 그대로 쓴다 —
// 별도 구현으로 재현하면 게이트가 거짓말을 한다.
import fs from "node:fs";
import vm from "node:vm";

const idxSrc = fs.readFileSync("_site/search-index.js", "utf8");
const appSrc = fs.readFileSync("_site/assets/search.js", "utf8");
const spec = JSON.parse(fs.readFileSync("tools/search-cases.json", "utf8"));

// search.js 는 DOM에 붙어 동작한다. 최소한의 DOM 스텁으로 실제 코드를 그대로 실행하고
// search() 결과만 뽑아낸다.
const captured = {};
const sandbox = { window: {}, console };
sandbox.window.SEARCH_INDEX = null;
sandbox.location = { search: "" };
sandbox.URLSearchParams = URLSearchParams;
sandbox.setTimeout = setTimeout;
sandbox.clearTimeout = clearTimeout;
const noop = () => {};
const el = (id) => ({
  id,
  value: "",
  innerHTML: "",
  dataset: {},
  addEventListener: (ev, fn) => { (captured[id] ||= {})[ev] = fn; },
  querySelectorAll: () => [],
  blur: noop, focus: noop,
});
sandbox.document = {
  getElementById: (id) => el(id),
  addEventListener: noop,
  querySelectorAll: () => [],
  activeElement: { tagName: "BODY" },
  createElement: () => ({ style: {}, setAttribute: noop }),
  body: { appendChild: noop, removeChild: noop },
};
vm.createContext(sandbox);
vm.runInContext(idxSrc, sandbox);

// search()는 IIFE 안에 갇혀 있다. 노출용 한 줄을 덧붙여 같은 코드를 그대로 쓴다.
vm.runInContext(appSrc.replace(/\}\)\(\);\s*$/, "  window.__search = search;\n})();\n"), sandbox);
const search = sandbox.window.__search;
if (typeof search !== "function") {
  console.error("search() 를 꺼내지 못했다 — search.js 구조가 바뀌었는지 확인할 것");
  process.exit(1);
}

const RANK = spec.rank || 5;
const fails = [];
const tally = { tuned: { n: 0, pass: 0 }, holdout: { n: 0, pass: 0 } };

for (const c of spec.cases) {
  const bucket = c.holdout ? tally.holdout : tally.tuned;
  bucket.n += 1;
  const rows = search(c.q).slice(0, RANK);
  // 섹션 안 어느 항목에 떨어져도 맞는 착지인 경우가 있다. 그때는 prefix/contains로 본다.
  const match = (u) =>
    (c.want ? u === c.want : true) &&
    (c.wantPrefix ? u.startsWith(c.wantPrefix) : true) &&
    (c.wantContains ? u.includes(c.wantContains) : true) &&
    (c.want || c.wantPrefix || c.wantContains ? true : false);
  const at = rows.findIndex((r) => match(r.u));
  if (at >= 0) bucket.pass += 1;
  else
    fails.push({
      q: c.q,
      want: c.want || c.wantPrefix + (c.wantContains ? `…${c.wantContains}` : "") + "*",
      holdout: !!c.holdout,
      got: rows.slice(0, 3).map((r) => `${r.t}:${r.u}`),
    });
}

const pct = (b) => (b.n ? Math.round((b.pass / b.n) * 100) : 0);
const total = tally.tuned.n + tally.holdout.n;
const passed = tally.tuned.pass + tally.holdout.pass;

console.log(`검색 랭커 (상위 ${RANK} 안 착지)`);
console.log(`  튜닝에 쓴 케이스 : ${tally.tuned.pass}/${tally.tuned.n} (${pct(tally.tuned)}%)  ← 자기채점, 약한 증거`);
console.log(`  holdout          : ${tally.holdout.pass}/${tally.holdout.n} (${pct(tally.holdout)}%)  ← 튜닝 후 추가. 이쪽이 진짜`);
console.log(`  전체             : ${passed}/${total} (${Math.round((passed / total) * 100)}%)`);
for (const f of fails) {
  console.log(`  X ${f.holdout ? "[holdout] " : ""}「${f.q}」 기대 ${f.want}`);
  console.log(`      실제 상위3: ${f.got.join(" | ") || "(0건)"}`);
}

// 통과율을 기록으로 남긴다. 나중에 "좋아졌나"를 판정할 기준선이 된다.
fs.writeFileSync(
  "tools/search-report.json",
  JSON.stringify(
    { rank: RANK, tuned: { ...tally.tuned, pct: pct(tally.tuned) }, holdout: { ...tally.holdout, pct: pct(tally.holdout) }, fails },
    null,
    1
  ) + "\n"
);

if (process.argv.includes("--strict") && fails.length) process.exitCode = 1;
