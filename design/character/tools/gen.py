"""Generate cuckoo v2 SVGs. Usage: python3 gen.py OUTDIR"""
import sys, os

OUT = sys.argv[1]

TOP, MID, BELLY, BELLY2 = "#9DB4C8", "#B9CBDA", "#FFF7E8", "#F6E6C8"
LINE = "#7389A0"      # soft outline
WING = "#89A3BA"
STRIPE = "#DDC7A3"
BEAK, BEAK2 = "#FFB15C", "#F08A3C"
EYE = "#2B2522"
BLUSH = "#FF9FAE"
HEART = "#FF6B81"
STEM = "#7FA37A"      # sprout-green antenna stem

DEFS = f"""<defs>
  <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{TOP}"/><stop offset=".55" stop-color="{MID}"/><stop offset="1" stop-color="#D8E3EA"/>
  </linearGradient>
  <radialGradient id="belly" cx=".5" cy=".38" r=".62">
    <stop offset="0" stop-color="{BELLY}"/><stop offset=".6" stop-color="{BELLY2}"/><stop offset="1" stop-color="{BELLY2}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="shine" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="beak" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{BEAK}"/><stop offset="1" stop-color="{BEAK2}"/>
  </linearGradient>
  <linearGradient id="wing" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{WING}"/><stop offset="1" stop-color="#A9BED0"/>
  </linearGradient>
  <radialGradient id="shadow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#1f1b18" stop-opacity=".28"/><stop offset="1" stop-color="#1f1b18" stop-opacity="0"/>
  </radialGradient>
  <clipPath id="bodyclip"><path d="{{BODY}}"/></clipPath>
</defs>"""

# mochi body: slightly wider at the bottom, flat-ish base
BODY = ("M100 44 C140 44 164 78 166 118 C168 158 140 176 100 176 "
        "C60 176 32 158 34 118 C36 78 60 44 100 44 Z")


def heart(x, y, s=1.0):
    return (f'<path transform="translate({x} {y}) scale({s})" '
            f'd="M0 5 C-7 0 -8 -6 -4 -8 C-2 -9 -0.5 -8 0 -6 C0.5 -8 2 -9 4 -8 C8 -6 7 0 0 5 Z" '
            f'fill="{HEART}" stroke="#E25570" stroke-width="1"/>')


def antenna(dy=0, rot=0):
    # curly sprout from crown, ending in a heart
    return (f'<g transform="translate(0 {dy}) rotate({rot} 100 46)">'
            f'<path d="M100 46 C99 36 92 34 94 26 C96 18 107 20 105 27 C104 31 99 30 100 26" '
            f'fill="none" stroke="{STEM}" stroke-width="3.2" stroke-linecap="round"/>'
            f'<path d="M101 40 C106 34 114 35 116 38 C112 42 106 42 101 40 Z" fill="#9CC48E"/>'
            f'{heart(100, 18, 1.15)}</g>')


def eyes_open(y=106, r=7.5):
    out = ""
    for x in (73, 127):
        out += (f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r+1}" fill="{EYE}"/>'
                f'<circle cx="{x-2.4}" cy="{y-3.2}" r="{r*0.36:.1f}" fill="#fff"/>'
                f'<circle cx="{x+2.6}" cy="{y+3}" r="{r*0.16:.1f}" fill="#fff" opacity=".9"/>')
    return out


def eyes_happy(y=106):   # ^ ^
    return "".join(f'<path d="M{x-8} {y+3} Q{x} {y-8} {x+8} {y+3}" fill="none" stroke="{EYE}" '
                   f'stroke-width="4" stroke-linecap="round"/>' for x in (73, 127))


def eyes_sleepy(y=106):  # u u (lids down)
    return "".join(f'<path d="M{x-8} {y-1} Q{x} {y+7} {x+8} {y-1}" fill="none" stroke="{EYE}" '
                   f'stroke-width="3.6" stroke-linecap="round"/>' for x in (73, 127))


def eyes_squeeze(y=106):  # > <
    l = f'<path d="M66 {y-7} L79 {y} L66 {y+7}" fill="none" stroke="{EYE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    r = f'<path d="M134 {y-7} L121 {y} L134 {y+7}" fill="none" stroke="{EYE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    return l + r


def blush(y=121):
    return "".join(f'<ellipse cx="{x}" cy="{y}" rx="10" ry="5.5" fill="{BLUSH}" opacity=".6"/>' for x in (58, 142))


def beak_closed(y=114):
    return (f'<path d="M91 {y} Q100 {y-5} 109 {y} Q104 {y+9} 100 {y+10} Q96 {y+9} 91 {y} Z" '
            f'fill="url(#beak)" stroke="{BEAK2}" stroke-width="1.2" stroke-linejoin="round"/>'
            f'<ellipse cx="97" cy="{y-0.5}" rx="3" ry="1.4" fill="#fff" opacity=".55"/>')


def beak_open(y=113, wide=1.0):
    h = 9 * wide
    return (f'<path d="M92 {y+2} Q100 {y+2+h*1.6} 108 {y+2} Z" fill="#B5475A"/>'
            f'<path d="M95 {y+5} Q100 {y+2+h*1.3} 105 {y+5} Q100 {y+3} 95 {y+5} Z" fill="#F7909E"/>'
            f'<path d="M90 {y+1} Q100 {y-6} 110 {y+1} Q100 {y+6} 90 {y+1} Z" fill="url(#beak)" stroke="{BEAK2}" stroke-width="1.2" stroke-linejoin="round"/>'
            f'<path d="M92 {y+3} Q100 {y+2+h*1.7} 108 {y+3}" fill="none" stroke="{BEAK2}" stroke-width="3" stroke-linecap="round"/>')


def wing_l(rot=0):
    return (f'<ellipse cx="38" cy="126" rx="10" ry="16" fill="url(#wing)" stroke="{LINE}" stroke-width="2" '
            f'transform="rotate({20+rot} 38 126)"/>')


def wing_r(rot=0):
    return (f'<ellipse cx="162" cy="126" rx="10" ry="16" fill="url(#wing)" stroke="{LINE}" stroke-width="2" '
            f'transform="rotate({-20-rot} 162 126)"/>')


def wing_r_up():
    return (f'<ellipse cx="164" cy="86" rx="10" ry="18" fill="url(#wing)" stroke="{LINE}" stroke-width="2" '
            f'transform="rotate(32 164 86)"/>')


def body(face, wings_back="", wings_front="", extra_back="", extra_front="", ant=True):
    stripes = "".join(f'<path d="M{100-w} {y} Q100 {y+5} {100+w} {y}" fill="none" stroke="{STRIPE}" '
                      f'stroke-width="2.6" stroke-linecap="round" opacity=".75"/>'
                      for y, w in ((142, 6), (151, 8), (160, 6)))
    return f"""
<ellipse cx="100" cy="181" rx="56" ry="8" fill="url(#shadow)"/>
{extra_back}
<path transform="translate(152 158) scale(.62) translate(-150 -152)" d="M150 150 C162 136 176 134 178 140 C174 142 172 144 171 146 C178 146 182 152 178 156 C170 156 162 160 152 164 Z" fill="{WING}" stroke="{LINE}" stroke-width="2" stroke-linejoin="round"/>
{wings_back}
<ellipse cx="88" cy="177" rx="8" ry="4.5" fill="{BEAK2}"/><ellipse cx="112" cy="177" rx="8" ry="4.5" fill="{BEAK2}"/>
{(antenna() if ant is True else ant) or ''}
<path d="{BODY}" fill="url(#body)"/>
<g clip-path="url(#bodyclip)"><ellipse cx="100" cy="158" rx="58" ry="48" fill="url(#belly)"/></g>
<path d="{BODY}" fill="none" stroke="{LINE}" stroke-width="2.4"/>
<ellipse cx="80" cy="64" rx="22" ry="11" fill="url(#shine)" transform="rotate(-18 80 64)"/>
{stripes}
{blush()}
{face}
{wings_front}
{extra_front}"""


def svg(inner, vb="0 0 200 200", w=200):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{w}">\n'
            f'{DEFS.replace("{BODY}", BODY)}\n{inner}\n</svg>\n')


W = wing_l() + wing_r()

files = {}
files["cuckoo_base"] = svg(body(eyes_open() + beak_closed(), wings_front=W))

sound = "".join(f'<path d="M{150+i*10} {82-i*6} Q{160+i*13} {98} {150+i*10} {114+i*6}" fill="none" '
                f'stroke="#F2A65A" stroke-width="3.4" stroke-linecap="round" opacity="{1-i*0.25}"/>' for i in range(3))
files["cuckoo_talk"] = svg(body(eyes_happy(104) + beak_open(), wings_front=wing_l(-25) + wing_r(-25),
                                extra_front=f'<g transform="translate(14 -6)">{sound}</g>'))

sweat = (f'<path d="M150 58 C150 58 140 72 140 78 C140 84 145 88 150 88 C155 88 160 84 160 78 C160 72 150 58 150 58 Z" '
         f'fill="#BFE6FF" stroke="#6FA8D6" stroke-width="2"/><ellipse cx="146" cy="78" rx="2.4" ry="4" fill="#fff" opacity=".8"/>')
bang = (f'<g transform="translate(40 30) rotate(-10)"><path d="M-17 -15 Q0 -24 17 -15 Q25 0 17 13 L10 16 L4 26 L1 16 Q-14 18 -18 9 Q-24 -3 -17 -15 Z" '
        f'fill="#FF6B6B" stroke="#E04B5A" stroke-width="2" stroke-linejoin="round"/>'
        f'<rect x="-3" y="-13" width="6" height="15" rx="3" fill="#fff"/><circle cx="0" cy="8" r="3.4" fill="#fff"/></g>')
files["cuckoo_alert"] = svg(body(eyes_squeeze() + beak_open(114, 0.6),
                                 wings_front=wing_l(-55) + wing_r(-55), extra_front=sweat + bang))

steam = "".join(f'<path d="M{x} 106 C{x-4} 101 {x+4} 98 {x} 93" fill="none" stroke="#C9B9A6" stroke-width="2.4" '
                f'stroke-linecap="round" opacity=".9"/>' for x in (85, 115))
cup = (f'<path d="M114 117 C124 117 124 131 112 131" fill="none" stroke="#E8A0A8" stroke-width="3"/>'
       f'<path d="M84 112 L116 112 L113 136 Q112 142 106 142 L94 142 Q88 142 87 136 Z" fill="#FFFFFF" stroke="#E8A0A8" stroke-width="2.4" stroke-linejoin="round"/>'
       f'<ellipse cx="100" cy="113" rx="15" ry="3" fill="#B98A6A"/>'
       f'{heart(100, 127, 0.7)}')
cup_wings = (f'<ellipse cx="80" cy="132" rx="10" ry="8" fill="url(#wing)" stroke="{LINE}" stroke-width="2"/>'
             f'<ellipse cx="120" cy="132" rx="10" ry="8" fill="url(#wing)" stroke="{LINE}" stroke-width="2"/>')
zz = (f'<text x="146" y="58" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="800" font-size="20" fill="#8FA9C0">z</text>'
      f'<text x="160" y="40" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-weight="800" font-size="14" fill="#8FA9C0" opacity=".7">z</text>')
files["cuckoo_rest"] = svg(body(eyes_sleepy() + beak_closed(112), ant=antenna(0, -28),
                                extra_front=f'<g transform="translate(0 16)">{steam}{cup}{cup_wings}</g>' + zz))

spark = (f'<path d="M178 46 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="#FFD36E"/>'
         f'<path d="M30 70 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#FFD36E"/>')
files["cuckoo_rollcall"] = svg(body(eyes_happy() + beak_open(113, 0.9),
                                    wings_front=wing_l() + wing_r_up(), extra_front=spark))

# kids: rounder, smaller, bigger eyes, eggshell hat
shell = (f'<path d="M66 60 Q68 30 100 28 Q132 30 134 60 L126 52 L118 61 L110 51 L101 61 L92 51 L84 61 L75 52 Z" '
         f'fill="#FFFDF6" stroke="#D9CBB4" stroke-width="2.2" stroke-linejoin="round"/>'
         f'<ellipse cx="88" cy="38" rx="7" ry="3.5" fill="#fff" transform="rotate(-25 88 38)"/>'
         f'<circle cx="114" cy="42" r="2.2" fill="#F2D8C0"/><circle cx="104" cy="35" r="1.6" fill="#F2D8C0"/>')
kid = body(eyes_open(108, 9) + beak_closed(118), wings_front=W, extra_front=shell, ant=False)
files["cuckoo_kids"] = svg(f'<g transform="translate(100 182) scale(.82 .78) translate(-100 -182)">{kid}</g>'
                           .replace("1 1 2", "1 1 2"))

# app icon: 108 canvas, safe zone 66 dp circle centered (21..87). Close-up of face.
face = (f'<path d="{BODY}" fill="url(#body)"/>'
        f'<g clip-path="url(#bodyclip)"><ellipse cx="100" cy="158" rx="58" ry="48" fill="url(#belly)"/></g>'
        f'<path d="{BODY}" fill="none" stroke="{LINE}" stroke-width="2.4"/>'
        f'<ellipse cx="80" cy="64" rx="22" ry="11" fill="url(#shine)" transform="rotate(-18 80 64)"/>'
        + blush() + eyes_open() + beak_closed())
files["app_icon_foreground"] = svg(
    f'<g transform="translate(54 58) scale(.66) translate(-100 -104)">{antenna(24)}{face}</g>',
    vb="0 0 108 108", w=108)
files["app_icon_background"] = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">\n'
    '<defs><radialGradient id="bg" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#FFF8EC"/>'
    '<stop offset="1" stop-color="#F6E7D0"/></radialGradient></defs>\n'
    '<rect width="108" height="108" fill="url(#bg)"/>\n'
    '<g fill="#F2DCC0" opacity=".6"><circle cx="20" cy="22" r="3"/><circle cx="88" cy="30" r="2.4"/>'
    '<circle cx="84" cy="88" r="3"/><circle cx="24" cy="84" r="2.4"/></g>\n</svg>\n')

for k, v in files.items():
    open(os.path.join(OUT, k + ".svg"), "w").write(v)
print("wrote", len(files))
