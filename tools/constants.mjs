// _data 모듈과 게이트가 함께 쓰는 상수.
// src/_data/*.js 에 named export를 두면 11ty가 default를 못 집어 pagination이 깨진다
// (실측: "Could not find pagination data … refIndex.surfaces"). 그래서 src 밖에 둔다.

// print.{columns,fontPx} 는 A3 지면 채움률을 보고 정한 값이다. 감으로 만지지 말 것 —
// node tools/measure-print.mjs 로 재고 60~99% 안에 들어오는지 확인한 뒤 바꾼다.
// 서피스마다 항목 수가 제각각이라(core: cli 369 / slash 117) 한 값으로는 안 맞는다.
// 순서가 곧 상위 탭 순서다 (2026-08-20 사용자 지정: desktop → science → cli → slash).
// 첫 항목이 / 리다이렉트의 착지가 된다.
export const SURFACES = [
  { id: "desktop", label: "Claude Desktop", blurb: "데스크톱 앱의 Code 탭. 브라우저 pane·diff 리뷰·워크스페이스.",
    print: { columns: 3, fontPx: 13 } },
  { id: "science", label: "Claude Science", blurb: "연구자용 워크벤치. 노트북·커넥터·클러스터.",
    print: { columns: 4, fontPx: 10 } },
  { id: "cli", label: "Claude Code CLI", blurb: "터미널에서 쓰는 본체. 설치·플래그·권한·훅·자동화.",
    print: { columns: 4, fontPx: 10.5 } },
  { id: "slash", label: "슬래시 · 플러그인", blurb: "세션 안에서 치는 명령과 플러그인 생태계.",
    print: { columns: 3, fontPx: 11 } },
];

// 섹션의 group 축에 붙일 한국어 라벨. 사이드바가 섹션 37개를 평면 나열하는 대신 이 묶음으로
// 접어 보여준다 — 데이터에 이미 있던 축인데 화면에서 쓰이지 않고 있었다.
// 라벨 없는 group 이 데이터에 들어오면 G1 이 실패한다(사이드바가 빈 제목을 내는 걸 막는다).
export const REF_GROUPS = {
  start: "시작 · 설치",
  control: "제어 · 설정",
  run: "실행 · 화면",
  session: "세션",
  automate: "자동화",
  quality: "품질 · 검토",
  extend: "확장",
  plugin: "플러그인",
  connect: "연결",
  compute: "컴퓨트",
  use: "사용",
  cli: "CLI",
  practice: "실전",
  trouble: "문제 해결",
  enterprise: "조직 · 엔터프라이즈",
};

export const TASK_GROUPS = [
  { id: "start", label: "시작·설정" },
  { id: "control", label: "제어·비용" },
  { id: "automate", label: "자동화" },
  { id: "quality", label: "품질·안전" },
  { id: "extend", label: "확장" },
];

export const PROMPT_STAGES = [
  { id: "discover", label: "파악" },
  { id: "build", label: "구현" },
  { id: "review", label: "검토" },
  { id: "ship", label: "배포·운영" },
];

// 전문 전재를 허용하는 라이선스. 1차 출처를 직접 열어 확인한 것만 넣는다.
export const REDISTRIBUTABLE = ["CC0-1.0", "MIT", "Apache-2.0", "CC-BY-4.0", "Unlicense", "BSD-3-Clause"];

export const ORIGINS = ["own", "adapted", "verbatim", "link_only"];

export const ASCII_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// js-yaml 은 따옴표 없는 2026-08-13 을 Date 객체로 파싱한다.
// 손으로 쓰는 데이터에 따옴표를 강제하는 건 함정이므로 로더에서 정규화한다.
export function toYmd(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

// 문서에 나오는 자리표시자 도메인. PII 검사에서 제외한다.
// 경로는 예외로 두지 않는다 — 자리표시자처럼 보이는 형태를 허용하면 예외가 계속 넓어지고,
// 결국 진짜 경로가 통과한다. 문서에 경로 예시가 필요하면 문구를 바꾸는 쪽이 맞다
// (실제로 check-before-external 프롬프트를 그렇게 고쳤다).
export const PII_ALLOW = [
  /(^|@)(example\.(com|org|net)|server\.example\.com|localhost)/i,
  /user@host/i,
];
