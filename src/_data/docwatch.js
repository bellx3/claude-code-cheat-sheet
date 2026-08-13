// 감시봇 하트비트를 사이트 푸터에 띄운다.
// public 리포는 60일 무활동이면 cron 이 자동으로 꺼진다. 봇이 "변경 없음"이라 조용한 것과
// 봇 자체가 죽어 조용한 것을 구분할 방법이 달리 없다.
import fs from "node:fs";

const META = "sources/watch-meta.json";

export default function () {
  if (!fs.existsSync(META)) return { last_run: null, stale: true, watched: 0 };
  const m = JSON.parse(fs.readFileSync(META, "utf8"));
  const days = Math.round((Date.now() - Date.parse(m.last_run)) / 86400000);
  return { ...m, days, stale: days > 30 };
}
