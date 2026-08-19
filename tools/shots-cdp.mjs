// CDP 로 뷰포트를 명시 지정해 스크린샷을 찍는다.
// --window-size 만으로는 헤드리스가 실제 뷰포트를 그대로 안 잡아서, 375 로 지정해도
// 더 넓게 렌더한 뒤 잘라낸 이미지가 나온다(실측: 오버플로가 없는데도 오른쪽이 잘려 보였다).
// Emulation.setDeviceMetricsOverride 로 못 박아야 실제 폰과 같은 조판이 나온다.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { serve } from "./serve.mjs";
import { SURFACES } from "./constants.mjs";

const OUT = "dist-artifacts/shots";
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const CHROME =
  process.env.CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].find((c) => fs.existsSync(c));
if (!CHROME) { console.error("Chrome 을 찾지 못했다"); process.exit(1); }

const { server, port } = await serve("_site");
const BASE = `http://127.0.0.1:${port}`;
const DBG = 9222 + (process.pid % 500);

const chrome = spawn(
  CHROME,
  ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", `--remote-debugging-port=${DBG}`, "about:blank"],
  { stdio: "ignore" }
);

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return r.json(); } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Chrome DevTools 에 붙지 못했다");
}
const version = await waitFor(`http://127.0.0.1:${DBG}/json/version`);
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let msgId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function send(method, params = {}, sessionId) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, (m) => (m.error ? reject(new Error(method + ": " + m.error.message)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);

async function capture(urlPath, out, { width, height, mobile, full = true, run = null }) {
  await send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: mobile ? 2 : 1, mobile,
    screenWidth: width, screenHeight: height,
  }, sessionId);
  await send("Page.navigate", { url: BASE + urlPath }, sessionId);
  // load 이벤트 + 렌더 안정화
  await new Promise((r) => setTimeout(r, 900));
  // content-visibility: auto 는 화면 밖을 페인트하지 않는다. 전체 페이지 캡처에서는
  // 아래쪽 섹션이 통째로 빈칸으로 찍힌다(실측: 6개 섹션 중 2개만 보였다).
  // 성능 최적화를 잠깐 끄고 찍는다.
  // .rv 도 같이 푼다 — 스크롤 등장 모션은 정의상 화면에 들어와야 풀리므로, 스크롤하지 않는
  // 전면 캡처에서는 접힘 아래가 통째로 백지가 된다(실측: /ref/cli/ 14,165px 중 상단 2섹션만 나옴).
  // 모션이 실제로 풀리는지는 tools/motion-check.mjs 가 스크롤하며 따로 본다.
  await send("Runtime.evaluate", {
    expression: `(()=>{const s=document.createElement('style');s.textContent=
      '*{content-visibility:visible !important}.rv{opacity:1 !important;transform:none !important}';
      document.head.appendChild(s);})()`,
  }, sessionId);
  await new Promise((r) => setTimeout(r, 400));
  // 전역 팔레트·단축키 도움말은 <dialog> 라 URL 로 도달할 수 없다. 열어놓고 찍는다.
  // captureBeyondViewport 는 top layer 를 잘라먹으므로 이때는 뷰포트 캡처로 떨어뜨린다.
  if (run) {
    await send("Runtime.evaluate", { expression: run, awaitPromise: true }, sessionId);
    await new Promise((r) => setTimeout(r, 500));
    full = false;
  }
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: full }, sessionId);
  fs.writeFileSync(out, Buffer.from(shot.data, "base64"));
  const metrics = await send("Runtime.evaluate", {
    expression: `JSON.stringify({vw:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth,nodes:document.getElementsByTagName('*').length})`,
    returnByValue: true,
  }, sessionId);
  const m = JSON.parse(metrics.result.value);
  const flag = m.sw > m.vw ? `  << 가로 스크롤! ${m.sw}>${m.vw}` : "";
  console.log(`  ${path.basename(out)}  ${(fs.statSync(out).size / 1024).toFixed(0)}KB  뷰포트 ${m.vw} · DOM ${m.nodes}${flag}`);
  return m.sw > m.vw;
}

const MOBILE = { width: 375, height: 812, mobile: true };
const DESK = { width: 1280, height: 900, mobile: false };
const A3 = { width: 1587, height: 1123, mobile: false };

let overflow = 0;
try {
  for (const s of SURFACES) overflow += (await capture(`/print/sheet/${s.id}/`, `${OUT}/a3-${s.id}.png`, A3)) ? 1 : 0;
  for (const [u, n] of [["/", "m-home"], ["/ref/cli/", "m-ref-cli"], ["/ref/", "m-ref"], ["/task/", "m-tasks"],
                        ["/task/pre-commit-gate/", "m-task"], ["/prompts/", "m-prompts"],
                        ["/prompts/pre-commit-risk-scan/", "m-prompt"], ["/docs/", "m-docs"], ["/download/", "m-download"]])
    overflow += (await capture(u, `${OUT}/${n}.png`, MOBILE)) ? 1 : 0;
  for (const [u, n] of [["/", "d-home"], ["/ref/cli/", "d-ref-cli"], ["/task/pre-commit-gate/", "d-task"]])
    overflow += (await capture(u, `${OUT}/${n}.png`, DESK)) ? 1 : 0;

  // 전역 팔레트 — 검색창이 없는 리프 페이지에서 / 를 눌렀을 때의 화면
  const OPEN_PALETTE = `new Promise((res)=>{
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'/',bubbles:true,cancelable:true}));
    const i=document.getElementById('pq'); i.value='권한';
    i.dispatchEvent(new Event('input',{bubbles:true}));
    setTimeout(res,700);
  })`;
  const OPEN_PALETTE_EMPTY = `new Promise((res)=>{
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'/',bubbles:true,cancelable:true}));
    setTimeout(res,300);
  })`;
  const OPEN_KEYHELP = `new Promise((res)=>{
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true,cancelable:true}));
    setTimeout(res,300);
  })`;
  for (const [u, n, run, dev] of [
    ["/task/pre-commit-gate/", "d-palette", OPEN_PALETTE, DESK],
    ["/task/pre-commit-gate/", "d-palette-empty", OPEN_PALETTE_EMPTY, DESK],
    ["/task/pre-commit-gate/", "d-keyhelp", OPEN_KEYHELP, DESK],
    ["/task/pre-commit-gate/", "m-palette", OPEN_PALETTE, MOBILE],
  ])
    overflow += (await capture(u, `${OUT}/${n}.png`, { ...dev, run })) ? 1 : 0;
} finally {
  ws.close();
  chrome.kill();
  server.close();
}

console.log(`\n→ ${OUT}/`);
if (overflow) { console.log(`X 가로 스크롤 ${overflow}건 — 375px 에서 잘린다`); process.exitCode = 1; }
else console.log("가로 스크롤 없음. 두부(□)·겹침은 이미지로 직접 볼 것.");
