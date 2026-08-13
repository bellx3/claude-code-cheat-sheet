// 공식 문서 감시봇. 콘텐츠는 절대 고치지 않는다 — "여기가 바뀌었다"만 알린다.
//
// 두 층으로 본다:
//   1) llms.txt 페이지 목록  — 페이지 추가·삭제·제목 변경
//   2) 이 사이트가 실제로 인용하는 페이지들의 본문 해시 — 기존 페이지 안의 값 변경
// 2번이 핵심이다. 1번만 보면 "플래그 기본값이 바뀜" 같은 실제 노후화를 통째로 놓치고,
// 봇이 매주 "변경 없음"을 보고하는 동안 내용이 조용히 낡는다.
//
// ETag / If-Modified-Since 는 쓰지 않는다. code.claude.com 은 ETag를 안 주고
// Last-Modified 가 요청마다 갱신돼(실측) 매 실행 오탐이 난다. 본문 sha256 만 믿는다.
import fs from "node:fs";
import crypto from "node:crypto";
import refIndexFn from "../src/_data/refIndex.js";

const SNAP = "sources/watch-snapshot.json";
const META = "sources/watch-meta.json";
const LLMS = "https://code.claude.com/docs/llms.txt";

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const today = new Date().toISOString().slice(0, 10);

async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": "claude-ref-doc-watch" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

// 감시 대상은 데이터에서 도출한다. 187페이지 전수 감시면 PR이 매주 수십 건이라
// 사람이 안 읽게 되고, 그러면 봇 자체가 죽는다.
function watchedUrls() {
  const ref = refIndexFn();
  const urls = new Set();
  for (const s of ref.surfaces)
    for (const sec of s.sections)
      if (sec.source?.url) urls.add(sec.source.url.replace(/\.md$/, "") + ".md");
  return [...urls].sort();
}

const prev = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, "utf8")) : { pages: {}, bodies: {} };
const next = { fetchedAt: today, pages: {}, bodies: {} };
const changes = { added: [], removed: [], retitled: [], bodyChanged: [], errors: [] };

// ── 1층: llms.txt 페이지 목록 ─────────────────────────────
const llms = await get(LLMS);
next.llmsSha = sha(llms);
for (const line of llms.split("\n")) {
  const m = line.match(/^\s*-\s*\[([^\]]+)\]\(([^)]+)\)/);
  if (m) next.pages[m[2].trim()] = m[1].trim();
}
for (const [url, title] of Object.entries(next.pages)) {
  if (!(url in prev.pages)) changes.added.push(`${title} — ${url}`);
  else if (prev.pages[url] !== title) changes.retitled.push(`${prev.pages[url]} → ${title} (${url})`);
}
for (const url of Object.keys(prev.pages)) if (!(url in next.pages)) changes.removed.push(`${prev.pages[url]} — ${url}`);

// ── 2층: 인용 페이지 본문 해시 ────────────────────────────
// 전문은 커밋하지 않는다(라이선스). 해시와 구조 요약만 남긴다.
const targets = watchedUrls();
for (const url of targets) {
  try {
    const body = await get(url);
    // 헤딩·코드블록 목록까지 남기면 "어느 섹션이 바뀌었는지"를 전문 없이 좁힐 수 있다.
    const headings = (body.match(/^#{1,4} .+$/gm) || []).map((h) => h.trim());
    const rec = { sha: sha(body), bytes: body.length, headings: headings.length, headingSha: sha(headings.join("\n")) };
    next.bodies[url] = rec;
    const old = prev.bodies?.[url];
    if (old && old.sha !== rec.sha) {
      const what = old.headingSha !== rec.headingSha ? "구조(헤딩) 변경" : "본문 내용 변경";
      changes.bodyChanged.push(`${url} — ${what} (${old.bytes}B → ${rec.bytes}B)`);
    }
  } catch (e) {
    changes.errors.push(`${url} — ${e.message}`);
  }
}

fs.mkdirSync("sources", { recursive: true });
fs.writeFileSync(SNAP, JSON.stringify(next, null, 1) + "\n");

const total = changes.added.length + changes.removed.length + changes.retitled.length + changes.bodyChanged.length;
// 마지막 실행 시각을 사이트 푸터에 띄운다. 침묵과 사망을 구분하는 유일한 장치다.
// public 리포는 60일 무활동이면 cron이 자동으로 꺼지는데, 봇이 죽었는지 알아챌 방법이 달리 없다.
fs.writeFileSync(
  META,
  JSON.stringify({ last_run: today, watched: targets.length, indexed: Object.keys(next.pages).length, changes: total }, null, 1) + "\n"
);

console.log(`감시 대상: llms.txt ${Object.keys(next.pages).length}페이지 + 인용 페이지 ${targets.length}개`);
if (!total && !changes.errors.length) { console.log("변경 없음"); process.exit(0); }

const lines = [];
const sec = (title, arr) => { if (arr.length) lines.push(`### ${title} (${arr.length})`, ...arr.map((x) => `- ${x}`), ""); };
sec("본문 변경 — 치트시트 내용이 낡았을 수 있다", changes.bodyChanged);
sec("새 페이지", changes.added);
sec("사라진 페이지", changes.removed);
sec("제목 변경", changes.retitled);
sec("가져오기 실패", changes.errors);
const report = lines.join("\n");
fs.writeFileSync("sources/watch-report.md", report + "\n");
console.log("\n" + report);
console.log("보고서: sources/watch-report.md — 이 스크립트는 콘텐츠를 고치지 않는다. 사람이 읽고 판단할 것.");
