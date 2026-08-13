// 작업축 — "하고 싶은 일"에서 기능으로 착지시키는 레이어.
// 부분문자열 검색은 "커밋 전에 자동으로 뭔가 돌리고 싶다"를 hooks.PreToolUse 로 못 잇는다.
// 두 문자열에 공통 부분이 없기 때문이다. phrasings 가 그 간극을 메우는 유일한 장치다.
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const DIR = path.resolve("src/_data/tasks");

import { TASK_GROUPS as GROUPS } from "../../tools/constants.mjs";

export default function () {
  if (!fs.existsSync(DIR)) return { all: [], groups: [] };
  const all = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => {
      const doc = yaml.load(fs.readFileSync(path.join(DIR, f), "utf8"));
      doc._file = `src/_data/tasks/${f}`;
      doc.url = `/task/${doc.id}/`;
      return doc;
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.id.localeCompare(b.id));

  const groups = GROUPS.map((g) => ({ ...g, tasks: all.filter((t) => t.group === g.id) })).filter(
    (g) => g.tasks.length
  );

  return { all, groups };
}
