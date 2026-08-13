// A3 지면 채움률을 잰다. "한 장에 들어간다"만 보면 지면 절반이 비어도 통과한다.
// 반대로 100% 를 넘으면 2페이지로 넘어가 치트시트가 아니게 된다. 양쪽 끝을 다 막는다.
import { spawn } from "node:child_process";
import fs from "node:fs";
import { serve } from "./serve.mjs";
import { SURFACES } from "./constants.mjs";

// A3 가로 @96dpi = 1587 x 1123 px
const W = 1587, H = 1123;
const MIN = Number(process.env.FILL_MIN || 60);   // 이보다 비면 지면 낭비
const MAX = Number(process.env.FILL_MAX || 99);   // 이보다 차면 2페이지 위험

const CHROME =
  process.env.CHROME_PATH ||
  ["C:/Program Files/Google/Chrome/Application/chrome.exe",
   "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
   "/usr/bin/google-chrome"].find((c) => fs.existsSync(c));
if (!CHROME) { console.error("Chrome 을 찾지 못했다"); process.exit(1); }

const { server, port } = await serve("_site");
const DBG = 9300 + (process.pid % 300);
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${DBG}`, "about:blank"], { stdio: "ignore" });

async function getJson(u, n = 60) {
  for (let i = 0; i < n; i++) { try { const r = await fetch(u); if (r.ok) return r.json(); } catch {} await new Promise((r) => setTimeout(r, 250)); }
  throw new Error("Chrome DevTools 에 붙지 못했다");
}
const v = await getJson(`http://127.0.0.1:${DBG}/json/version`);
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const P = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && P.has(m.id)) { P.get(m.id)(m); P.delete(m.id); } };
const send = (method, params = {}, sessionId) =>
  new Promise((res, rej) => { const i = ++id; P.set(i, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);

const rows = [];
try {
  for (const s of SURFACES) {
    await send("Page.navigate", { url: `http://127.0.0.1:${port}/print/sheet/${s.id}/` }, sessionId);
    await new Promise((r) => setTimeout(r, 900));
    const r = await send("Runtime.evaluate", {
      expression: `JSON.stringify({h:document.body.scrollHeight,w:document.body.scrollWidth,sections:document.querySelectorAll('section').length})`,
      returnByValue: true,
    }, sessionId);
    const m = JSON.parse(r.result.value);
    rows.push({ id: s.id, ...m, fill: Math.round((m.h / H) * 100) });
  }
} finally { ws.close(); chrome.kill(); server.close(); }

console.log(`A3 지면 채움률 (${W}x${H}px = A3 가로 @96dpi, 허용 ${MIN}~${MAX}%)`);
let bad = 0;
for (const r of rows) {
  const verdict = r.fill > MAX ? "X 넘침 — 2페이지 위험" : r.fill < MIN ? "! 여백 과다 — 글자를 키울 여지" : "OK";
  if (r.fill > MAX) bad += 1;
  console.log(`  ${r.id.padEnd(9)} 높이 ${String(r.h).padStart(5)}px  섹션 ${String(r.sections).padStart(2)}개  채움 ${String(r.fill).padStart(3)}%  ${verdict}`);
}
fs.mkdirSync("dist-artifacts", { recursive: true });
fs.writeFileSync("dist-artifacts/print-fill.json", JSON.stringify({ page: { W, H }, rows }, null, 1) + "\n");
if (bad) process.exitCode = 1;
