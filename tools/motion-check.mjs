// 스크롤 등장 모션이 콘텐츠를 영구히 숨기지 않는지 확인한다.
// 이 검사가 있는 이유: motion.js 를 GSAP 에서 IntersectionObserver + CSS 트랜지션으로 옮겼더니
// content-visibility:auto 인 섹션이 화면 밖에서 렌더를 건너뛰는 바람에 트랜지션이 진행되지 않고,
// 빠르게 스크롤로 지나간 섹션이 opacity 0 근처에서 굳었다(/ref/cli/ 36개 중 23개).
// "모션 때문에 본문이 안 보인다" 는 이 사이트에서 가장 비싼 실패 모드고, 게이트도 스크린샷도
// 이걸 못 잡는다 — 게이트는 스크롤을 안 하고, 전면 스크린샷은 뷰포트를 늘려 찍기 때문이다.
// 계산된 opacity 만 본다 — 인라인 스타일이든 CSS 클래스든 사용자가 보는 결과는 같다.
//
// 사용: node tools/motion-check.mjs   (Chrome 필요. npm run verify 에는 넣지 않는다)
import fs from "node:fs";
import { spawn } from "node:child_process";
import { serve } from "./serve.mjs";

const CHROME = process.env.CHROME_PATH ||
  ["C:/Program Files/Google/Chrome/Application/chrome.exe",
   "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find((c) => fs.existsSync(c));
const { server, port } = await serve("_site");
const DBG = 9722;
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${DBG}`, "about:blank"], { stdio: "ignore" });

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return r.json(); } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("CDP 연결 실패");
}
const v = await waitFor(`http://127.0.0.1:${DBG}/json/version`);
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const i = ++id; pend.set(i, (m) => (m.error ? rej(new Error(method + ": " + m.error.message)) : res(m.result)));
  ws.send(JSON.stringify({ id: i, method, params, sessionId }));
});
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);

const evalx = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + (r.exceptionDetails.exception?.description || ""));
  return r.result.value;
};

let bad = 0;
// 허브 페이지(.cards 다량)는 2026-08-20 개편으로 사라졌다 — 카드가 많은 남은 페이지는 서피스 4개다.
for (const [path, sel] of [["/ref/cli/", ".section"], ["/ref/science/", ".section"], ["/ref/desktop/", ".section"], ["/ref/slash/", ".section"]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send("Page.navigate", { url: `http://127.0.0.1:${port}${path}` }, sessionId);
  await new Promise((r) => setTimeout(r, 1200));
  const out = await evalx(`(async()=>{
    const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
    const sel=${JSON.stringify(sel)};
    const opa=(e)=>parseFloat(getComputedStyle(e).opacity);
    const all=()=>[...document.querySelectorAll(sel)];
    const n=all().length;
    const atTop=all().filter(e=>opa(e)>0.99).length;
    // content-visibility:auto 는 스크롤하면서 실제 높이가 늘어난다. 바닥이 안정될 때까지 민다.
    let y=0, guard=0;
    while(y < document.documentElement.scrollHeight && guard++ < 400){
      window.scrollTo(0,y); await wait(70); y += 500;
    }
    window.scrollTo(0,document.documentElement.scrollHeight); await wait(1200);
    window.scrollTo(0,0); await wait(400);
    // 정착을 기다린다. 고정 대기로는 마지막에 등장한 섹션이 전환 도중(0.987)에 찍혀
    // 굳은 것과 구별되지 않는다 — 실제로 그렇게 잘못 실패했다. motion.js 는 등장이 끝나면
    // 모션 클래스를 떼므로 ".rv 가 0개" 가 진짜 정착 조건이다. 정리가 망가져 클래스가
    // 남으면 타임아웃까지 기다린 뒤 그대로 측정하므로, 굳은 것을 놓치지는 않는다.
    for(let t=0; t<3000 && document.querySelectorAll('.rv').length; t+=100) await wait(100);
    await wait(150);
    // 닫힌 <dialog> 가 화면에 남아 있지 않은지. <dialog> 를 숨기는 것은 UA 의
    // dialog:not([open]){display:none} 인데 작성자 스타일이 특이도와 무관하게 UA 를 이겨서,
    // .sheetmodal{display:flex} 하나로 닫힌 모달이 페이지를 덮은 적이 있다(1382x828).
    // 스크린샷도 게이트도 못 잡았다 — 접힘 아래라 안 보였고 가로 스크롤도 안 만들었다.
    const ghosts=[...document.querySelectorAll('dialog:not([open])')]
      .filter(d=>getComputedStyle(d).display!=='none')
      .map(d=>d.id||d.className);
    // 실패할 때 "몇 개"만 알면 찾으러 다시 들어가야 한다. 무엇이 굳었는지까지 남긴다.
    const stuck=all().filter(e=>opa(e)<0.99)
      .map(e=>(e.id||e.className)+'(opacity '+getComputedStyle(e).opacity+')');
    return JSON.stringify({n,atTop,hidden:stuck.length,stuck,ghosts});
  })()`);
  const m = JSON.parse(out);
  const ok = m.n > 0 && m.hidden === 0 && m.atTop > 0 && m.atTop < m.n && m.ghosts.length === 0;
  if (!ok) bad++;
  console.log(
    `  ${ok ? "OK " : "X  "} ${path} ${sel}  대상 ${m.n} · 로드직후보임 ${m.atTop} · 스크롤후숨김 ${m.hidden}` +
      (m.stuck.length ? `\n        굳은 것: ${m.stuck.join(", ")}` : "") +
      (m.ghosts.length ? `\n        닫혔는데 보이는 dialog: ${m.ghosts.join(", ")}` : "")
  );
}
ws.close(); chrome.kill(); server.close();
console.log(bad ? `\nX ${bad}건 실패` : "\n전부 통과 — 초기에는 일부만 보이고 스크롤하면 전부 드러난다");
process.exitCode = bad ? 1 : 0;
