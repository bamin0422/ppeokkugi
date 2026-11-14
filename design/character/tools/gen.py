"""뻐꾸기 마스코트 v5(픽셀). 사용: python3 tools/gen.py [OUTDIR, 기본은 design/character]

32×32 1비트 그림을 무전기 LCD 창처럼 그린다. 짙은 LCD 바탕에 꺼진 칸은 흐린 점으로 남기고,
켜진 칸은 호박색(경고 계열은 빨강)으로 채운다. 표정마다 4프레임이고 프레임 간격은 FRAME_MS다.

만드는 파일
- cuckoo_<표정>.svg / .png       첫 프레임(문서·덱·영상 대체용), PNG는 512px
- frames/cuckoo_<표정>_<n>.svg/.png  프레임별(앱은 PNG, 영상은 SVG)
- anim/<표정>.svg                 프레임을 CSS로 돌리는 움직이는 SVG(휴대폰 웹)
- app_icon_background.png / app_icon_foreground.png  432px 적응형 아이콘
- preview.gif / preview.png       전체 표정 미리보기
"""
import os, sys
from PIL import Image, ImageDraw

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
FRAME_MS = 320
N = 32
LCD, LIT, GHOST = (42, 34, 48), (255, 233, 163), (255, 233, 163, 14)
RED = (255, 107, 127)
# 새 그림(32×32, 켜진 칸 #). PixelLab Pro 1비트 후보 중 하나를 골라 옮긴 것
BIRD = """
.....................###........
....................#####.......
...................#######......
..................####.##.##....
..................####..#..##...
.................#########......
................#########.......
..............###..######.......
.............######.####........
............#######.###.........
...........########.###.........
..........########.####.........
.........########.####..........
.........#######.#####..........
.......########.#####...........
......######...#####............
............######..............
.........###..#..#..............
......#####...#...#.............
.....#####.###.#.####...........
....#####............######.....
...#####..................##....
..#####.....................##..
..###...........................
"""
BIRD_TOP = 3                      # 위 문자열 첫 줄의 원래 y
OX, OY = -2, 4                    # 원래 좌표 → 캔버스. 위 7줄과 오른쪽 4칸을 소품 자리로 비운다
BASE = {(x, y + BIRD_TOP) for y, row in enumerate(BIRD.strip().splitlines()) for x, c in enumerate(row) if c == "#"}
EYE = {(22, 6), (22, 7), (23, 7)}
UPPER_BEAK = {(26, 6), (27, 6)}
BODY_MAX_Y = 18                   # 이 줄까지가 몸(아래는 다리·가지)
WING_UP = {6: (8, 9), 7: (8, 11), 8: (9, 13), 9: (10, 15), 10: (11, 16), 11: (12, 16)}  # 등에서 왼쪽 위로 든 날개


def bird(eye="open", beak="shut", bob=0, lean=0, wing="down"):
    """켜진 칸 집합(캔버스 좌표)"""
    on = set(BASE)
    if eye != "open":
        on |= EYE
        on -= {"shut": {(21, 7), (22, 7), (23, 7)}, "smile": {(21, 7), (22, 6), (23, 7)},
               "wide": {(22, 5), (23, 5), (22, 6), (23, 6), (22, 7), (23, 7)}}[eye]
    if beak == "open":
        on -= UPPER_BEAK
        on |= {(26, 5), (27, 5), (28, 4)}
    if wing == "up":
        on |= {(x, y) for y, (a, b) in WING_UP.items() for x in range(a, b + 1)}
    body = {(x + lean, y + bob) for x, y in on if y <= BODY_MAX_Y}
    legs = {p for p in on if p[1] > BODY_MAX_Y}
    return {(x + OX, y + OY) for x, y in body | legs if 0 <= x + OX < N and 0 <= y + OY < N}


def bars(n):
    """왼쪽 위 무전 신호 막대 n개(0~4)"""
    return {(1 + 2 * i, y) for i in range(n) for y in range(5 - i, 6)}


def glyph(rows, x, y):
    return {(x + i, y + j) for j, r in enumerate(rows) for i, c in enumerate(r) if c == "#"}


EXCL = glyph(["#", "#", "#", "#", ".", "#"], 0, 0)
Z = glyph(["###", "..#", ".#.", "###"], 0, 0)
CHECK = glyph(["....#", "...#.", "#.#..", ".#..."], 0, 0)
Q = glyph([".##.", "#..#", "..#.", ".#..", "....", ".#.."], 0, 0)
FLAG = [glyph(["#####", "#####", "###..", "#....", "#....", "#...."], 0, 0),
        glyph(["####.", "#####", "#.###", "#....", "#....", "#...."], 0, 0)]
CAM = glyph([".##...", "######", "#....#", "#.##.#", "#....#", "######"], 0, 0)
SIREN = [glyph(["..#..", ".###.", ".###.", "#####"], 0, 0),
         glyph(["#...#", "..#..", ".###.", ".###.", "#####"], 0, -1)]
BOX = glyph(["#.###", ".....", "#.###", ".....", "#.###"], 0, 0)


def mv(s, dx, dy):
    return {(x + dx, y + dy) for x, y in s}


def arcs(n, x, y, out=True):
    s = set()
    for i in range(n):
        h = 2 + i
        cx = x + 2 * i if out else x + 4 - 2 * i
        s |= {(cx + (0 if abs(j) < h else -1) * (1 if out else -1), y + j) for j in range(-h, h + 1)}
    return s


CHICK = glyph(["..##..", ".####b", "##.###", ".####.", "..#.#."], 0, 0)
B4 = bars(4)
ANIMS = {
    "base": [bird() | B4, bird() | B4, bird(eye="shut") | B4, bird(bob=1) | B4],
    "talk": [bird(beak="open", eye="smile") | arcs(1, 28, 10) | bars(1), bird(eye="smile") | arcs(2, 28, 10) | bars(2),
             bird(beak="open", eye="smile") | arcs(3, 28, 10) | bars(3), bird(eye="smile") | bars(4)],
    "rx": [bird() | arcs(1, 27, 10, out=False) | bars(4), bird(bob=1) | arcs(2, 27, 10, out=False) | bars(3),
           bird(bob=1) | arcs(3, 27, 10, out=False) | bars(2), bird(eye="wide") | bars(1)],
    "alert": [bird(eye="wide", wing="up") | mv(EXCL, 29, 0) | B4, bird(eye="wide", beak="open") | B4,
              bird(eye="wide", wing="up") | mv(EXCL, 29, 0) | B4, bird(eye="wide", beak="open") | B4],
    "brake": [bird(eye="wide", lean=-1) | mv(EXCL, 28, 0) | mv(EXCL, 30, 0) | B4, bird(eye="wide", lean=-1) | B4,
              bird(eye="wide", lean=-2, beak="open") | mv(EXCL, 28, 0) | mv(EXCL, 30, 0) | B4, bird(eye="wide", lean=-1) | B4],
    "rain": [bird() | B4 | {(27, 0), (23, 3), (30, 4), (26, 5)}, bird() | B4 | {(27, 2), (23, 5), (30, 0), (26, 1)},
             bird(eye="shut") | B4 | {(27, 4), (23, 1), (30, 2), (26, 3)}, bird() | B4 | {(27, 6), (23, 3), (30, 4), (26, 5)}],
    "camera": [bird() | mv(CAM, 25, 0) | B4, bird(eye="wide") | mv(CAM, 25, 0) | B4 | {(24, 0), (31, 6), (23, 3)},
               bird(eye="shut") | mv(CAM, 25, 0) | B4, bird() | mv(CAM, 25, 0) | B4],
    "lost": [bird(lean=-1) | mv(Q, 27, 0) | bars(1), bird() | bars(0), bird(lean=-1) | mv(Q, 27, 0) | bars(1), bird(lean=1) | mv(Q, 27, 0) | bars(0)],
    "vote": [bird(wing="up") | mv(BOX, 26, 0) | B4, bird() | mv(BOX, 26, 0) | {(27, 0)} | B4, bird(wing="up") | mv(BOX, 26, 0) | {(27, 0), (27, 2)} | B4,
             bird(eye="smile") | mv(BOX, 26, 0) | {(27, 0), (27, 2), (27, 4)} | B4],
    "arrive": [bird(eye="smile") | mv(FLAG[0], 26, 0) | B4, bird(eye="smile", bob=-1) | mv(FLAG[1], 26, 0) | B4,
               bird(eye="smile") | mv(FLAG[0], 26, 0) | B4, bird(eye="smile", wing="up") | mv(FLAG[1], 26, 0) | B4],
    "rest": [bird(eye="shut", bob=1) | mv(Z, 25, 4) | B4, bird(eye="shut", bob=1) | mv(Z, 26, 2) | B4,
             bird(eye="shut", bob=1) | mv(Z, 27, 0) | B4, bird(eye="shut") | B4],
    "rollcall": [bird(eye="smile", wing="up") | mv(CHECK, 26, 1) | B4, bird(eye="smile") | B4, bird(eye="smile", wing="up") | mv(CHECK, 26, 1) | B4,
                 bird(eye="smile", bob=-1) | B4],
    "kids": [bird(eye="smile") | mv(CHICK, 24, 21) | B4, bird(eye="smile") | mv(CHICK, 24, 19) | B4, bird() | mv(CHICK, 24, 21) | B4,
             bird(eye="shut") | mv(CHICK, 25, 21) | B4],
    "emergency": [bird(eye="wide", wing="up", beak="open") | mv(SIREN[1], 26, 1) | B4, bird(eye="wide") | mv(SIREN[0], 26, 1) | B4,
                  bird(eye="wide", wing="up", beak="open") | mv(SIREN[1], 26, 1) | B4, bird(eye="wide") | mv(SIREN[0], 26, 1) | B4],
}
RED_SET = {"alert", "brake", "emergency", "lost"}


def frame(px, s=16, red=False):
    """s 배 확대한 LCD 칸. 꺼진 칸은 흐린 점으로 남겨 LCD 느낌을 낸다"""
    W = N * s
    im = Image.new("RGB", (W, W), LCD)
    d = ImageDraw.Draw(im, "RGBA")  # RGB 바탕에 그려야 흐린 점이 섞인다
    g = max(1, s // 8)
    lit = RED if red else LIT
    for y in range(N):
        for x in range(N):
            box = (x * s + g, y * s + g, (x + 1) * s - g - 1, (y + 1) * s - g - 1)
            if (x, y) in px:  # 켜진 칸은 틈 없이 채워 덩어리로 보이게, 꺼진 칸만 점으로
                d.rectangle((x * s, y * s, (x + 1) * s - 1, (y + 1) * s - 1), fill=lit)
            else:
                d.rectangle(box, fill=GHOST)
    m = Image.new("L", (W, W), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, W - 1, W - 1), radius=s * 2, fill=255)
    im.putalpha(m)
    return im


def hexc(c):
    return "#%02X%02X%02X" % c[:3]


def svg_frame(px, red=False):
    """한 프레임 SVG 조각: 꺼진 칸 점 무늬 위에 켜진 칸을 가로줄 단위로 묶어 그린다"""
    lit = hexc(RED if red else LIT)
    rects = []
    for y in range(N):
        x = 0
        while x < N:
            if (x, y) in px:
                a = x
                while x < N and (x, y) in px:
                    x += 1
                rects.append(f'<rect x="{a}" y="{y}" width="{x - a}" height="1"/>')
            else:
                x += 1
    return f'<g fill="{lit}">{"".join(rects)}</g>'


def svg_wrap(inner):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512" shape-rendering="crispEdges">'
            '<defs><pattern id="d" width="1" height="1" patternUnits="userSpaceOnUse"><rect x=".125" y=".125" width=".75" height=".75" '
            f'fill="{hexc(LIT)}" fill-opacity=".055"/></pattern><clipPath id="r"><rect width="32" height="32" rx="2"/></clipPath></defs>'
            f'<g clip-path="url(#r)"><rect width="32" height="32" fill="{hexc(LCD)}"/><rect width="32" height="32" fill="url(#d)"/>{inner}</g></svg>\n')


def svg_anim(frames, red=False):
    n = len(frames); T = FRAME_MS * n
    css = "".join(f".f{i}{{animation:a{i} {T}ms steps(1) infinite}}@keyframes a{i}{{0%{{opacity:0}}{100 * i / n:.3f}%{{opacity:1}}{100 * (i + 1) / n:.3f}%{{opacity:0}}}}"
                  for i in range(n))
    css = css.replace("0%{opacity:0}0.000%{opacity:1}", "0%{opacity:1}")
    body = "".join(svg_frame(p, red).replace("<g ", f'<g class="f{i}" ', 1) for i, p in enumerate(frames))
    return svg_wrap(f"<style>{css}</style>{body}")


if __name__ == "__main__":
    from PIL import ImageFont
    os.makedirs(f"{OUT}/frames", exist_ok=True); os.makedirs(f"{OUT}/anim", exist_ok=True)
    for k, fs in ANIMS.items():
        red = k in RED_SET
        for i, p in enumerate(fs):
            frame(p, 16, red).save(f"{OUT}/frames/cuckoo_{k}_{i}.png")
            open(f"{OUT}/frames/cuckoo_{k}_{i}.svg", "w").write(svg_wrap(svg_frame(p, red)))
        frame(fs[0], 16, red).save(f"{OUT}/cuckoo_{k}.png")
        open(f"{OUT}/cuckoo_{k}.svg", "w").write(svg_wrap(svg_frame(fs[0], red)))
        open(f"{OUT}/anim/{k}.svg", "w").write(svg_anim(fs, red))

    # 적응형 아이콘(432px = 108dp×4): 바탕은 LCD 점 무늬, 전경은 켜진 칸만. 새를 가운데 66dp 안전 영역에 넣는다
    full = Image.new("RGB", (432, 432), LCD); d = ImageDraw.Draw(full, "RGBA")
    for y in range(0, 432, 12):
        for x in range(0, 432, 12):
            d.rectangle((x + 2, y + 2, x + 9, y + 9), fill=GHOST)
    full.save(f"{OUT}/app_icon_background.png")
    px = ANIMS["base"][0]
    xs = [x for x, _ in px]; ys = [y for _, y in px]
    w, h = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
    s = 216 // max(w, h)  # 대각선까지 지름 66dp(264px) 원 안에 들게
    fg = Image.new("RGBA", (432, 432), (0, 0, 0, 0)); d = ImageDraw.Draw(fg)
    ox, oy = (432 - w * s) // 2 - min(xs) * s, (432 - h * s) // 2 - min(ys) * s
    for x, y in px:
        d.rectangle((ox + x * s, oy + y * s, ox + (x + 1) * s - 1, oy + (y + 1) * s - 1), fill=LIT)
    fg.save(f"{OUT}/app_icon_foreground.png")

    FONT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 16)
    keys = list(ANIMS); cols = 7; cell = 32 * 6; pad = 12
    rows = (len(keys) + cols - 1) // cols
    sheet = []
    for f in range(4):
        S = Image.new("RGB", (cols * (cell + pad) + pad, rows * (cell + pad + 22) + pad), (255, 250, 246))
        d = ImageDraw.Draw(S)
        for i, k in enumerate(keys):
            x, y = pad + (i % cols) * (cell + pad), pad + (i // cols) * (cell + pad + 22)
            S.paste(frame(ANIMS[k][f], 6, k in RED_SET).convert("RGB"), (x, y))
            d.text((x + 4, y + cell + 4), k, fill=(42, 34, 48), font=FONT)
        sheet.append(S)
    sheet[0].save(f"{OUT}/preview.gif", save_all=True, append_images=sheet[1:], duration=FRAME_MS, loop=0)
    sheet[0].save(f"{OUT}/preview.png")
    print("ok", len(ANIMS))
