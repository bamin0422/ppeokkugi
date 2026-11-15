"""deck.html → 16:9 PDF. 사용: python3 docs/deck/build_deck.py [미리보기 폴더]

1) 에뮬레이터·휴대폰 화면(design/screens-v2)에서 필요한 부분만 잘라 assets/에 넣고
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
SCR = ROOT / "design/screens-v2"
OLD_SCR = ROOT / "design/screens"
CHAR = ROOT / "design/character"
OUT = [pathlib.Path.home() / "Downloads/뻐꾸기_서비스소개서.pdf", ROOT / "docs/뻐꾸기_서비스소개서.pdf"]
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHECK = pathlib.Path.home() / ".claude/skills/writing-korean-docs/check_register.py"

# 10쪽 컷(brake-card·tail-1·arrive-1·vote-cards·rollcall·talk-1·kids-row)은 휴대폰 무전 목록(phone-10)의 카드에서 글 부분만 자른다.
# 목록을 다시 찍으면 카드 순서가 바뀌므로 y 좌표를 다시 잰다
CROPS = {  # 이름: (screens-v2 원본, (x0, y0, x1, y1) 원본 픽셀 좌표). 차 화면 2560×1440, 휴대폰 780×N
    "drv-map":    ("driver", (876, 252, 1484, 1144)),
    "seat":       ("passenger", (872, 200, 1548, 904)),
    "brake":      ("brake-alert", (870, 240, 2516, 842)),
    "brake-card": ("phone-10-feed-full", (196, 2617, 600, 2805)),
    "tail-1":     ("phone-10-feed-full", (196, 2225, 634, 2367)),  # 글이 길어 오른쪽을 더 넓게 자른다
    "rx-cards":   ("brake-alert", (1496, 246, 2516, 642)),
    "ptt":        ("ptt-tx", (1500, 1126, 2512, 1282)),
    "arrive2":    ("arrive", (1496, 246, 2516, 642)),
    "arrive-1":   ("phone-10-feed-full", (196, 1149, 600, 1291)),
    "vote":       ("vote", (1500, 200, 2512, 548)),
    "vote-cards": ("phone-10-feed-full", (196, 1345, 600, 1487)),
    "rollcall":   ("phone-10-feed-full", (196, 3281, 600, 3423)),
    "phone":      ("phone-04-radio", (0, 0, 780, 1320)),
    "talk-1":     ("phone-10-feed-full", (196, 3477, 600, 3619)),
    "kids-row":   ("phone-10-feed-full", (196, 3055, 600, 3227)),
    "control-seat": ("phone-13-control-room", (0, 0, 780, 1688)),
}
NAVI = ("route-follow-navi", (877, 958, 1457, 1278))  # 순정 내비 화면은 새로 찍지 않아 이전 캡처에서 자른다
CHARS = ["base", "talk", "alert", "vote", "arrive", "love"]
JPG = {"drv-map", "brake", "phone", "control-seat"}

# 12쪽 운행 보고서: 2026-11-04 가상 차량 3대 운행 기록(이전 캡처의 값)을 지금 보고서 화면(server/src/report.js)으로 다시 그린다
REPORT = """
import { reportHtml } from '%s';
const t = (h, m) => Date.UTC(2026, 10, 4, h - 9, m);
const row = (car, nickname, brake, airbag, says, people) => ({ car, nickname, joinedAt: t(14, 44), arrivedAt: t(15, 22),
  minutes: 37, km: 61.9, maxSpeed: 100, brake, airbag, rejoins: 0, says, people });
const ev = [[44, 1, '입장'], [44, 2, '입장'], [44, 3, '입장'], [44, 1, '점호 3명'], [44, 2, '점호 3명'], [44, 3, '점호 4명'],
  [45, 1, '급제동'], [45, 2, '비'], [46, 0, '관제 공지'], [46, 0, '휴게소 투표: 안성 휴게소'], [47, 3, '에어백']]
  .map(([m, car, text]) => ({ at: t(14, m), car, text }))
  .concat([[1, '퇴장'], [2, '퇴장'], [3, '퇴장']].map(([car, text]) => ({ at: t(15, 22), car, text })));
ev.splice(11, 0, { at: t(15, 22), car: 0, text: '전원 도착' });
process.stdout.write(reportHtml({ startedAt: t(14, 44), events: ev,
  rows: [row(1, '선두차(봇)', 1, 0, 0, 3), row(2, '2호차(봇)', 0, 0, 0, 3), row(3, '3호차(봇)', 0, 1, 2, 4)] }));
"""


def shoot(html, png, w, h):
    tmp = A / "_tmp.html"
    tmp.write_text(html)
    pathlib.Path(png).unlink(missing_ok=True)
    # 크롬은 그림을 쓰고도 종료 코드가 0이 아닐 때가 있다. 파일이 생겼는지로 판단한다
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", f"--window-size={w},{h}",
                    "--force-device-scale-factor=2", "--virtual-time-budget=6000", f"--screenshot={png}", tmp.as_uri()],
                   capture_output=True)
    assert pathlib.Path(png).exists(), png
    tmp.unlink()


def assets():
    A.mkdir(exist_ok=True)
    for name, (src, box) in CROPS.items():
        im = Image.open(SCR / f"{src}.png").convert("RGB").crop(box)
        if name == "brake":  # 카드 세 장 높이까지 자르면 지도 아래로 차량 목록 첫 줄이 걸린다. 그 자리를 바탕색으로 덮는다
            im.paste(im.getpixel((2, 2)), (0, 782 - box[1], 1492 - box[0], im.height))
        if name in JPG:  # 지도 타일이 든 화면은 JPEG로 줄인다
            im.save(A / f"{name}.jpg", quality=88)
        else:
            im.save(A / f"{name}.png")
    Image.open(OLD_SCR / f"{NAVI[0]}.png").convert("RGB").crop(NAVI[1]).save(A / "navi-eta.png")
    for n in ("hero", "rest", "rain", "arrive"):
        shutil.copy(ROOT / f"design/illust/{n}.jpg", A / f"illust_{n}.jpg")
    for c in CHARS:
        shutil.copy(CHAR / f"cuckoo_{c}.png", A / f"cuckoo_{c}.png")
    for w in ("regular", "semibold", "bold", "extrabold"):
        shutil.copy(ROOT / f"app/src/main/res/font/pretendard_{w}.otf", A / f"pretendard_{w}.otf")
    js = REPORT % (ROOT / "server/src/report.js").as_uri()
    html = subprocess.run(["node", "--input-type=module", "-e", js], capture_output=True, text=True, check=True).stdout
    shoot(html, A / "control-report.png", 1100, 830)


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
    pdf.unlink(missing_ok=True)
    # 기기가 바쁘면 Chrome이 PDF를 다 쓰고도 종료 단계에서 0이 아닌 값으로 끝난다. 종료 코드 대신 파일로 확인한다
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    "--allow-file-access-from-files", "--virtual-time-budget=4000",
                    f"--print-to-pdf={pdf}", built.as_uri()], capture_output=True)
    assert pdf.exists() and pdf.stat().st_size > 100_000, "PDF가 만들어지지 않음"
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
