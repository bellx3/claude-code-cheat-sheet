#!/usr/bin/env python
"""A3 PDF 4단 검증.

파일 크기·페이지 수만 보는 검사는 통과해도 결과물이 깨질 수 있다.
실제로 통과해버리는 사고 세 가지를 각 단계가 하나씩 막는다:
  1단 용지     — @page 가 안 먹어 Letter 로 나왔는데 파일은 정상 생성
  2단 폰트     — CI에 CJK 폰트가 없어 한글이 전부 □ 인데 페이지 수·크기 검사는 통과
  3단 텍스트   — 항목이 통째로 빠졌는데(빈 카드) PDF 는 정상 생성
  4단 육안     — 단 경계 잘림·겹침은 위 셋을 다 통과한다. PNG 로 뽑아 눈으로 본다.
"""
import json
import re
import subprocess
import sys

# Windows 콘솔 기본 인코딩(cp949)에서 em dash 가 UnicodeEncodeError 를 낸다.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "dist-artifacts"

# A3 가로 = 420 x 297 mm = 1190.55 x 841.89 pt
A3_LANDSCAPE_PT = (1190.55, 841.89)
TOL = 3.0

errors: list[str] = []
warns: list[str] = []


def mm(pt: float) -> float:
    return pt * 25.4 / 72.0


def check(pdf: Path, expect: dict) -> None:
    name = pdf.name
    reader = PdfReader(str(pdf))

    # 1단 — 용지 크기와 페이지 수
    pages = len(reader.pages)
    box = reader.pages[0].mediabox
    w, h = float(box.width), float(box.height)
    ok_size = abs(w - A3_LANDSCAPE_PT[0]) < TOL and abs(h - A3_LANDSCAPE_PT[1]) < TOL
    if not ok_size:
        errors.append(
            f"{name}: 용지가 A3 가로가 아니다 — {mm(w):.0f}x{mm(h):.0f}mm "
            f"(기대 420x297mm). @page size 가 안 먹었다."
        )
    if pages != 1:
        warns.append(f"{name}: {pages}페이지 — A3 한 장을 넘겼다. tier=core 를 솎아야 한다.")

    # 2단 — 임베드 폰트. 한글 폰트가 없으면 두부(□)다.
    fonts = set()
    for p in reader.pages:
        res = p.get("/Resources")
        if not res:
            continue
        fdict = res.get_object().get("/Font")
        if not fdict:
            continue
        for f in fdict.get_object().values():
            fo = f.get_object()
            base = str(fo.get("/BaseFont", ""))
            if base:
                fonts.add(base.lstrip("/"))
            desc = fo.get("/DescendantFonts")
            if desc:
                for d in desc.get_object():
                    b = str(d.get_object().get("/BaseFont", ""))
                    if b:
                        fonts.add(b.lstrip("/"))
    hangul_capable = [f for f in fonts if any(k in f for k in ("Malgun", "Gothic", "Noto", "Nanum", "Batang", "Gulim", "Dotum", "AppleSD"))]
    if not hangul_capable:
        errors.append(f"{name}: 한글 가능 폰트가 임베드되지 않았다 — 두부(□) 위험. 폰트: {sorted(fonts)[:6]}")

    # 3단 — 텍스트 추출로 항목 수와 pin 문구 확인. 빈 카드는 여기서만 잡힌다.
    #
    # -layout 을 쓰면 안 된다. 5단 조판이라 행 단위로 재구성하면서 다른 열의 단어가 사이에 끼어든다.
    # 실측: "2026-08-14부터 Pro/Max/Team 신규 세션 기본값이 auto 모드로 전환"
    #    → "2026-08-14 Pro/Max/Team    auto"  (3개 열이 한 행으로 뒤섞임)
    # -raw 는 콘텐츠 스트림 순서(=열 순서)를 그대로 뱉는다. 좁은 열에서 줄바꿈이 문구를
    # 쪼개므로 양쪽 공백을 전부 지우고 대조한다.
    try:
        text = subprocess.run(
            ["pdftotext", "-raw", str(pdf), "-"],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60,
        ).stdout
    except Exception as e:  # pdftotext 없으면 pypdf 로 폴백
        text = "\n".join((pg.extract_text() or "") for pg in reader.pages)
        warns.append(f"{name}: pdftotext 실패({e}) — pypdf 추출로 대체")

    def squash(s: str) -> str:
        return re.sub(r"\s+", "", s)

    flat = squash(text)

    # 이 환경에서 한글이 추출되는지 먼저 본다.
    # 실측(2026-08-13, Windows + Chrome 헤드리스): 한글 글리프는 정상 렌더되지만
    # ToUnicode CMap 이 없어 텍스트로는 전부 사라진다. Malgun/Gulim/Batang/sans 넷 다,
    # --headless 와 --headless=new 둘 다, Noto 웹폰트를 써도 마찬가지였다.
    # 이걸 "경고 누락"으로 보고하면 게이트가 거짓 실패를 28건 뱉는다. 구분해서 다뤄야 한다.
    hangul_extractable = bool(re.search(r"[가-힣]", text))

    ascii_terms = [t for t in expect["terms"] if re.search(r"[A-Za-z0-9]", t) and not re.search(r"[가-힣]", t)]
    found = sum(1 for t in ascii_terms if squash(t) in flat)
    ratio = found / max(1, len(ascii_terms))
    if ratio < 0.85:
        errors.append(
            f"{name}: 영문 core 항목이 {found}/{len(ascii_terms)} ({ratio:.0%}) 만 보인다 — 빈 카드 의심"
        )

    if hangul_extractable:
        for phrase in expect["pins"]:
            if squash(phrase) not in flat:
                errors.append(f"{name}: 안전 경고가 PDF 텍스트에 없다 — 「{phrase[:26]}…」")
        kor = [t for t in expect["terms"] if re.search(r"[가-힣]", t)]
        kfound = sum(1 for t in kor if squash(t) in flat)
        if kor and kfound / len(kor) < 0.85:
            errors.append(f"{name}: 한글 core 항목이 {kfound}/{len(kor)} 만 보인다")
    else:
        warns.append(
            f"{name}: PDF 에서 한글 텍스트를 추출할 수 없다 (Chrome 헤드리스가 CJK ToUnicode 를 넣지 않는다). "
            f"→ 이 PDF 는 한글 검색·복사가 안 된다. 안전 경고 {len(expect['pins'])}건은 게이트 G11(인쇄 HTML)이 잠그고, "
            f"실제 렌더는 육안으로 확인해야 한다."
        )

    print(
        f"  {name}: {mm(w):.0f}x{mm(h):.0f}mm · {pages}p · 폰트 {len(fonts)}종 · "
        f"영문 core {found}/{len(ascii_terms)} ({ratio:.0%}) · 한글추출 {'가능' if hangul_extractable else '불가'}"
    )
    if hangul_capable:
        print(f"      한글 폰트: {', '.join(sorted(hangul_capable)[:3])}")


def main() -> int:
    spec_file = ART / "expect.json"
    if not spec_file.exists():
        print("expect.json 이 없다 — node tools/pdf-expect.mjs 로 먼저 만들 것", file=sys.stderr)
        return 1
    spec = json.loads(spec_file.read_text(encoding="utf-8"))

    print("A3 PDF 검증")
    for sid, expect in spec.items():
        pdf = ART / f"cheatsheet-{sid}-a3.pdf"
        if not pdf.exists():
            errors.append(f"{pdf.name} 없음")
            continue
        check(pdf, expect)

    for w in warns:
        print("  ! " + w)
    if errors:
        print(f"\n실패 {len(errors)}건:")
        for e in errors:
            print("  X " + e)
        return 1
    print(f"\n자동 검사 통과 (경고 {len(warns)}건)")
    print("주의: 자동 검사는 단 경계 잘림·겹침을 못 잡는다. tools/render-page1.mjs 로 PNG를 뽑아 눈으로 볼 것.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
