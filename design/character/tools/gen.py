"""뻐꾸기 캐릭터 v3 SVG 생성. 사용: python3 gen.py OUTDIR

실제 뻐꾸기 삽화를 단순화한 옆모습이다. 단색 면만 쓴다(그라데이션·외곽선 없음).
회청색 등, 크림색 배의 가로줄 3개, 노란 눈 테, 긴 꼬리가 뻐꾸기 표시다.
"""
import sys, os

OUT = sys.argv[1]

SLATE, DARK = "#5E7489", "#43566A"   # 머리·등 / 날개·꼬리
CREAM, BAR = "#FFF3E0", "#5E7489"    # 배 / 배 가로줄
BEAK, MOUTH = "#FF7A1A", "#C2452B"   # 부리(브랜드 주황) / 벌린 입 안
INK, RING, FOOT = "#2A2230", "#FFBF1F", "#F0A21A"
PERCH = "#A8876B"                    # 횃대(밝은·어두운 배경 모두에서 보이게)
TX, RX = "#FF3D5A", "#2B8CFF"        # 송신 빨강 / 수신 파랑

# 몸은 세워서 그린 뒤 TILT 만큼 기울인다(몸 중심 100,112). 머리·부리·눈은 기울이지 않는다.
TILT = 46


def bird(beak="shut", eye="dot", wing="down", tail=1.0, head=(0, 0), feet=True):
    hx, hy = 137 + head[0], 80 + head[1]
    tl = 62 * tail
    up = "M117 86 C110 60 94 38 74 24 C71 34 72 43 76 51 C68 47 61 47 57 50 C61 60 67 68 75 74 C69 74 63 76 59 80 C69 92 85 101 99 105 Z"
    folded = '<path d="M84 84 C70 100 70 134 84 166 C96 150 104 120 98 92 C96 84 90 80 84 84 Z" fill="%s"/>' % DARK
    # 접은 날개는 몸과 함께 기울고, 든 날개(점호)·뒤로 편 날개(경고)는 어깨(109,92)에서 돈다
    raised = {"down": "", "up": '<path d="%s" fill="%s"/>' % (up, DARK),
              "flare": '<path d="%s" fill="%s" transform="rotate(-38 109 92)"/>' % (up, DARK)}[wing]
    te = 140 + tl
    body = (
        '<g transform="rotate(%d 100 112)">' % TILT
        + '<clipPath id="t"><path d="M88 136 L84 %.0f Q84 %.0f 96.5 %.0f Q109 %.0f 109 %.0f L105 136 Z"/></clipPath>' % (te - 10, te, te, te, te - 10)
        + '<g clip-path="url(#t)"><rect x="80" y="130" width="34" height="%.0f" fill="%s"/><rect x="80" y="%.0f" width="34" height="12" fill="#C9D4DE"/></g>' % (tl + 12, DARK, te - 9)
        + '<ellipse cx="100" cy="112" rx="29" ry="47" fill="%s"/>' % SLATE
        + '<clipPath id="b"><ellipse cx="100" cy="112" rx="29" ry="47"/></clipPath>'
        + '<g clip-path="url(#b)"><ellipse cx="118" cy="122" rx="24" ry="40" fill="%s"/>' % CREAM
        + "".join('<path d="M106 %d H132" stroke="%s" stroke-width="3.6" stroke-linecap="round"/>' % (y, BAR) for y in (108, 121, 134))
        + "</g>" + (folded if wing == "down" else "") + "</g>" + raised
    )
    legs = ""
    if feet:
        legs = ('<path d="M84 146 V160 M95 150 V160" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % FOOT
                + '<path d="M56 162 H124" stroke="%s" stroke-width="5" stroke-linecap="round"/>' % PERCH)
    head_ = '<circle cx="%d" cy="%d" r="25" fill="%s"/>' % (hx, hy, SLATE)
    bx, by = hx + 22, hy + 1
    if beak == "shut":
        beak_ = '<path d="M%d %d q16 -1 24 9 q-12 6 -24 6 Z" fill="%s"/>' % (bx, by - 7, BEAK)
    else:  # 벌린 부리: 위·아래 부리 사이에 입 안
        beak_ = ('<path d="M%d %d l12 0 l0 12 Z" fill="%s"/>' % (bx - 2, by - 4, MOUTH)
                 + '<path d="M%d %d q17 -5 26 3 q-13 5 -26 7 Z" fill="%s"/>' % (bx, by - 10, BEAK)
                 + '<path d="M%d %d q12 4 18 13 q-11 0 -19 -5 Z" fill="%s"/>' % (bx - 1, by + 4, BEAK))
    ex, ey = hx + 8, hy - 6
    eye_ = {
        "dot": '<circle cx="%d" cy="%d" r="8" fill="%s"/><circle cx="%d" cy="%d" r="4.8" fill="%s"/><circle cx="%.1f" cy="%.1f" r="1.5" fill="#fff"/>' % (ex, ey, RING, ex, ey, INK, ex + 1.6, ey - 1.8),
        "wide": '<circle cx="%d" cy="%d" r="9.500" fill="%s"/><circle cx="%d" cy="%d" r="6.500" fill="#fff"/><circle cx="%d" cy="%d" r="3.2" fill="%s"/>' % (ex, ey, RING, ex, ey, ex + 1, ey, INK),
        "smile": '<path d="M%d %d q7 -9 14 0" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % (ex - 7, ey + 3, INK),
        "shut": '<path d="M%d %d q7 7 14 0" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % (ex - 7, ey - 1, INK),
    }[eye]
    return body + legs + head_ + beak_ + eye_


def svg(inner, vb="0 0 200 200"):
    w = vb.split()[2]
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" width="%s" height="%s">%s</svg>\n' % (vb, w, vb.split()[3], inner)


def placed(inner, dx=-6, dy=-12, s=1.0):
    return '<g transform="translate(%d %d) scale(%s)">%s</g>' % (dx, dy, s, inner)


def waves(x, y, color):
    return "".join('<path d="M%d %d q%d %d 0 %d" fill="none" stroke="%s" stroke-width="4.500" stroke-linecap="round" opacity="%s"/>'
                   % (x + i * 9, y - 8 - i * 6, 7 + i * 3, 8 + i * 6, 16 + i * 12, color, o) for i, o in enumerate((1, .7, .4)))


POSES = {
    # 기본
    "cuckoo_base": placed(bird()),
    # 무전 중: 벌린 부리 + 소리 물결
    "cuckoo_talk": placed(bird(beak="open", eye="smile"), dx=-14) + waves(176, 72, TX),
    # 경고: 날개 펼침 + 큰 눈 + 느낌표
    "cuckoo_alert": placed(bird(beak="open", eye="wide", wing="flare")
                           + '<path d="M124 60 l-5 -13 l11 8 l1 -14 l8 13 l7 -10 l1 14 Z" fill="%s"/>' % SLATE, dx=-4, dy=-4)
                    + '<path d="M168 14 V40" stroke="%s" stroke-width="8" stroke-linecap="round"/><circle cx="168" cy="54" r="4.600" fill="%s"/>' % (TX, TX),
    # 휴게소: 눈 감고 고개 숙임 + z
    "cuckoo_rest": placed(bird(eye="shut", head=(-4, 6)), dy=-8)
                   + '<path d="M160 34 h13 l-13 14 h13" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' % RX
                   + '<path d="M178 14 h9 l-9 10 h9" fill="none" stroke="%s" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>' % RX,
    # 점호: 날개 번쩍 + 웃는 눈 + 체크
    "cuckoo_rollcall": placed(bird(eye="smile", wing="up"), dy=-6)
                       + '<path d="M158 30 l8 9 l15 -18" fill="none" stroke="%s" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' % RING,
    # 키즈: 작은 새끼, 짧은 꼬리
    "cuckoo_kids": placed(bird(tail=.5), dx=22, dy=24, s=.8),
}

for name, inner in POSES.items():
    open(os.path.join(OUT, name + ".svg"), "w").write(svg(inner))

# 적응형 아이콘: 108 캔버스, 가운데 66 안전 영역에 옆얼굴과 가슴 줄무늬
fg = ('<clipPath id="safe"><circle cx="54" cy="54" r="33"/></clipPath><g clip-path="url(#safe)">'
      '<g transform="translate(-44 -8) scale(.74)">%s</g></g>' % bird(feet=False))
open(os.path.join(OUT, "app_icon_foreground.svg"), "w").write(svg(fg, "0 0 108 108"))
open(os.path.join(OUT, "app_icon_background.svg"), "w").write(svg('<rect width="108" height="108" fill="#FFD9A8"/>', "0 0 108 108"))
print("ok", len(POSES))
