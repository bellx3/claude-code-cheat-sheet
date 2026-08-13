// 푸터와 /about/ 에 띄우는 자동 집계.
// "세부까지 실었다"고 말로 쓰는 대신 숫자를 화면에 박아 스스로 속일 수 없게 한다.
import refIndex from "./refIndex.js";
import prompts from "./promptIndex.js";
import tasks from "./taskIndex.js";

export default function () {
  const ref = refIndex();
  const pr = prompts();
  const tk = tasks();
  const secs = ref.surfaces.flatMap((s) => s.sections);
  const withSummary = secs.filter((s) => s.summary).length;

  return {
    sectionCount: ref.sectionCount,
    itemCount: ref.itemCount,
    coreCount: ref.coreCount,
    // 섹션 summary 는 100%가 목표다 — "이 묶음이 뭔지"는 모든 섹션에 필요하다.
    summaryCount: withSummary,
    summaryPct: ref.sectionCount ? Math.round((withSummary / ref.sectionCount) * 100) : 0,
    // 항목 detail 은 100%가 목표가 아니다. 단축키·플래그는 한 줄이 맞는 밀도이고,
    // 뉘앙스가 필요한 항목에만 붙인다. 그래서 비율이 아니라 개수로만 센다.
    detailCount: ref.detailCount,
    detailPct: ref.itemCount ? Math.round((ref.detailCount / ref.itemCount) * 100) : 0,
    pinCount: ref.pinCount,
    promptCount: pr.all.length,
    promptOwnCount: pr.all.filter((p) => p.origin === "own").length,
    promptTestedCount: pr.all.filter((p) => p.verified === "tested").length,
    taskCount: tk.all.length,
  };
}
