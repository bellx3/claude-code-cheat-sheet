// 섹션마다 판정 근거가 되는 공식 문서 URL을 붙인다.
// 이 목록이 곧 감시봇의 감시 대상이 된다 — 187페이지 전수 감시는 PR이 쏟아져 아무도 안 읽는다.
// 매핑은 사람이 정한다. 자동 추정은 틀린 근거를 붙이는 것보다 낫지 않다.
import fs from "node:fs";
import path from "node:path";

const B = "https://code.claude.com/docs/en/";
const MAP = {
  cli: {
    install: "setup", "cli-commands": "cli-reference", "cli-flags": "cli-reference",
    "slash-commands": "commands", keybindings: "interactive-mode", subagents: "sub-agents",
    "permission-modes": "permission-modes", "hooks-plugins": "hooks", memory: "memory",
    sandbox: "sandboxing", "background-cloud": "agents", "new-flags": "cli-reference",
    "advanced-slash": "commands", "model-effort": "model-config", directories: "cli-reference",
    "io-format": "headless", "session-cost": "costs", "tool-permissions": "permissions",
    mcp: "mcp", "custom-commands": "skills", scripting: "headless", "session-workflow": "headless",
    "auto-review": "security-guidance", "ci-batch": "github-actions", ide: "platforms",
    "git-integrations": "headless", performance: "costs", "caching-fallback": "model-config",
    team: "admin-setup", enterprise: "settings", "practices-security": "security",
    "practices-workflow": "quickstart", "learning-path": "quickstart",
    "trouble-install": "troubleshoot-install", "trouble-runtime": "troubleshooting", links: "overview",
  },
  desktop: {
    "download-start": "desktop-quickstart", "three-tabs": "desktop", "session-setup": "desktop",
    "permission-modes": "permission-modes", "prompt-box": "desktop", "slash-commands": "commands",
    "browser-pane": "desktop", "external-browsing": "desktop", "diff-review": "desktop",
    "pr-monitor": "desktop", "workspace-layout": "desktop", "terminal-editor": "desktop",
    "view-modes": "desktop", keybindings: "desktop", usage: "costs", "computer-use": "desktop",
    sessions: "desktop", "side-chat": "desktop", "background-tasks": "desktop",
    "cloud-sessions": "cloud-environments", dispatch: "desktop", connectors: "mcp",
    "skills-plugins": "skills", "launch-json": "desktop", environments: "cloud-environments",
    enterprise: "admin-setup", "network-data": "security", "cli-mapping": "desktop",
    "feature-compare": "desktop", "shared-settings": "settings", "when-which": "desktop",
    trouble: "troubleshooting", links: "desktop",
  },
  slash: {
    "session-mgmt": "commands", "model-runtime": "model-config", "plan-control": "commands",
    "quality-security": "security-guidance", "info-diagnostics": "commands",
    "system-extend": "skills", "collab-surfaces": "commands", "settings-personal": "settings",
    "misc-utils": "commands", "team-research": "commands", extras: "commands",
    "plugin-syntax": "plugins-reference", "plugin-scope": "plugins", "plugin-top5": "discover-plugins",
    "market-lsp": "discover-plugins", "market-integrations": "discover-plugins",
    "plugin-tips": "plugins", "slash-vs-plugin": "plugins", "custom-commands": "skills",
    combos: "commands", links: "commands",
  },
  science: {
    // Claude Science 는 code.claude.com/docs 색인에 없다. 근거 URL을 억지로 붙이지 않는다 —
    // 틀린 근거는 없는 근거보다 나쁘다. 감시 대상에서도 빠진다.
  },
};

let set = 0, skipped = 0;
const missing = [];
const idx = JSON.parse(fs.readFileSync("src/_data/officialdocs.json", "utf8"));
const known = new Set(idx.pages.map((p) => p.url.replace(B, "")));

for (const [surface, m] of Object.entries(MAP)) {
  const dir = `src/_data/ref/${surface}`;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".yaml")) continue;
    const file = path.join(dir, f);
    let t = fs.readFileSync(file, "utf8");
    const id = (t.match(/^id:\s*(\S+)/m) || [])[1];
    const slug = m[id];
    if (!slug) { skipped += 1; continue; }
    if (!known.has(slug)) { missing.push(`${surface}/${id} → ${slug} (색인에 없는 페이지)`); continue; }
    const url = `${B}${slug}`;
    if (t.includes(`url: ${url}`)) { continue; }
    t = t.replace(/^(\s*)url:\s*""\s*$/m, `$1url: ${url}`);
    fs.writeFileSync(file, t, "utf8");
    set += 1;
  }
}

console.log(`source.url 지정 ${set}건 · 매핑 없음 ${skipped}건`);
if (missing.length) {
  console.log("색인에 없는 슬러그(오타이거나 문서가 옮겨졌다):");
  for (const x of missing) console.log("  ! " + x);
  process.exitCode = 1;
}
