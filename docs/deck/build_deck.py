"""deck.html → 16:9 PDF. 사용: python3 docs/deck/build_deck.py [미리보기 폴더]

1) 에뮬레이터 화면에서 필요한 부분만 잘라 assets/에 넣고
2) SDK 다이어그램을 그려 deck.html에 끼운 뒤
3) 헤드리스 Chrome으로 PDF를 만들고
4) 본문 글을 deck_text.md로 뽑아 문체 검사를 돌리고
5) 미리보기 폴더가 있으면 쪽마다 PNG와 한 장짜리 모음(deck-sheet.png)을 만든다.
"""
import html as H, re, shutil, subprocess, sys, pathlib
from PIL import Image

DECK = pathlib.Path(__file__).resolve().parent
ROOT = DECK.parent.parent
A = DECK / "assets"
SCR = ROOT / "design/screens"
NODPI = ROOT / "app/src/main/res/drawable-nodpi"
OUT = [pathlib.Path.home() / "Downloads/뻐꾸기_서비스소개서.pdf", ROOT / "docs/뻐꾸기_서비스소개서.pdf"]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHECK = pathlib.Path.home() / ".claude/skills/writing-korean-docs/check_register.py"
APP = (852, 88)  # 2560×1440 캡처에서 앱 영역이 시작하는 점. 아래 좌표는 앱 영역 기준

CROPS = {  # 이름: (원본, (x0, y0, x1, y1) 앱 영역 좌표). 원본 이름이 phone-로 시작하면 휴대폰 캡처 원본 좌표
    "drv-map":    ("driver", (25, 160, 645, 1065)),
    "tail":       ("driver", (680, 170, 1655, 325)),
    "roll-list":  ("driver", (25, 740, 645, 1065)),
    "rollcall":   ("driver", (835, 560, 1310, 655)),
    "share":      ("route-share", (680, 170, 1655, 330)),
    "rejoin":     ("passenger", (690, 860, 1655, 1060)),
    "rejoin-1":   ("passenger", (800, 893, 1300, 935)),
    "arrive2":    ("arrive", (680, 355, 1655, 690)),
    "arrive-1":   ("arrive", (840, 390, 1450, 470)),
    "brake":      ("brake-alert", (25, 160, 1660, 700)),
    "brake-map":  ("brake-alert", (25, 160, 645, 725)),
    "brake-card": ("brake-alert", (835, 560, 1480, 660)),
    "vote":       ("vote", (670, 120, 1660, 490)),
    "vote-cards": ("vote", (1000, 270, 1660, 490)),
    "navi-eta":   ("route-follow-navi", (25, 870, 605, 1190)),
    "seat":       ("passenger", (20, 110, 665, 700)),
    "kids-row":   ("passenger", (20, 555, 560, 615)),
    "phone":      ("phone-map", (0, 0, 780, 1090)),
    "ptt":        ("ptt-tx", (680, 1050, 1650, 1180)),
    "rx-cards":   ("route-share", (680, 355, 1655, 690)),
    "talk-1":     ("route-share", (835, 390, 1640, 470)),
    "tail-1":     ("driver", (835, 195, 1640, 295)),
    "share-1":    ("route-share", (835, 185, 1640, 310)),
}
SPRITES = ["tx", "rx", "brake", "rain", "camera", "lost", "vote", "arrive",
           "emergency", "wait", "base", "talk", "alert", "rest", "rollcall", "kids"]


def assets():
    A.mkdir(exist_ok=True)
    for name, (src, (x0, y0, x1, y1)) in CROPS.items():
        im = Image.open(SCR / f"{src}.png").convert("RGB")
        ox, oy = (0, 0) if src.startswith("phone-") else APP
        im.crop((ox + x0, oy + y0, ox + x1, oy + y1)).save(A / f"{name}.png")
    for s in SPRITES:
        shutil.copy(NODPI / f"cuckoo_{s}.png", A / f"cuckoo_{s}.png")
    shutil.copy(NODPI / "ic_launcher_art.png", A / "icon.png")
    for f in ("galmuri11_bold.ttf", "galmuri11.ttf"):
        shutil.copy(ROOT / "app/src/main/res/font" / f, A / f)


# ---- 9쪽: SDK 5종 ↔ 기능 12개 연결선 ----
SDKS = [("Vehicle", "2.3.2", "브레이크·와이퍼·방향지시등·기어·좌석·안전·조명"),
        ("NaviHelper", "3.0.5", "경유지 추가·경로 재탐색·안내 정보"),
        ("FusedLocation", "1.1.3", "위치·속도"),
        ("TextToSpeech", "3.3.1", "좌석별 오디오 존 출력"),
        ("SpeechToText", "3.3.1", "말을 글로 받아 적기")]
FEATS = [("긴급 콜", "에어백 전개", [0]), ("점호", "착석·벨트·기어", [0]), ("깃발 색", "앰비언트 조명", [0]),
         ("자동 콜", "급제동·비·회전", [0, 1]), ("쉬어 가", "휴게소 경유지", [1]), ("대장 콜", "경로 함께 탐색", [1]),
         ("다시 붙기", "선두 따라가기", [1, 2]), ("위치 알림", "처짐·도착·정차", [2, 0]), ("일행 지도", "깃발 색 위치", [2]),
         ("꼬리 콜", "후미 거리", [2]), ("좌석 채널", "키즈·어른 채널", [3, 0]), ("받아 적기", "말 → 글 → 음성", [4, 3])]


def sdk_svg():
    W, Hh = 1000, 660
    bx, bw, bh = 0, 360, 104
    fx, fw, fh = 620, 380, 44
    sy = [i * (bh + 25) for i in range(5)]
    fy = [i * (fh + 11.6) for i in range(12)]
    o = [f'<svg viewBox="0 0 {W} {Hh}" width="{W}" height="{Hh}" class="sdk">']
    for i, (_, _, ks) in enumerate(FEATS):
        for k in ks:
            y1, y2 = sy[k] + bh / 2, fy[i] + fh / 2
            hot = k == 0
            o.append(f'<path d="M{bx+bw},{y1} C{bx+bw+150},{y1} {fx-150},{y2} {fx},{y2}" '
                     f'class="ln{" hot" if hot else ""}"/>')
    for i, (n, v, d) in enumerate(SDKS):
        y = sy[i]
        o.append(f'<rect x="{bx}" y="{y}" width="{bw}" height="{bh}" class="{"sbox hot" if i == 0 else "sbox"}"/>'
                 f'<text x="{bx+22}" y="{y+44}" class="sn">{n}</text>'
                 f'<text x="{bx+bw-20}" y="{y+44}" class="sv" text-anchor="end">{v}</text>'
                 f'<text x="{bx+22}" y="{y+80}" class="sd">{d}</text>')
    for i, (n, d, ks) in enumerate(FEATS):
        y = fy[i]
        o.append(f'<rect x="{fx}" y="{y}" width="{fw}" height="{fh}" class="fbox"/>'
                 f'<text x="{fx+18}" y="{y+30}" class="fn">{n}</text>'
                 f'<text x="{fx+fw-16}" y="{y+29}" class="fd" text-anchor="end">{d}</text>')
    o.append("</svg>")
    return "".join(o)


def deck_text(doc):
    """쪽마다 헤드라인은 ##, 나머지 글은 줄 단위로 뽑아 문체 검사용 마크다운을 만든다."""
    out = []
    for sec in re.findall(r"<section.*?</section>", doc, re.S):
        sec = re.sub(r"<(style|svg)\b.*?</\1>", "", sec, flags=re.S)
        h = re.search(r"<h1[^>]*>(.*?)</h1>", sec, re.S)
        if h:
            out.append("## " + re.sub(r"<[^>]+>", "", re.sub(r"<br\s*/?>", " ", h[1])).strip())
            sec = sec.replace(h[0], "")
        t = re.sub(r"</(p|div|li|h2|h3|td|th|figcaption|span class=\"[^\"]*blk[^\"]*\")>|<br\s*/?>", "\n", sec)
        t = H.unescape(re.sub(r"<[^>]+>", "", t))
        out += [re.sub(r"\s+", " ", l).strip() for l in t.splitlines() if l.strip()]
        out.append("")
    return "\n".join(out)


def main():
    assets()
    src = (DECK / "deck.html").read_text()
    doc = src.replace("<!--SDK_DIAGRAM-->", sdk_svg())
    built = DECK / "deck.built.html"
    built.write_text(doc)
    (DECK / "deck_text.md").write_text(deck_text(doc))

    pdf = DECK / "deck.pdf"
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    "--allow-file-access-from-files", "--virtual-time-budget=4000",
                    f"--print-to-pdf={pdf}", built.as_uri()], check=True, capture_output=True)
    for o in OUT:
        shutil.copy(pdf, o)
    print(subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True).stdout)
    print(subprocess.run([sys.executable, str(CHECK), str(DECK / "deck_text.md")],
                         capture_output=True, text=True).stdout)

    if len(sys.argv) > 1:  # 미리보기
        prev = pathlib.Path(sys.argv[1])
        prev.mkdir(parents=True, exist_ok=True)
        for p in prev.glob("p-*.png"):
            p.unlink()
        subprocess.run(["pdftoppm", "-png", "-r", "144", str(pdf), str(prev / "p")], check=True)
        pages = sorted(prev.glob("p-*.png"))
        th = [Image.open(p).convert("RGB").resize((640, 360)) for p in pages]
        cols = 3
        sheet = Image.new("RGB", (cols * 660 + 20, ((len(th) + cols - 1) // cols) * 380 + 20), "#777")
        for i, im in enumerate(th):
            sheet.paste(im, (20 + (i % cols) * 660, 20 + (i // cols) * 380))
        sheet.save(prev / "deck-sheet.png")
        print(len(pages), "pages →", prev / "deck-sheet.png")


if __name__ == "__main__":
    main()
