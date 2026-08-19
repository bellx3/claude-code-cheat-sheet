// 레퍼런스 서피스 페이지의 좌측 섹션 목차에 "지금 보고 있는 섹션" 하이라이트를 붙인다.
// 공식 문서 사이트의 "이 페이지에서" 우측 TOC가 하는 일과 같지만, 우리는 섹션 트리가
// 이미 좌측에 있으니 별도 열을 새로 만드는 대신 같은 목차를 스크롤에 맞춰 갱신한다.
(() => {
  const toc = document.querySelector(".toc");
  if (!toc) return;
  const links = [...toc.querySelectorAll("a[href^='#sec-']")];
  if (!links.length) return;

  const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const sections = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  if (!sections.length) return;

  let current = null;
  const setActive = (id) => {
    if (id === current) return;
    if (current && byId.has(current)) byId.get(current).removeAttribute("aria-current");
    if (id && byId.has(id)) byId.get(id).setAttribute("aria-current", "location");
    current = id;
  };

  // 상단 15%~하단 70%를 제외한 얇은 띠에 걸리는 섹션을 "지금 보는 곳"으로 삼는다 —
  // 화면 맨 위/맨 아래에서 막 스치기만 한 섹션까지 활성으로 잡히는 걸 피한다.
  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (!visible.length) return;
      visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      setActive(visible[0].target.id);
    },
    { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
  );
  sections.forEach((s) => io.observe(s));
})();
