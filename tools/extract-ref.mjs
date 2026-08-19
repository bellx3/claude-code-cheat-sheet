// 레거시 A3 HTML 4장 → src/_data/ref/<surface>/*.yaml 초벌 변환.
// 일회성 도구다. 완벽하게 만들 이유가 없다 — 목적은 사람이 detail/caveat을 채울 판을 까는 것.
// A4 변형은 읽지 않는다. A4는 손으로 축약된 두 번째 원본이라 항목이 잘려 있다(실측: cheatsheet 36→29섹션).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/section-ids.json"), "utf8"));

const SHEETS = [
  { surface: "cli", file: "legacy/cheatsheet.html" },
  { surface: "desktop", file: "legacy/cheatsheet-desktop.html" },
  { surface: "slash", file: "legacy/cheatsheet-slash.html" },
  { surface: "science", file: "legacy/cheatsheet-science.html" },
];

const TODAY = process.env.EXTRACT_DATE || new Date().toISOString().slice(0, 10);

// ── HTML 유틸 ─────────────────────────────────────────────
const ENT = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
function decode(s) {
  return s.replace(/&(lt|gt|amp|quot|#39|nbsp);/g, (m) => ENT[m]);
}
function stripTags(s) {
  return decode(
    s
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\s+/g, " ")
    .trim();
}
// 레거시 시트는 표 안에서 파이프를 \| 로 이스케이프해뒀다. 데이터에서는 원래 문자로 되돌린다.
function unescapePipe(s) {
  return s.replace(/\\\|/g, "|");
}
function clean(s) {
  return unescapePipe(stripTags(s));
}

// 이모지·기호를 떼고 제목 본문만 남긴다 (매핑 키와 맞추기 위해)
function titleText(raw) {
  return stripTags(raw)
    .replace(/^[\p{Extended_Pictographic}\u{FE0F}\u{20E3}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\s]+/u, "")
    .trim();
}

// term → ascii id. 한국어만 있는 항목은 호출부에서 순번 폴백을 준다.
function slugFromTerm(term) {
  const ascii = term
    .toLowerCase()
    .replace(/[^\x00-\x7F]+/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 42)
    .replace(/^-+|-+$/g, "");
  return ascii.length >= 2 ? ascii : "";
}

function uniq(id, used) {
  if (!used.has(id)) { used.add(id); return id; }
  let n = 2;
  while (used.has(`${id}-${n}`)) n++;
  used.add(`${id}-${n}`);
  return `${id}-${n}`;
}

// ── 블록 파서 ─────────────────────────────────────────────
// 섹션 본문을 등장 순서대로 훑는다. table/pre/ul/div.desc/h3/span.warn|danger/div.rank
const BLOCK_RE =
  /<table\b[\s\S]*?<\/table>|<pre\b[\s\S]*?<\/pre>|<ul\b[\s\S]*?<\/ul>|<ol\b[\s\S]*?<\/ol>|<h3\b[\s\S]*?<\/h3>|<div class="rank"[\s\S]*?<\/div>|<div class="desc"[^>]*>[\s\S]*?<\/div>|<span class="warn"[^>]*>[\s\S]*?<\/span>|<span class="danger"[^>]*>[\s\S]*?<\/span>/gi;

function parseSectionBody(body, sectionId, stats) {
  const items = [];
  const used = new Set();
  let subhead = "";
  let anon = 0;

  const push = (o) => {
    let id = o.id || "";
    if (!id) { anon += 1; id = `${sectionId}-${anon}`; }
    o.id = uniq(id, used);
    if (subhead) o.subhead = subhead;
    items.push(o);
  };

  for (const m of body.matchAll(BLOCK_RE)) {
    const block = m[0];

    if (/^<h3/i.test(block)) {
      subhead = clean(block);
      continue;
    }

    if (/^<table/i.test(block)) {
      for (const row of block.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
        const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => c[1]);
        if (cells.length < 2) continue;
        const term = clean(cells[0]);
        const desc = clean(cells.slice(1).join(" — "));
        if (!term) continue;
        const isKbd = /class="kbd"/i.test(cells[0]);
        push({
          id: slugFromTerm(term),
          term,
          kind: isKbd ? "shortcut" : guessKind(term),
          tier: "core",
          desc,
        });
        stats.core += 1;
      }
      continue;
    }

    if (/^<pre/i.test(block)) {
      const code = unescapePipe(
        decode(block.replace(/^<pre[^>]*>/i, "").replace(/<\/pre>$/i, ""))
      ).replace(/\s+$/, "");
      if (!code.trim()) continue;
      // pre 첫 줄에서 대표 명령을 뽑아 term으로 쓴다 (없으면 순번)
      const firstCmd = code
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l && !l.startsWith("#"));
      push({
        id: slugFromTerm(firstCmd || ""),
        term: firstCmd ? firstCmd.slice(0, 60) : (subhead || "예시"),
        kind: "snippet",
        tier: "full",
        desc: subhead ? `${subhead} 예시` : "예시",
        code,
      });
      stats.full += 1;
      continue;
    }

    if (/^<(ul|ol)/i.test(block)) {
      for (const li of block.matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
        const raw = li[1];
        const bold = raw.match(/<b>([\s\S]*?)<\/b>/i);
        const text = clean(raw);
        if (!text) continue;
        const term = bold ? clean(bold[1]) : text;
        const desc = bold ? clean(raw.replace(/<b>[\s\S]*?<\/b>/i, "")).replace(/^[—\-–·\s]+/, "") : "";
        push({
          id: slugFromTerm(term),
          term: term.slice(0, 80),
          kind: bold ? guessKind(term) : "note",
          tier: "full",
          desc: desc || (bold ? "" : text),
        });
        stats.full += 1;
      }
      continue;
    }

    if (/^<div class="rank"/i.test(block)) {
      const text = clean(block);
      push({ id: "", term: text.slice(0, 60), kind: "note", tier: "full", desc: text });
      stats.full += 1;
      continue;
    }

    if (/^<div class="desc"/i.test(block)) {
      const inner = block.replace(/^<div[^>]*>/i, "").replace(/<\/div>$/i, "");
      const text = clean(inner);
      if (!text) continue;
      // 원본은 <b>Hooks</b>: ... 또는 <code>--flag</code> ... 로 라벨을 앞에 둔 경우가 많다.
      // 그 라벨을 term으로 승격해야 항목 제목이 "설명"으로 뭉개지지 않는다.
      const b = inner.match(/^\s*<b>([\s\S]*?)<\/b>\s*[::]?\s*/i);
      const c = !b && inner.match(/^\s*<code>([\s\S]*?)<\/code>/i);
      let term, desc;
      if (b) {
        term = clean(b[1]);
        desc = clean(inner.slice(b[0].length));
      } else if (c) {
        term = clean(c[1]);
        desc = clean(inner);
      } else {
        term = subhead || "설명";
        desc = text;
      }
      push({
        id: slugFromTerm(term),
        term: term.slice(0, 80),
        kind: b || c ? guessKind(term) : "note",
        tier: "full",
        desc,
      });
      stats.full += 1;
      continue;
    }

    if (/^<span class="(warn|danger)"/i.test(block)) {
      const tone = /danger/i.test(block) ? "danger" : "warn";
      const text = clean(block).replace(/^[⚠️❗🚨\s]+/u, "");
      if (!text) continue;
      // 안전 경고는 A3에도 반드시 실린다. pin이 true면 인쇄 산출물에서 누락 시 게이트가 빌드를 실패시킨다.
      push({ id: "", term: tone === "danger" ? "위험" : "주의", kind: "note", tier: "core", pin: true, tone, desc: text });
      stats.core += 1;
      stats.pinned += 1;
      continue;
    }
  }
  return items;
}

function guessKind(term) {
  if (/^\//.test(term)) return "command";
  if (/^-{1,2}[a-z]/i.test(term)) return "flag";
  if (/^(claude|npm|brew|winget|curl|irm|git|docker|python|uv|pip)\b/i.test(term)) return "command";
  if (/\.(json|toml|md|yaml|yml|sh|ps1)\b/i.test(term)) return "file";
  if (/^(Ctrl|Alt|Shift|Cmd|Esc|Tab|Option)\b/i.test(term)) return "shortcut";
  return "value";
}

// ── 실행 ──────────────────────────────────────────────────
const outRoot = path.join(ROOT, "src/_data/ref");
fs.rmSync(outRoot, { recursive: true, force: true });

const totals = { sections: 0, items: 0, core: 0, full: 0, pinned: 0, unmapped: [] };
const baseline = [];

for (const { surface, file } of SHEETS) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const dir = path.join(outRoot, surface);
  fs.mkdirSync(dir, { recursive: true });
  const map = MAP[surface];

  const sections = [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/gi)];
  for (const s of sections) {
    const body = s[2];
    const h2 = body.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    if (!h2) continue;
    const title = titleText(h2[1]);
    const entry = map[title];
    if (!entry) { totals.unmapped.push(`${surface}: ${title}`); continue; }
    const [id, group, order] = entry;

    const stats = { core: 0, full: 0, pinned: 0 };
    const items = parseSectionBody(body.replace(h2[0], ""), id, stats);
    if (!items.length) { totals.unmapped.push(`${surface}: ${title} (항목 0)`); continue; }

    const doc = {
      id,
      title,
      group,
      order,
      sheet: surface,
      summary: "",
      source: { url: "", checked_at: TODAY },
      items,
    };

    const fname = `${String(order).padStart(3, "0")}-${id}.yaml`;
    fs.writeFileSync(
      path.join(dir, fname),
      "# legacy/" + path.basename(file) + " 에서 초벌 이관. detail/example/caveat/source.url 은 사람이 채운다.\n" +
        yaml.dump(doc, { lineWidth: 100, noRefs: true, quotingType: '"' }),
      "utf8"
    );

    totals.sections += 1;
    totals.items += items.length;
    totals.core += stats.core;
    totals.full += stats.full;
    totals.pinned += stats.pinned;
    for (const it of items) baseline.push({ surface, section: id, id: it.id, term: it.term, tier: it.tier, pin: !!it.pin });
  }
}

// 이관 완료 판정용 기준선. "개수만 맞는 교체 누락"을 잡으려면 항목 단위 차집합이 필요하다.
fs.writeFileSync(
  path.join(ROOT, "tools/legacy-baseline.json"),
  JSON.stringify({ generatedAt: TODAY, total: baseline.length, items: baseline }, null, 1),
  "utf8"
);

console.log(`섹션 ${totals.sections}개 / 항목 ${totals.items}개 (core ${totals.core}, full ${totals.full}, pin ${totals.pinned})`);
console.log(`기준선: tools/legacy-baseline.json (${baseline.length}건)`);
if (totals.unmapped.length) {
  console.log(`\n매핑 누락 ${totals.unmapped.length}건:`);
  for (const u of totals.unmapped) console.log("  - " + u);
  process.exitCode = 1;
}
