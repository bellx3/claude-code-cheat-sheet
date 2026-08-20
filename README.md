# Claude 참고자료

Claude를 쓰다가 "그 기능 이름이 뭐였지"를 찾는 개인 참고자료. 탭 기반 레퍼런스 + 작업축 + 프롬프트 저장소.
데이터 하나를 고치면 웹·검색·A3 치트시트가 같이 바뀐다.

**Anthropic 공식 자료가 아니다.** 공식 문서는 [code.claude.com/docs](https://code.claude.com/docs).
내용이 어긋나면 공식 문서가 맞다.

## 왜 이 구조인가

이 리포는 원래 A3/A4 치트시트 HTML 8개 + PDF 8개였다. 실측해보니:

- A3판과 A4판이 사본이 아니라 **손으로 축약한 두 번째 원본**이었다 (`cheatsheet.html` 36섹션 vs `-a4.html` 29섹션)
- 그 과정에서 **안전 경고 2개가 A4판에서 사라져** 있었다 (`cheatsheet-desktop.html`의 `span.warn` 5개 → A4판 3개)
- 같은 슬래시 명령의 설명이 파일마다 갈렸다 (7건)
- 8개 파일 전부 `<meta name="viewport">`가 없어 폰에서 980px 가상폭으로 축소 렌더됐다
- `<a href>`가 0개라 링크가 클릭되지 않았다

그래서 **YAML 하나를 정본으로 두고 웹·인쇄·검색을 전부 생성**한다. A4판은 폐지했다 — 판을 줄이는 쪽이
스키마로 드리프트를 관리하는 것보다 싸다.

## 구조

```
src/_data/ref/<surface>/*.yaml   레퍼런스 항목 (정본)
src/_data/tasks/*.yaml           작업축 — "하고 싶은 일" → 기능
src/_data/prompts/*.yaml         프롬프트 저장소 (출처·라이선스 포함)
src/_data/officialdocs.json      공식 문서 색인 (llms.txt에서 생성)
src/*.njk                        페이지 템플릿
tools/                           추출·게이트·PDF·감시봇
legacy/                          이관 전 HTML·PDF·README (읽기 전용, 대조용)
```

사이트 탭: `/ref/desktop/` `/ref/science/` `/ref/cli/` `/ref/slash/` — 상위 탭이 곧 레퍼런스
서피스이고 순서는 `tools/constants.mjs` 의 `SURFACES` 가 정한다(2026-08-20 개편.
`/`는 첫 탭으로 리다이렉트). 작업·프롬프트 상세와 `/about/`은 검색으로,
A3 치트시트는 각 탭의 버튼(`/print/sheet/<id>/`)으로 닿는다. 옛 허브 페이지(작업·레퍼런스·프롬프트·
공식문서·다운로드)는 삭제했다. 탭은 JS 토글이 아니라 **각각 별도 URL**이다 — 숨긴 콘텐츠는
브라우저 Ctrl+F에서 빠지기 때문.

## 쓰기

```bash
npm install
npm run build     # 게이트 → 빌드 → 산출물 게이트
npm run serve     # 로컬 미리보기
```

| 명령 | 하는 일 |
|---|---|
| `npm run build` | 데이터 검사 → 11ty 빌드 → 산출물 검사 |
| `node tools/gate-all.mjs` | 게이트 14종만 실행 |
| `node tools/gate-reverse-test.mjs` | 게이트가 실제로 잡는지 역방향 검증 |
| `node tools/search-test.mjs` | 검색 랭커 통과율 |
| `node tools/fetch-llms-txt.mjs` | 공식 문서 색인 갱신 |
| `node tools/watch-docs.mjs` | 공식 문서 변경 감지 (콘텐츠는 안 고침) |
| `node tools/build-pdf.mjs` | A3 PDF 생성 (Chrome headless) |
| `python tools/verify-pdf.py` | PDF 4단 검증 |
| `node tools/measure-print.mjs` | A3 지면 채움률 측정 |
| `node tools/shots-cdp.mjs` | 육안 확인용 스크린샷 (375px / 1280px / A3) |
| `node tools/motion-check.mjs` | 스크롤 등장 모션이 본문을 영구히 숨기지 않는지 확인 |

## 검증

"통과한다"만 확인하면 게이트가 아무것도 안 해도 통과한다. 그래서 양방향으로 본다.

- **게이트 14종** — YAML 파싱·id 규칙·참조 무결성·프롬프트 라이선스·날짜·안전 경고·A3 밀도·
  이관 차집합·PII·인덱스 누출·HTML 위생·인쇄 산출물의 pin·내부 링크·배포 확인 파일
- **역방향 검증 14건** — 일부러 위반을 심어 각 게이트가 실제로 실패하는지 (`gate-reverse-test.mjs`)
- **검색 랭커** — 질의 38개의 착지 통과율. 튜닝에 쓴 케이스와 튜닝 후 추가한 holdout을 나눠 기록
- **A3 PDF** — 용지 크기·페이지 수·한글 폰트 임베드·텍스트 추출·지면 채움률 + PNG 육안

게이트는 소스가 아니라 **빌드 산출물**을 읽는다. 소스 grep은 "배선했다"까지만 잠근다.

## 알려진 한계

- **PDF에서 한글 텍스트를 추출·검색·복사할 수 없다.** Chrome headless가 CJK에 ToUnicode CMap을
  넣지 않는다. Malgun/Gulim/Batang/sans 넷, `--headless`와 `--headless=new` 둘, Noto 웹폰트까지
  전부 같았다. 화면 렌더는 정상이므로 인쇄물로는 문제없다.
- **검색은 부분문자열이다.** 오타·동의어를 못 잡는다. 「샌드박스」는 「샌드박싱」의 부분문자열이 아니라서
  데이터의 `aliases`로 메운다. 형태소 분석기를 안 쓰기로 한 이상 구조로는 못 푼다.
- **문서 감시는 알람이지 갱신이 아니다.** 실제 수정은 사람이 한다.
- **「확인」 날짜는 손 입력이다.** 형식·미래 날짜는 게이트가 잡지만 "정말 그날 확인했는지"는 못 잡는다.
- **항목 `detail` 은 100%가 목표가 아니다.** 섹션 `summary` 는 121/121 채웠지만,
  항목 세부는 한 줄 설명이 오해를 만드는 곳에만 붙인다 — `Ctrl+C` 에 문단을 다는 건 손해다.
  그래서 `summary` 는 비율로, `detail` 은 개수로만 센다. 둘 다 홈과 `/about/` 에 자동 집계로 띄운다.
- **초기 데이터가 A3 치트시트에서 왔다.** 그건 이미 지면 때문에 잘려나간 결과물이라,
  공식 문서를 다시 읽고 채워야 하는 항목이 남아 있다.

## Windows에서 개발할 때

- `.gitattributes`가 `* text=auto eol=lf`로 개행을 고정한다. 없으면 CRLF가 섞여 diff가 통째로 바뀐다.
- Git Bash에서 POSIX 경로를 Chrome에 넘기면 **조용히 실패하지 않는다** — 에러 페이지를 정상 크기 PDF로
  출력한다. `tools/build-pdf.mjs`는 Windows 절대경로로 넘긴다.
- 검증용 스크린샷은 반드시 로컬 HTTP로 찍는다. `file://`에서는 절대경로 CSS가 드라이브 루트로 해석돼
  **스타일 없는 페이지가 정상처럼 찍힌다** (실제로 겪었다 — 첫 스크린샷 10장이 전부 무스타일이었고,
  PDF도 같은 이유로 A3가 아니라 Letter 5페이지로 나왔다).

## 배포

Cloudflare Pages — https://claude-cheatsheet.pages.dev (빌드 `npm run build`, 출력 `_site`,
`NODE_VERSION=22`). Netlify는 무료 플랜 배포 크레딧 소진으로 2026-08-20 은퇴했다.
헤더·리다이렉트는 `src/_headers`·`src/_redirects`가 정본이고 passthrough로 산출물에 복사된다 —
복사가 빠지면 G13이 빌드를 실패시킨다(`build.json` no-store 와 레거시 301이 조용히 사라지는 사고 방지).

빌드 실패 시 Pages도 사이트를 내리지 않고 **직전 성공본을 계속 서빙**한다. 즉 진짜 실패는
"사이트가 죽음"이 아니라 "고쳤다고 믿는데 방문자는 옛날 걸 보는 것"이다.
그래서 커밋 SHA를 푸터와 `/build.json`에 박아둔다.

```bash
curl -s https://claude-cheatsheet.pages.dev/build.json | jq -r .sha   # 방금 push한 SHA와 같아야 한다
```

`src`·`tools`·설정이 안 바뀐 커밋의 빌드 스킵은 대시보드의 **Build watch paths** 로 건다
(옛 netlify.toml `ignore` 의 이관처).

## 라이선스

MIT. 원본 [Njengah/claude-code-cheat-sheet](https://github.com/Njengah/claude-code-cheat-sheet)
(MIT, Copyright © 2025 Joe Njenga)에서 갈라져 나왔고, 현재 콘텐츠는 대부분 새로 작성한 한국어다.

프롬프트 저장소는 항목마다 `origin`으로 재배포 조건을 가른다 — `own` / `adapted` / `verbatim`(재배포
허용 라이선스만) / `link_only`(전재 불가, 링크만). 빌드 게이트가 이걸 강제하고, 검색 인덱스에 본문이
새는지도 산출물에서 직접 검사한다. 검토했지만 싣지 않기로 한 출처는 `/about/`에 기록해뒀다.
