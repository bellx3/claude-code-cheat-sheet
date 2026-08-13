// _site 를 띄우는 최소 정적 서버. 의존성 없음.
// file:// 로 검증하면 안 되는 이유: 절대경로 CSS(/assets/site.css)가 드라이브 루트로 해석돼
// 스타일 없는 페이지가 "정상"으로 찍힌다. 실제로 겪었다 — 첫 스크린샷 10장이 전부 무스타일이었고,
// PDF 도 같은 이유로 A3 가 아니라 Letter 5페이지로 나왔다.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
};

export function serve(root = "_site", port = 0) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(root, p);
    if (!path.resolve(file).startsWith(path.resolve(root))) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { "content-type": "text/plain" }).end("404 " + p); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(buf);
    });
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

// 직접 실행하면 계속 띄운다: node tools/serve.mjs 8080
// Windows 경로는 URL 인코딩되므로(한글 디렉터리) 문자열 비교로 하면 안 된다 — 조용히 안 뜬다.
// process.argv[1] 은 `node --input-type=module -e` 로 실행하면 undefined 다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2] || 8080);
  const { port: p } = await serve("_site", port);
  console.log(`http://127.0.0.1:${p}/  (Ctrl+C 로 종료)`);
}
