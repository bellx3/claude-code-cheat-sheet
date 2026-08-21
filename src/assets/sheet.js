// A3 치트시트 미리보기 모달. 레퍼런스 서피스 페이지에서만 읽는다(base.njk 가 shell 일 때만 붙인다).
//
// 예전에는 버튼이 /print/sheet/<id>/ 로 페이지를 옮겼다. 조회하러 온 사람 입장에서는
// "보던 자리를 떠났다가 Ctrl+P 하고 뒤로 돌아오는" 3단계였다. 미리보기를 제자리에 띄우고
// 인쇄를 한 번에 건다.
//
// PDF 를 바로 내려주지 않는 이유: 브라우저에서 PDF 를 만들려면 렌더링 라이브러리를 벤더링해야
// 하는데 이 사이트의 런타임 의존성은 0 개다(GSAP 116KB 를 걷어낸 것과 같은 이유). 대신
// 인쇄 대화상자의 "PDF로 저장"이 같은 결과를 낸다 — @page 규칙이 sheet-a3.css 에 있어서
// 용지·방향이 이미 A3 가로로 잡혀 나온다.
(() => {
  const dlg = document.getElementById("sheetmodal");
  // <dialog> 미지원이면 아무것도 하지 않는다 — 버튼이 원래의 링크로 그대로 동작한다.
  if (!dlg || typeof dlg.showModal !== "function") return;

  const paper = dlg.querySelector(".sheetmodal-paper");
  const stage = dlg.querySelector(".sheetmodal-stage");
  const frame = dlg.querySelector("iframe");
  if (!paper || !stage || !frame) return;

  // A3 가로 @96dpi. sheet-a3.css 가 이 폭을 전제로 조판하므로 미리보기도 같은 폭으로 그리고
  // 축소만 한다 — iframe 을 좁히면 시트가 다른 조판으로 다시 흐른다(미리보기가 거짓이 된다).
  const W = 1587;
  const H = 1123;
  let loaded = false;
  let pendingPrint = false;

  function fit() {
    const s = Math.min((stage.clientWidth - 8) / W, (stage.clientHeight - 8) / H, 1);
    paper.style.setProperty("--s", s > 0 ? s : 0.5);
  }

  function print() {
    // 로드 전에 print() 하면 빈 종이가 나온다. 아직이면 로드 후로 미룬다.
    if (!loaded) { pendingPrint = true; return; }
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }

  frame.addEventListener("load", () => {
    loaded = true;
    if (pendingPrint) { pendingPrint = false; print(); }
  });

  function open(e) {
    // 새 탭·다운로드 의도(수정키·가운데 클릭)는 가로채지 않는다.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (!frame.src) frame.src = frame.dataset.src;
    dlg.showModal();
    fit();
  }

  document.querySelectorAll("a.sheetbtn").forEach((a) => a.addEventListener("click", open));
  dlg.querySelector("[data-sheet-close]").addEventListener("click", () => dlg.close());
  dlg.querySelector("[data-sheet-print]").addEventListener("click", print);
  // backdrop(바깥) 클릭으로 닫기. <dialog> 가 기본으로 주지 않는다.
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  window.addEventListener("resize", () => { if (dlg.open) fit(); });
})();
