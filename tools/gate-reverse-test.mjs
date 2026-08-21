// 게이트 역방향 검증. "통과한다"만 확인하면 게이트가 아무것도 안 해도 통과한다.
// 일부러 위반을 심어 각 게이트가 실제로 실패하는지 본다. 원본은 항상 복구한다.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const CASES = [
  {
    gate: "G0",
    what: "YAML 들여쓰기를 깨뜨린다",
    file: "src/_data/ref/cli/070-permission-modes.yaml",
    edit: (t) => t + "\n  bad indent here\n",
    pre: true,
  },
  {
    gate: "G1",
    what: "항목 id 를 한국어로 바꾼다",
    file: "src/_data/ref/cli/070-permission-modes.yaml",
    edit: (t) => t.replace("  - id: mode-auto\n", "  - id: 자동모드\n").replace("  - id: auto\n", "  - id: 자동모드\n"),
    pre: true,
  },
  {
    gate: "G1",
    what: "섹션 group 을 라벨 없는 값으로 바꾼다",
    file: "src/_data/ref/cli/010-install.yaml",
    edit: (t) => t.replace("group: start", "group: nosuchgroup"),
    pre: true,
  },
  {
    gate: "G2",
    what: "작업축이 없는 레퍼런스 항목을 가리키게 한다",
    file: "src/_data/tasks/pre-commit-gate.yaml",
    edit: (t) => t.replace("cli/hooks-plugins#hooks", "cli/hooks-plugins#does-not-exist"),
    pre: true,
  },
  {
    gate: "G3",
    what: "전재 불가(link_only) 프롬프트에 본문을 넣는다",
    file: "src/_data/prompts/link-official-prompt-library.yaml",
    edit: (t) => t + '\nbody: |\n  여기에 원문을 그대로 붙여넣었다고 가정한다.\n',
    pre: true,
  },
  {
    gate: "G3",
    what: "verbatim 의 라이선스를 재배포 불가로 바꾼다",
    file: "src/_data/prompts/cc0-act-as-terminal.yaml",
    edit: (t) => t.replace("source_license: CC0-1.0", "source_license: proprietary"),
    pre: true,
  },
  {
    gate: "G4",
    what: "verified: tested 에서 tested_on 을 지운다",
    file: "src/_data/prompts/pre-commit-risk-scan.yaml",
    edit: (t) => t.replace(/^tested_on:.*$/m, ""),
    pre: true,
  },
  {
    gate: "G5",
    what: "안전 경고를 tier: full 로 내려 인쇄에서 뺀다",
    file: "src/_data/ref/cli/070-permission-modes.yaml",
    edit: (t) => t.replace(/(pin: true\n    tone: warn)/, "pin: true\n    tone: warn").replace(/    tier: core\n    pin: true/, "    tier: full\n    pin: true"),
    pre: true,
  },
  {
    gate: "G6",
    what: "term 과 똑같은 desc 를 되살린다",
    file: "src/_data/ref/cli/020-cli-commands.yaml",
    // desc 줄을 새로 넣지 말 것 — 키가 중복되면 G0(YAML 파싱)이 먼저 걸려 G6 을 못 본다.
    // 있는 desc 의 값을 term 과 같게 바꾼다.
    edit: (t) => t.replace("    desc: 대화형 세션 시작\n", "    desc: claude\n"),
    pre: true,
  },
  {
    gate: "G7",
    what: "레퍼런스 섹션 파일 하나를 통째로 지운다",
    file: "src/_data/ref/cli/100-sandbox.yaml",
    edit: null, // delete
    pre: true,
  },
  {
    gate: "G8",
    what: "데이터에 로컬 사용자 경로를 넣는다",
    file: "src/_data/tasks/windows-gotchas.yaml",
    edit: (t) => t.replace("summary:", "summary_leak: C:\\Users\\someone\\secret\\notes.md\nsummary:"),
    pre: true,
  },
  {
    gate: "G10",
    what: "레이아웃에서 viewport meta 를 뺀다",
    file: "src/_includes/layouts/base.njk",
    edit: (t) => t.replace(/<meta name="viewport"[^>]*>\n/, ""),
    pre: false,
  },
  {
    gate: "G10",
    what: "탭에 role=tablist 를 붙인다",
    file: "src/_includes/layouts/base.njk",
    edit: (t) => t.replace('<nav class="topnav" aria-label="주요 영역">', '<nav class="topnav" role="tablist" aria-label="주요 영역">'),
    pre: false,
  },
  {
    gate: "G10",
    what: "목차 표시(data-toc) 없이 본문을 <details> 로 접는다",
    // 2026-08-20 개편으로 랜딩의 .tree 가 사라졌다 — 남은 접기 목차는 서피스 페이지의 .toc 다.
    file: "src/ref-surface.njk",
    edit: (t) => t.replace('<details class="toc" data-toc open>', '<details class="toc" open>'),
    pre: false,
  },
  {
    gate: "G11",
    what: "A3 인쇄 템플릿에서 경고 렌더를 삭제한다",
    file: "src/print-sheet.njk",
    edit: (t) => t.replace(/\{%- for it in core %\}\{% if it\.tone %\}[\s\S]*?\{%- endif %\}\{% endfor %\}/, ""),
    pre: false,
  },
  {
    gate: "G13",
    what: "배포 헤더·리다이렉트 파일의 passthrough 를 제거한다",
    file: "eleventy.config.mjs",
    edit: (t) => t.replace('ec.addPassthroughCopy({ "src/_headers": "_headers", "src/_redirects": "_redirects" });', ""),
    pre: false,
  },
  {
    gate: "G12",
    what: "존재하지 않는 내부 링크를 넣는다",
    // 2026-08-20 개편으로 랜딩이 리다이렉트 페이지가 됐다 — 모든 페이지가 지나는 푸터에 심는다.
    file: "src/_includes/layouts/base.njk",
    edit: (t) => t.replace('<a href="/about/">출처·라이선스</a>', '<a href="/about-does-not-exist/">출처·라이선스</a>'),
    pre: false,
  },
];

function run(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: "pipe", encoding: "utf8", shell: process.platform === "win32" });
    return { ok: true, out: "" };
  } catch (e) {
    return { ok: false, out: (e.stdout || "") + (e.stderr || "") };
  }
}

// 빌드 전에 _site 를 비운다. eleventy 는 더 이상 만들지 않는 파일을 지우지 않으므로,
// 직전 빌드의 잔재가 "산출물에 있어야 한다" 류 게이트를 통과시킨다
// (실측: passthrough 를 제거해도 옛 _site/_headers 가 남아 G13 역방향 케이스가 안 잡혔다).
function build() {
  fs.rmSync("_site", { recursive: true, force: true });
  return run("npx", ["eleventy", "--quiet"]);
}

// 기준: 손대기 전에는 통과해야 한다
process.stdout.write("기준 상태 확인… ");
build();
const base = run("node", ["tools/gate-all.mjs"]);
if (!base.ok) {
  console.log("실패 — 기준 상태에서 이미 게이트가 깨져 있다. 역방향 검증 의미 없음.\n" + base.out);
  process.exit(1);
}
console.log("통과");

let pass = 0;
const bad = [];
for (const c of CASES) {
  const orig = fs.readFileSync(c.file, "utf8");
  try {
    if (c.edit === null) fs.rmSync(c.file);
    else {
      const next = c.edit(orig);
      if (next === orig) { bad.push(`${c.gate} ${c.what} — 편집이 적용되지 않았다(패턴 불일치). 케이스가 낡았다.`); continue; }
      fs.writeFileSync(c.file, next, "utf8");
    }
    if (!c.pre) build();
    const r = run("node", ["tools/gate-all.mjs", c.pre ? "--pre" : "--post"]);
    const caught = !r.ok && r.out.includes(`[${c.gate}]`);
    if (caught) { pass += 1; console.log(`  OK  ${c.gate} — ${c.what}`); }
    else { bad.push(`${c.gate} ${c.what} — 게이트가 못 잡았다`); console.log(`  X   ${c.gate} — ${c.what}  ← 못 잡음`); }
  } finally {
    fs.writeFileSync(c.file, orig, "utf8");
  }
}

// 복구 확인 — 되돌린 뒤 다시 통과해야 한다
build();
const after = run("node", ["tools/gate-all.mjs"]);
console.log(`\n역방향 검증: ${pass}/${CASES.length} — 심은 위반을 게이트가 잡았다`);
console.log(`복구 후 재통과: ${after.ok ? "OK" : "X 실패 — 파일이 원상복구되지 않았다"}`);
for (const b of bad) console.log("  ! " + b);
if (bad.length || !after.ok) process.exitCode = 1;
