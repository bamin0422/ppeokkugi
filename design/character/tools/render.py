"""render.py DIR: 512px transparent PNGs + preview.png via ONE headless-Chrome shot each, cropped with PIL."""
import sys, os, subprocess, tempfile
from PIL import Image

D = sys.argv[1]
S = tempfile.mkdtemp(prefix="cuckoo-render-")
CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
NAMES = ["cuckoo_base", "cuckoo_talk", "cuckoo_alert", "cuckoo_rest", "cuckoo_rollcall", "cuckoo_kids"]


def shot(html, w, h, out):
    p = os.path.join(S, "page.html"); open(p, "w").write(html)
    if os.path.exists(out): os.remove(out)
    try:
        subprocess.run(["timeout", "40", CH, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--force-device-scale-factor=1", f"--user-data-dir={S}/prof",
                        "--default-background-color=00000000", f"--window-size={w},{h}",
                        f"--screenshot={out}", "file://" + p], capture_output=True)
    finally:
        assert os.path.exists(out), "chrome failed"


def u(n): return "file://" + os.path.join(D, n + ".svg")


# 1) all sprites in a 3x2 grid of 512 cells -> crop
cells = "".join(f'<img src="{u(n)}" width=512 height=512 style="position:absolute;left:{(i%3)*512}px;top:{(i//3)*512}px">'
                for i, n in enumerate(NAMES))
grid = os.path.join(S, "grid.png")
shot(f"<html><body style='margin:0;background:transparent'>{cells}</body></html>", 1536, 1024, grid)
g = Image.open(grid).convert("RGBA")
for i, n in enumerate(NAMES):
    x, y = (i % 3) * 512, (i // 3) * 512
    g.crop((x, y, x + 512, y + 512)).save(os.path.join(D, n + ".png"))

# 2) contact sheet
labels = ["base", "talk", "alert", "rest", "rollcall", "kids"]


def row(bg, fg):
    figs = "".join(f"<figure><img src='{u(n)}' width=170><img class=s src='{u(n)}' width=48>"
                   f"<figcaption>{l}</figcaption></figure>" for n, l in zip(NAMES, labels))
    figs += (f"<figure><div class=ic><img src='{u('app_icon_background')}' width=150><img src='{u('app_icon_foreground')}' width=150></div>"
             f"<div class='ic s48'><img src='{u('app_icon_background')}' width=48><img src='{u('app_icon_foreground')}' width=48></div>"
             f"<figcaption>app icon</figcaption></figure>")
    return f"<div class=row style='background:{bg};color:{fg}'>{figs}</div>"


css = ("body{margin:0;font:600 15px Pretendard,'Apple SD Gothic Neo',sans-serif}"
       ".row{display:flex;gap:4px;padding:22px 16px;align-items:flex-end;height:276px;box-sizing:border-box}"
       "figure{margin:0;width:196px;text-align:center}figure>img{display:block;margin:auto}img.s{margin-top:6px!important}"
       "figcaption{margin-top:6px;opacity:.75}.ic{position:relative;width:150px;height:150px;margin:10px auto 0;border-radius:50%;overflow:hidden}"
       ".ic img{position:absolute;left:0;top:0}.ic.s48{width:48px;height:48px;margin-top:6px}")
shot(f"<html><head><style>{css}</style></head><body>{row('#1f1b18', '#F2E8D0')}{row('#F7F0E3', '#3A302A')}</body></html>",
     1420, 552, os.path.join(D, "preview.png"))
print("ok")
