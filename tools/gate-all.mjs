// 데이터·산출물 게이트. 두 단계로 나뉜다.
//   --pre   빌드 전. 데이터만 본다.
//   --post  빌드 후. _site 의 실제 산출물을 읽는다 — 소스 grep은 "배선했다"만 잠근다.
// 인자 없이 부르면 둘 다(단, --post 는 _site 가 있을 때만).
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { REDISTRIBUTABLE, ORIGINS, ASCII_ID, PII_ALLOW } from "./constants.mjs";
import refIndexFn from "../src/_data/refIndex.js";
import taskIndexFn from "../src/_data/taskIndex.js";
import promptIndexFn from "../src/_data/promptIndex.js";

const args = process.argv.slice(2);
const runPre = args.includes("--pre") || (!args.includes("--post"));
const runPost = args.includes("--post") || (!args.includes("--pre"));

const errors = [];
const warns = [];
const ran = [];
const fail = (gate, msg) => errors.push(`[${gate}] ${msg}`);
const warn = (gate, msg) => warns.push(`[${gate}] ${msg}`);
const gate = (name, fn) => { ran.push(name); fn(); };

const TODAY = new Date().toISOString().slice(0, 10);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").slice(0, 10));

// ────────────────────────── PRE ──────────────────────────
if (runPre) {
  // G0 — YAML 파싱. 이게 없으면 깨진 파일이 게이트 실패가 아니라 스택 트레이스로 나와서
  //      "어느 파일의 몇 행"이 로그에 묻힌다. 데이터를 손으로 고치는 리포에서는 흔한 실패다.
  gate("G0 yaml", () => {
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) { walk(f); continue; }
        if (!/\.(yaml|yml)$/.test(e.name)) continue;
        let doc;
        try {
          doc = yaml.load(fs.readFileSync(f, "utf8"));
        } catch (err) {
          fail("G0", `${f}: YAML 파싱 실패 — ${String(err.message).split("\n")[0]}`);
          continue;
        }
        // 섹션·작업·프롬프트 파일은 최상위 id 를 가져야 한다. nav.yaml 같은 배열은 예외.
        if (/[\\/](ref|tasks|prompts)[\\/]/.test(f) && !doc?.id)
          fail("G0", `${f}: 최상위 id 가 없다`);
      }
    };
    walk("src/_data");
  });
  if (errors.length) {
    // 파싱이 깨진 상태로 아래 게이트를 돌리면 무관한 에러가 쏟아져 원인이 묻힌다.
    console.log(`게이트 ${ran.join(", ")}`);
    console.log(`\n실패 ${errors.length}건:`);
    for (const e of errors) console.log("  X " + e);
    process.exit(1);
  }

  const ref = refIndexFn();
  const tasks = taskIndexFn();
  const prompts = promptIndexFn();
  const refKeys = new Set(Object.keys(ref.byRef));

  // G1 — id 규칙과 유일성. 한국어를 slugify에 넣으면 빈 문자열이 나와
  //      DuplicatePermalinkOutputError로 빌드가 죽고, Netlify는 직전본을 계속 서빙한다.
  gate("G1 id", () => {
    for (const s of ref.surfaces) {
      const anchors = new Set();
      for (const sec of s.sections) {
        if (!ASCII_ID.test(sec.id)) fail("G1", `섹션 id 규칙 위반: ${s.id}/${sec.id} (${sec._file})`);
        for (const it of sec.items) {
          if (!ASCII_ID.test(it.id)) fail("G1", `항목 id 규칙 위반: ${it.id} (${sec._file})`);
          if (anchors.has(it.anchor)) fail("G1", `앵커 중복: ${s.id} #${it.anchor}`);
          anchors.add(it.anchor);
        }
      }
    }
    const tid = new Set();
    for (const t of tasks.all) {
      if (!ASCII_ID.test(t.id)) fail("G1", `작업 id 규칙 위반: ${t.id}`);
      if (tid.has(t.id)) fail("G1", `작업 id 중복: ${t.id}`);
      tid.add(t.id);
      if (path.basename(t._file, ".yaml") !== t.id) fail("G1", `작업 파일명≠id: ${t._file} vs ${t.id}`);
    }
    const pid = new Set();
    for (const p of prompts.all) {
      if (!ASCII_ID.test(p.id)) fail("G1", `프롬프트 id 규칙 위반: ${p.id}`);
      if (pid.has(p.id)) fail("G1", `프롬프트 id 중복: ${p.id}`);
      pid.add(p.id);
      // 스킬로 내보낼 때 slug ≡ 디렉터리명 ≡ frontmatter name 이 어긋나면 받는 쪽에서 실패한다.
      if (p._basename !== p.id) fail("G1", `프롬프트 파일명≠id: ${p._file} vs ${p.id}`);
    }
  });

  // G2 — 참조 무결성. 작업·프롬프트가 가리키는 레퍼런스 항목이 실제로 있어야 한다.
  gate("G2 refs", () => {
    for (const t of tasks.all)
      for (const s of t.steps || [])
        for (const r of s.refs || [])
          if (!refKeys.has(r)) fail("G2", `${t._file}: 없는 참조 ${r}`);
    for (const s of ref.surfaces)
      for (const sec of s.sections)
        for (const it of sec.items)
          for (const r of it.see_also || [])
            if (!refKeys.has(r)) fail("G2", `${sec._file} ${it.id}: 없는 see_also ${r}`);
    const tid = new Set(tasks.all.map((t) => t.id));
    const pid = new Set(prompts.all.map((p) => p.id));
    for (const t of tasks.all) for (const p of t.prompts || []) if (!pid.has(p)) fail("G2", `${t._file}: 없는 프롬프트 ${p}`);
    for (const p of prompts.all) for (const t of p.tasks || []) if (!tid.has(t)) fail("G2", `${p._file}: 없는 작업 ${t}`);
    for (const s of ref.surfaces)
      for (const sec of s.sections)
        for (const it of sec.items)
          for (const t of it.tasks || []) if (!tid.has(t)) fail("G2", `${sec._file} ${it.id}: 없는 작업 ${t}`);
  });

  // G3 — 프롬프트 재배포 규칙. 라이선스 판단을 코드로 잠근다.
  gate("G3 license", () => {
    for (const p of prompts.all) {
      const f = p._file;
      if (!ORIGINS.includes(p.origin)) { fail("G3", `${f}: origin 값이 잘못됨 (${p.origin})`); continue; }
      if (p.origin === "link_only") {
        // 전재 불가인데 본문이 있으면 그대로 배포된다. 여기서 막는다.
        if (p.body) fail("G3", `${f}: origin=link_only 인데 body 가 있다 — 전재 불가 출처의 본문 수록`);
        if (!p.source_url) fail("G3", `${f}: link_only 인데 source_url 이 없다`);
      } else if (!p.body) {
        fail("G3", `${f}: origin=${p.origin} 인데 body 가 없다`);
      }
      if (p.origin === "verbatim") {
        if (!REDISTRIBUTABLE.includes(p.source_license))
          fail("G3", `${f}: verbatim 인데 재배포 허용 라이선스가 아니다 (${p.source_license}). 허용: ${REDISTRIBUTABLE.join(", ")}`);
        for (const k of ["source_url", "source_author", "license_note", "license_verified_at", "retrieved_at"])
          if (!p[k]) fail("G3", `${f}: verbatim 필수 필드 누락 ${k}`);
      }
      if (p.origin === "adapted" && !(p.inspired_by || []).length)
        fail("G3", `${f}: adapted 인데 inspired_by 가 없다 — 출처 표기 없이 차용`);
      // own 에 source_license 를 요구하면 출처가 proprietary일 때 내 문장까지 link_only로 강등된다.
      if (p.origin === "own" && p.source_license)
        warn("G3", `${f}: origin=own 에 source_license 가 붙어 있다 — inspired_by 로 옮기는 게 맞다`);
    }
  });

  // G4 — 날짜. 손 입력이라 형식·미래·짝을 기계로 잡는다.
  gate("G4 dates", () => {
    const chk = (f, k, v) => {
      if (v == null) return;
      if (!isDate(v)) { fail("G4", `${f}: ${k} 날짜 형식이 아니다 (${v})`); return; }
      if (String(v).slice(0, 10) > TODAY) fail("G4", `${f}: ${k} 가 미래 날짜다 (${v})`);
    };
    for (const s of ref.surfaces)
      for (const sec of s.sections) chk(sec._file, "source.checked_at", sec.source?.checked_at);
    for (const p of prompts.all) {
      chk(p._file, "license_verified_at", p.license_verified_at);
      chk(p._file, "retrieved_at", p.retrieved_at);
      if (p.verified === "tested" && !p.tested_on)
        fail("G4", `${p._file}: verified=tested 인데 tested_on 이 없다 — 무엇으로 확인했는지 기록이 없다`);
      if (!["tested", "docs", "unverified"].includes(p.verified ?? "unverified"))
        fail("G4", `${p._file}: verified 값이 잘못됨 (${p.verified})`);
    }
  });

  // G5 — 안전 경고 보호. 실제로 일어난 사고(A4판에서 경고 2개 소실)의 회귀 테스트 절반.
  gate("G5 pin", () => {
    for (const s of ref.surfaces)
      for (const sec of s.sections)
        for (const it of sec.items) {
          if (!it.tone) continue;
          if (!it.pin) fail("G5", `${sec._file} ${it.id}: tone=${it.tone} 인데 pin 이 없다`);
          // 안전 경고를 인쇄에서 뺄 수 있는 문법 자체를 금지한다. 뺐는지 확인하는 것보다 강하다.
          if (it.tier !== "core") fail("G5", `${sec._file} ${it.id}: 안전 경고는 tier=core 여야 한다 (현재 ${it.tier})`);
        }
  });

  // G6 — A3 밀도. desc 길이 제한은 tier=core 에만 건다.
  //      전 항목에 걸면 "세부까지 싣는다"는 요구와 정면충돌한다.
  gate("G6 desc", () => {
    for (const s of ref.surfaces)
      for (const sec of s.sections)
        for (const it of sec.items) {
          if (it.tier !== "core") continue;
          if (!it.desc) { warn("G6", `${sec._file} ${it.id}: core 인데 desc 가 비어 있다`); continue; }
          if (it.desc.includes("\n")) fail("G6", `${sec._file} ${it.id}: core 의 desc 에 개행이 있다`);
          if (it.desc.length > 120) warn("G6", `${sec._file} ${it.id}: core desc 가 ${it.desc.length}자 (A3에서 줄바꿈 위험)`);
        }
  });

  // G7 — 이관 차집합. "개수만 맞는 교체 누락"은 개수 비교로 못 잡는다.
  gate("G7 legacy", () => {
    const bf = "tools/legacy-baseline.json";
    if (!fs.existsSync(bf)) { warn("G7", "기준선이 없다 — node tools/extract-ref.mjs 로 만들 것"); return; }
    const base = JSON.parse(fs.readFileSync(bf, "utf8"));
    const now = new Set(ref.all.map((i) => `${i.surface}/${i.section}#${i.id}`));
    const dropped = JSON.parse(fs.existsSync("tools/dropped.json") ? fs.readFileSync("tools/dropped.json", "utf8") : "{}");
    const missing = base.items
      .map((i) => `${i.surface}/${i.section}#${i.id}`)
      .filter((k) => !now.has(k) && !dropped[k]);
    if (missing.length)
      fail("G7", `레거시 대비 사라진 항목 ${missing.length}건 (사유 없는 누락). 예: ${missing.slice(0, 5).join(", ")}\n        의도적 제외라면 tools/dropped.json 에 사유와 함께 적을 것`);
  });

  // G8 — 개인정보·로컬 경로. 공개 사이트이므로 데이터에 들어가면 안 된다.
  //      실명 사전은 만들지 않는다 — 실명 목록을 공개 리포에 커밋하는 순간 그 파일이 유출이다.
  gate("G8 pii", () => {
    const PATTERNS = [
      [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "이메일 주소"],
      [/[A-Za-z]:[\\/](?:Users|사용자)[\\/][^\s"'`)]+/gi, "로컬 사용자 경로"],
      [/[A-Za-z]:[\\/]dev[\\/][^\s"'`)]+/gi, "로컬 개발 경로"],
      [/\b\d{6}-[1-4]\d{6}\b/g, "주민등록번호 형식"],
      [/\b(?:sk-ant-|ghp_|github_pat_|xox[baprs]-)[A-Za-z0-9_-]{8,}/g, "API 키·토큰 형식"],
    ];
    const scan = (file) => {
      const text = fs.readFileSync(file, "utf8");
      for (const [re, label] of PATTERNS) {
        for (const hit of text.match(re) || []) {
          // 문서용 자리표시자(user@server.example.com 등)는 PII가 아니다.
          if (PII_ALLOW.some((a) => a.test(hit))) continue;
          fail("G8", `${file}: ${label} 로 보이는 문자열 — ${hit.slice(0, 48)}`);
        }
      }
    };
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, e.name);
        if (e.isDirectory()) walk(f);
        else if (/\.(yaml|yml|json)$/.test(e.name)) scan(f);
      }
    };
    walk("src/_data");
  });
}

// ────────────────────────── POST ─────────────────────────
if (runPost && fs.existsSync("_site")) {
  const prompts = promptIndexFn();
  const ref = refIndexFn();

  const read = (p) => fs.readFileSync(p, "utf8");
  const decode = (s) =>
    s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
     .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " }[m]));
  const htmls = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.name.endsWith(".html")) htmls.push(f);
    }
  })("_site");

  // G9 — 인덱스 누출. 페이지에 안 띄워도 인덱스에 본문이 들어가면 전문이 정적 파일로 배포된다.
  //      소스가 아니라 산출물을 읽는 이유가 이것이다.
  gate("G9 index-leak", () => {
    const src = read("_site/search-index.js");
    const m = src.match(/^window\.SEARCH_INDEX=([\s\S]*);\s*$/);
    if (!m) { fail("G9", "search-index.js 형태가 예상과 다르다"); return; }
    const idx = JSON.parse(m[1]);
    for (const p of prompts.all) {
      if (p.origin !== "link_only") continue;
      const row = idx.find((r) => r.u === p.url);
      if (row && row.b) fail("G9", `${p.id}: link_only 인데 검색 인덱스에 본문이 들어 있다`);
      // teaches 는 내 문장이라 괜찮지만, 원문 문구가 섞였는지는 사람이 봐야 한다.
    }
    // link_only 프롬프트의 본문이 어떤 HTML에도 없어야 한다
    for (const p of prompts.all) {
      if (p.origin !== "link_only" || !p.body) continue;
      const needle = String(p.body).trim().slice(0, 40);
      for (const f of htmls) if (decode(read(f)).includes(needle)) fail("G9", `${f}: link_only 본문이 페이지에 렌더됐다 (${p.id})`);
    }
  });

  // G10 — HTML 위생. viewport 가 없으면 모바일이 980px 가상폭으로 렌더된다(레거시 8개가 그랬다).
  gate("G10 html", () => {
    for (const f of htmls) {
      const h = read(f);
      if (!/<meta name="viewport"/i.test(h)) fail("G10", `${f}: viewport meta 없음`);
      if (/user-scalable\s*=\s*no|maximum-scale/i.test(h)) fail("G10", `${f}: 확대 차단 — 접근성 위반`);
      if (!/<html lang="ko"/i.test(h)) fail("G10", `${f}: lang="ko" 없음`);
      // URL이 바뀌는 탭에 role=tab 을 붙이면 스크린리더에 잘못 알리게 된다.
      if (/role="tab(list|panel)?"/i.test(h)) fail("G10", `${f}: role=tab 계열 사용 — URL 이동형 탭은 nav+a+aria-current 여야 한다`);
      // 본문을 숨기면 Ctrl+F 에서 빠진다. 접기는 목차(details.toc)에만 허용한다.
      const main = (h.match(/<main[\s\S]*?<\/main>/i) || [""])[0];
      const dets = main.match(/<details[^>]*>/gi) || [];
      for (const d of dets) if (!/class="toc"/.test(d)) fail("G10", `${f}: 본문에 <details> — 숨긴 내용은 Ctrl+F 에서 빠진다`);
      if (/\shidden(\s|>|=)/i.test(main.replace(/<label[^>]*hidden[^>]*>/gi, ""))) warn("G10", `${f}: main 안에 hidden 속성`);
    }
  });

  // G11 — pin 항목이 A3 인쇄 산출물에 실제로 렌더됐는지. 데이터 검사(G5)는 "배선했다"까지고,
  //        이건 출력물 레벨이다. 실제로 일어난 사고의 회귀 테스트 나머지 절반.
  gate("G11 pin-in-print", () => {
    for (const s of ref.surfaces) {
      const f = `_site/print/sheet/${s.id}/index.html`;
      if (!fs.existsSync(f)) { fail("G11", `${f} 없음`); continue; }
      // 렌더된 HTML은 따옴표를 &#34; 로 이스케이프한다. 원문과 비교하려면 되돌려야 한다.
      const h = decode(read(f));
      for (const sec of s.sections)
        for (const it of sec.items) {
          if (!it.pin) continue;
          const needle = String(it.desc).trim().slice(0, 24);
          if (!h.includes(needle)) fail("G11", `${f}: pin 경고 누락 — ${sec.id}/${it.id} 「${needle}…」`);
        }
    }
  });

  // G12 — 링크 위생. 내부 링크가 실제 산출물을 가리키는지.
  gate("G12 links", () => {
    const exists = (u) => {
      const clean = u.split("#")[0].split("?")[0];
      if (!clean.startsWith("/")) return true;
      const p = clean.endsWith("/") ? path.join("_site", clean, "index.html") : path.join("_site", clean);
      return fs.existsSync(p);
    };
    const seen = new Set();
    for (const f of htmls)
      for (const m of read(f).matchAll(/href="(\/[^"]*)"/g)) {
        const u = m[1];
        if (seen.has(f + u)) continue;
        seen.add(f + u);
        if (!exists(u)) fail("G12", `${f}: 깨진 내부 링크 ${u}`);
      }
  });

  // G13 — 배포 확인용 산출물. Netlify는 빌드 실패 시 직전본을 계속 서빙하므로
  //        "고쳤다고 믿는데 방문자는 옛날 걸 본다"를 잡을 수단이 필요하다.
  gate("G13 build-json", () => {
    if (!fs.existsSync("_site/build.json")) { fail("G13", "build.json 없음"); return; }
    const b = JSON.parse(read("_site/build.json"));
    if (!b.sha || b.sha === "unknown") warn("G13", "build.json 의 sha 가 unknown — 배포본 대조가 불가능하다");
    if (!b.items) fail("G13", "build.json 에 항목 수가 없다");
    const idxCount = (read("_site/index.html").match(/레퍼런스 항목/g) || []).length;
    if (!idxCount) warn("G13", "홈에 집계 표가 안 보인다");
  });
}

// ────────────────────────── 결과 ─────────────────────────
console.log(`게이트 ${ran.length}개 실행: ${ran.join(", ")}`);
for (const w of warns) console.log("  ! " + w);
if (errors.length) {
  console.log(`\n실패 ${errors.length}건:`);
  for (const e of errors) console.log("  X " + e);
  process.exit(1);
}
console.log(`통과 (경고 ${warns.length}건)`);
