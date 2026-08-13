// A3 치트시트 PDF 생성. Chrome headless.
//
// Git Bash 함정: file:///c/... 같은 POSIX 경로를 Chrome에 넘기면 조용히 실패하지 않는다 —
// ERR_FILE_NOT_FOUND 에러 페이지를 Letter 크기 PDF로 정상 출력한다. 파일 크기가 0이 아니라
// 성공으로 오인하기 쉽다. 반드시 Windows 절대경로(file:///D:/...)로 넘긴다.
//
// Chrome CLI 에는 용지 크기 플래그가 없다. --print-to-pdf 는 CSS @page 만 본다.
// 그래서 sheet-a3.css 의 @page { size: A3 landscape } 가 유일한 용지 지정이다.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SURFACES } from "./constants.mjs";

const OUT = "dist-artifacts";
fs.mkdirSync(OUT, { recursive: true });

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cands = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe") : null,
    // Edge는 --headless 만으로는 PDF가 안 나온다(실측, 에러 메시지도 없음). --headless=new 필요.
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  return cands.find((c) => fs.existsSync(c)) || null;
}

const chrome = findChrome();
if (!chrome) {
  console.error("Chrome/Edge 를 찾지 못했다. CHROME_PATH 환경변수로 지정할 것.");
  process.exit(1);
}
const isEdge = /msedge/i.test(chrome);
console.log(`브라우저: ${chrome}`);

const results = [];
for (const s of SURFACES) {
  const src = path.resolve(`_site/print/sheet/${s.id}/index.html`);
  if (!fs.existsSync(src)) { console.error(`X ${src} 없음 — 먼저 npm run build`); process.exitCode = 1; continue; }
  const out = path.resolve(OUT, `cheatsheet-${s.id}-a3.pdf`);
  // path.resolve 는 Windows에서 D:\... 를 준다. file URL 로 바꾼다.
  const url = "file:///" + src.replace(/\\/g, "/");
  const args = [
    isEdge ? "--headless=new" : "--headless",
    "--disable-gpu",
    "--no-sandbox",
    "--no-pdf-header-footer",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=3000",
    `--print-to-pdf=${out}`,
    url,
  ];
  try {
    execFileSync(chrome, args, { stdio: "pipe", timeout: 90000 });
  } catch (e) {
    console.error(`X ${s.id}: ${e.message}`);
    process.exitCode = 1;
    continue;
  }
  if (!fs.existsSync(out)) { console.error(`X ${s.id}: PDF 가 생성되지 않았다`); process.exitCode = 1; continue; }
  const bytes = fs.statSync(out).size;
  results.push({ id: s.id, out, bytes });
  console.log(`  ${s.id} → ${path.relative(process.cwd(), out)}  ${(bytes / 1024).toFixed(0)}KB`);
}

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({ builtAt: new Date().toISOString(), results }, null, 1) + "\n");
console.log(`\n${results.length}개 생성 → ${OUT}/`);
console.log("다음: node tools/verify-pdf.mjs — 크기만으로는 빈 카드·두부(□)·단 경계 잘림을 못 잡는다.");
