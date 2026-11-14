"""서비스소개서.md → PDF. 사용: python3 build_pdf.py <md> <out.pdf>"""
import re, sys, pathlib, subprocess, tempfile, markdown
from PIL import Image

src = pathlib.Path(sys.argv[1]).resolve()
out_pdf = pathlib.Path(sys.argv[2]).resolve()
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
    if "screens" in m[2] and im.width == 2560:
        # 에뮬레이터 화면에서 왼쪽 클러스터와 아래 작업 표시줄을 잘라 앱 영역만 남긴다
        path = crop_dir / path.name
        im.crop((852, 88, 2540, 1296)).save(path)
        im = Image.open(path)
    cls = "tall" if im.height > im.width else "wide" if im.width > 1.55 * im.height else "half"
    return f'<figure class="{cls}"><img src="{path.as_uri()}"><figcaption>{m[1]}</figcaption></figure>'
html = re.sub(r'<p><img alt="([^"]*)" src="\.\./([^"]+)" /></p>', fig, html)

icon = (root / "design/character/cuckoo_base.svg").as_uri()
serif = (root / "app/src/main/res/font/pretendard_extrabold.otf").as_uri()
css = f"""@font-face {{ font-family: "PretendardXB"; src: url({serif}); font-weight: 700; }}
@page {{ size: A4; margin: 18mm 17mm 18mm; }}
html {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
body {{ font-family: Pretendard, sans-serif; color: #2a2230; font-size: 10.4pt; line-height: 1.72; margin: 0; word-break: keep-all; }}
.cover {{ height: 255mm; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; page-break-after: always; }}
.cover img {{ width: 58mm; height: 58mm; margin-bottom: 12mm; }}
.cover .name {{ font-family: "PretendardXB", Pretendard, sans-serif; font-weight: 700; font-size: 44pt; letter-spacing: -.03em; }}
.cover .tag {{ display: inline-block; font-weight: 700; font-size: 15pt; color: #ffe9a3; background: #2a2230; border-radius: 99px; padding: 2.5mm 7mm; margin-top: 4mm; }}
.cover .sub {{ font-size: 10.5pt; color: #6e6170; margin-top: 12mm; border-top: 1.5px solid #f1e6df; padding-top: 4mm; }}
h2 {{ font-family: "PretendardXB", Pretendard, sans-serif; font-size: 16pt; font-weight: 700; letter-spacing: -.02em; margin: 9mm 0 3mm; padding-bottom: 1.8mm; border-bottom: 1.5px solid #f1e6df; break-after: avoid; }}
h2::before {{ content: ''; display: inline-block; width: 2.6mm; height: 2.6mm; border-radius: 50%; background: #ff7a1a; margin-right: 2.5mm; vertical-align: .4mm; }}
h2:first-of-type {{ margin-top: 0; }}
blockquote {{ margin: 3mm 0 4mm; padding: 4.5mm 6mm; background: #ff7a1a; color: #fff; border-radius: 5mm; font-size: 13pt; font-weight: 700; }}
blockquote p {{ margin: 0; }}
table {{ width: 100%; border-collapse: separate; border-spacing: 0; margin: 3mm 0 4mm; font-size: 9.2pt; line-height: 1.5; break-inside: auto;
  border: 1.5px solid #f1e6df; border-radius: 4mm; overflow: hidden; }}
tr {{ break-inside: avoid; }}
th {{ font-weight: 700; background: #2a2230; color: #ffe9a3; text-align: left; padding: 2mm 2.5mm; }}
td {{ border-top: 1px solid #f1e6df; padding: 2mm 2.5mm; vertical-align: top; }}
tr:nth-child(even) td {{ background: #fffaf6; }}
td:first-child {{ white-space: nowrap; font-weight: 600; }}
code {{ font-family: "SF Mono", Menlo, monospace; font-size: 8.6pt; background: #fbefe6; padding: .3mm 1mm; border-radius: 1mm; }}
pre {{ background: #2a2230; color: #ffe9a3; padding: 4mm; font-size: 8.6pt; line-height: 1.45; border-radius: 4mm; }}
pre code {{ background: none; color: inherit; padding: 0; }}
figure {{ margin: 2mm 0 4mm; break-inside: avoid; display: inline-block; vertical-align: top; }}
figure.half {{ width: 48.5%; }} figure.half:nth-of-type(odd) {{ margin-right: 2%; }}
figure.wide {{ width: 100%; }}
figure.tall {{ width: 38%; margin: 2mm 31% 4mm; }}
figure img {{ width: 100%; border: 1px solid #f1e6df; border-radius: 3mm; box-shadow: 0 2mm 5mm rgba(80,40,60,.08); }}
figcaption {{ font-size: 8.8pt; color: #6e6170; text-align: center; margin-top: 1.2mm; }}
ul, ol {{ padding-left: 5.5mm; }} li {{ margin: 1mm 0; }} li::marker {{ color: #ff7a1a; }}
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
