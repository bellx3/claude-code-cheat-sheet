// "지금 어디에 있는지"를 보여주는 두 가지: 상단 탭의 현재 위치, 좌측 목차의 현재 섹션.

// (1) 상단 탭은 좁은 화면에서 가로 스크롤 컨테이너다. 375px 에서는 탭 2개까지만 보이는데,
//     현재 탭이 그 밖(3번째 CLI, 4번째 슬래시)이면 활성 표시가 화면에 없어서 방문자가
//     자기 위치를 알 수 없다(실측: /ref/cli/ 를 폰에서 열면 활성 탭이 안 보인다).
//     활성 탭을 스크롤해 보이게 한다. scrollIntoView 대신 컨테이너의 scrollLeft 를 직접
//     만지는 이유: scrollIntoView 는 조상까지 스크롤해 페이지가 탭 위치로 점프한다.
(() => {
  const cur = document.querySelector('.topnav a[aria-current="page"]');
  if (!cur) return;
  const list = cur.closest("ul");
  if (!list || list.scrollWidth <= list.clientWidth) return;
  // offsetLeft 는 쓰지 않는다 — .topnav 가 sticky(=positioned) 라 offsetParent 가 스크롤
  // 컨테이너인 ul 이 아니고, 그 차이만큼 어긋난다. 화면 좌표 차이는 좌표계와 무관하다.
  const a = cur.getBoundingClientRect();
  const box = list.getBoundingClientRect();
  list.scrollLeft += a.left - box.left - (box.width - a.width) / 2;
})();

// (2) 레퍼런스 서피스 페이지의 좌측 섹션 목차에 "지금 보고 있는 섹션" 하이라이트를 붙인다.
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
