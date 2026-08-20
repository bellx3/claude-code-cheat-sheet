import { execSync } from "node:child_process";

// git rev-parse가 실패해도 빌드를 죽이면 안 된다 — Cloudflare Pages·Netlify 모두 빌드 실패 시
// 직전 성공본을 계속 서빙하므로, 배포 확인 장치가 오히려 "조용한 미갱신"의 원인이 된다.
// 그래서 배포 환경변수(CF Pages → Netlify) → git → "unknown" 순으로 떨어뜨린다.
function resolveSha() {
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA;
  if (process.env.COMMIT_REF) return process.env.COMMIT_REF;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function resolveBranch() {
  if (process.env.CF_PAGES_BRANCH) return process.env.CF_PAGES_BRANCH;
  if (process.env.BRANCH) return process.env.BRANCH;
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const sha = resolveSha();

export default {
  title: "Claude 참고자료",
  tagline: "하고 싶은 일에서 출발해 쓸 기능을 찾는다",
  repo: "https://github.com/bellx3/claude-code-cheat-sheet",
  sha,
  shortSha: sha.slice(0, 7),
  branch: resolveBranch(),
  builtAt: new Date().toISOString(),
  buildDate: new Date().toISOString().slice(0, 10),
};
