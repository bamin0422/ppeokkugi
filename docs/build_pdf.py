"""서비스소개서.md → PDF. 사용: python3 build_pdf.py <md> <out.pdf>"""
import re, sys, pathlib, subprocess, tempfile, markdown
from PIL import Image

src = pathlib.Path(sys.argv[1]).resolve()
out_pdf = pathlib.Path(sys.argv[2])
root = pathlib.Path(__file__).resolve().parent.parent
md = src.read_text()
md = re.sub(r"<!-- HUMANIZE-SUMMARY.*?-->", "", md, flags=re.S)
title, rest = md.split("\n", 1)
title = title.lstrip("# ").strip()
name, tagline = title.split(":", 1)
sub, body = rest.strip().split("\n", 1)

html = markdown.markdown(body, extensions=["tables", "fenced_code"])
crop_dir = pathlib.Path(tempfile.mkdtemp(prefix="ppk-pdf-"))
def fig(m):
    path = root / m[2]
    im = Image.open(path)
    if "screens/" in m[2] and im.width == 2560:
        # 에뮬레이터 화면에서 왼쪽 클러스터와 아래 작업 표시줄을 잘라 앱 영역만 남긴다
        path = crop_dir / path.name
        im.crop((852, 88, 2540, 1296)).save(path)
        im = Image.open(path)
    cls = "tall" if im.height > im.width else "wide" if im.width > 1.55 * im.height else "half"
    return f'<figure class="{cls}"><img src="{path.as_uri()}"><figcaption>{m[1]}</figcaption></figure>'
html = re.sub(r'<p><img alt="([^"]*)" src="\.\./([^"]+)" /></p>', fig, html)

icon = (root / "app/src/main/res/drawable-nodpi/ic_launcher_art.png").as_uri()
fontdir = (root / "app/src/main/res/font").as_uri()
css = f"""@font-face {{ font-family: Galmuri; src: url({fontdir}/galmuri11_bold.ttf); }}
@page {{ size: A4; margin: 18mm 17mm 18mm; }}
body {{ font-family: Pretendard, sans-serif; color: #1a1d21; font-size: 10.4pt; line-height: 1.72; margin: 0; }}
.cover {{ height: 255mm; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; page-break-after: always; }}
.cover img {{ width: 62mm; height: 62mm; image-rendering: pixelated; box-shadow: 2mm 2mm 0 #121417; margin-bottom: 14mm; }}
.cover .name {{ font-family: Galmuri; font-size: 40pt; color: #121417; }}
.cover .tag {{ font-family: Galmuri; font-size: 18pt; color: #ff6a1a; margin-top: 2mm; }}
.cover .sub {{ font-size: 10.5pt; color: #5f656c; margin-top: 12mm; border-top: 2px solid #121417; padding-top: 4mm; }}
h2::before {{ content: '▮ '; color: #ff6a1a; }}
h2 {{ font-family: Galmuri; font-size: 15pt; font-weight: 400; margin: 9mm 0 3mm; padding-bottom: 1.5mm; border-bottom: 3px solid #121417; break-after: avoid; }}
h2:first-of-type {{ margin-top: 0; }}
blockquote {{ margin: 3mm 0 4mm; padding: 4mm 6mm; background: #c9d86a; color: #1a1f12; border-left: 4px solid #ff6a1a; font-size: 13pt; font-weight: 700; }}
blockquote p {{ margin: 0; }}
table {{ width: 100%; border-collapse: collapse; margin: 3mm 0 4mm; font-size: 9.2pt; line-height: 1.5; break-inside: auto; }}
tr {{ break-inside: avoid; }}
th {{ font-family: Galmuri; font-weight: 400; background: #121417; color: #fff; text-align: left; padding: 2mm 2.5mm; }}
td {{ border-bottom: 1px solid #e3e5e8; padding: 2mm 2.5mm; vertical-align: top; }}
tr:nth-child(even) td {{ background: #f5f6f7; }}
td:first-child {{ white-space: nowrap; font-weight: 600; }}
code {{ font-family: "SF Mono", Menlo, monospace; font-size: 8.6pt; background: #eef0f2; padding: .3mm 1mm; }}
pre {{ background: #121417; color: #c9d86a; padding: 4mm; font-size: 8.6pt; line-height: 1.45; }}
pre code {{ background: none; color: inherit; padding: 0; }}
figure {{ margin: 2mm 0 4mm; break-inside: avoid; display: inline-block; vertical-align: top; }}
figure.half {{ width: 48.5%; }} figure.half:nth-of-type(odd) {{ margin-right: 2%; }}
figure.wide {{ width: 100%; }} figure.wide img {{ image-rendering: pixelated; }}
figure.tall {{ width: 38%; margin: 2mm 31% 4mm; }}
figure img {{ width: 100%; border: 1px solid #1e2226; }}
figcaption {{ font-size: 8.8pt; color: #5f656c; text-align: center; margin-top: 1.2mm; }}
ul, ol {{ padding-left: 5.5mm; }} li {{ margin: 1mm 0; }}
"""
doc = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>{name} 서비스 소개서</title><style>{css}</style></head><body>
<section class="cover"><img src="{icon}"><div class="name">{name.strip()}</div><div class="tag">{tagline.strip()}</div><div class="sub">{sub.strip()}</div></section>
{html}</body></html>"""
tmp = out_pdf.with_suffix(".html")
tmp.write_text(doc)
subprocess.run(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--headless", "--disable-gpu",
                "--no-pdf-header-footer", "--allow-file-access-from-files", f"--print-to-pdf={out_pdf}", tmp.as_uri()],
               check=True, capture_output=True)
tmp.unlink()
print(out_pdf)
