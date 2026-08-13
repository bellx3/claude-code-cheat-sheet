// code.claude.com/docs/llms.txt 를 받아 src/_data/officialdocs.json 으로 커밋한다.
// 빌드 중에는 네트워크를 쓰지 않는다 — Netlify 빌드가 외부 사이트 사정에 좌우되면 안 된다.
import fs from "node:fs";
import crypto from "node:crypto";

const SOURCES = [
  { key: "code", url: "https://code.claude.com/docs/llms.txt", label: "Claude Code" },
];

const out = { fetchedAt: new Date().toISOString().slice(0, 10), sources: [], pages: [] };

for (const s of SOURCES) {
  const res = await fetch(s.url, { headers: { "user-agent": "claude-ref-docs-index" } });
  if (!res.ok) {
    console.error(`${s.url} → HTTP ${res.status}`);
    process.exitCode = 1;
    continue;
  }
  const text = await res.text();
  const sha = crypto.createHash("sha256").update(text).digest("hex");
  out.sources.push({ key: s.key, url: s.url, label: s.label, bytes: text.length, sha256: sha });

  // llms.txt 는 "## 섹션" 밑에 "- [제목](URL): 설명" 목록이다.
  let section = "";
  for (const line of text.split("\n")) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) { section = h[1].trim(); continue; }
    const m = line.match(/^\s*-\s*\[([^\]]+)\]\(([^)]+)\)\s*:?\s*(.*)$/);
    if (!m) continue;
    const mdUrl = m[2].trim();
    out.pages.push({
      source: s.key,
      section,
      title: m[1].trim(),
      // llms.txt는 .md 원문 주소를 준다. 사람은 렌더된 페이지로, 에이전트는 .md로 보낸다.
      url: mdUrl.replace(/\.md$/, ""),
      mdUrl,
      blurb: (m[3] || "").trim(),
    });
  }
}

// 섹션 순서를 등장 순서대로 보존
const order = [];
for (const p of out.pages) if (!order.includes(p.section)) order.push(p.section);
out.sections = order.map((name) => ({
  name,
  pages: out.pages.filter((p) => p.section === name),
}));

fs.writeFileSync("src/_data/officialdocs.json", JSON.stringify(out, null, 1) + "\n", "utf8");
console.log(`페이지 ${out.pages.length}개 / 섹션 ${out.sections.length}개 → src/_data/officialdocs.json`);
for (const s of out.sources) console.log(`  ${s.url}  ${s.bytes}B  sha256:${s.sha256.slice(0, 16)}…`);
