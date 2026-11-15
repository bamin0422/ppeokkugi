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

icon = (root / "design/character/cuckoo_base.png").as_uri()
fonts = "".join(f'@font-face {{ font-family: "PPK"; src: url({(root / f"app/src/main/res/font/pretendard_{n}.otf").as_uri()}); font-weight: {w}; }}\n'
                for n, w in (("regular", 400), ("semibold", 600), ("bold", 700), ("extrabold", 800)))
# 흰 면, 굵은 제목, 테두리 없는 회색 카드, 회색 글자 단계, 주 색은 마스코트 몸 색인 파랑
css = fonts + """@page { size: A4; margin: 18mm 17mm 18mm; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "PPK", sans-serif; color: #333D4B; font-size: 10.4pt; line-height: 1.72; margin: 0; word-break: keep-all; }
strong, b { color: #191F28; font-weight: 700; }
.cover { height: 255mm; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; page-break-after: always; }
.cover img { width: 58mm; height: 58mm; object-fit: contain; margin-bottom: 10mm; }
.cover .name { font-weight: 800; font-size: 48pt; letter-spacing: -.04em; color: #191F28; }
.cover .tag { display: inline-block; font-weight: 700; font-size: 14pt; color: #3340B8; background: #EEF0FF; border-radius: 2.6mm; padding: 2mm 5mm; margin-top: 4mm; }
.cover .sub { font-size: 10.5pt; color: #6B7684; margin-top: 12mm; }
h2 { font-weight: 800; font-size: 18pt; letter-spacing: -.03em; color: #191F28; margin: 11mm 0 3.5mm; break-after: avoid; }
h2:first-of-type { margin-top: 0; }
h3 { font-weight: 700; font-size: 12pt; color: #191F28; margin: 6mm 0 2mm; break-after: avoid; }
blockquote { margin: 3mm 0 4mm; padding: 5mm 6mm; background: #EEF0FF; color: #3340B8; border-radius: 6.4mm; font-size: 13pt; font-weight: 700; }
blockquote p { margin: 0; }
table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 3mm 0 4mm; font-size: 9.2pt; line-height: 1.5; break-inside: auto;
  background: #F9FAFB; border-radius: 6.4mm; overflow: hidden; }
tr { break-inside: avoid; }
th { font-weight: 600; color: #8B95A1; background: #F2F4F6; text-align: left; padding: 2.4mm 3mm; }
td { border-top: 1px solid #F2F4F6; padding: 2.2mm 3mm; vertical-align: top; }
td:first-child { white-space: nowrap; font-weight: 700; color: #191F28; }
code { font-family: "SF Mono", Menlo, monospace; font-size: 8.6pt; background: #F2F4F6; color: #4E5968; padding: .3mm 1mm; border-radius: 1mm; }
pre { background: #F2F4F6; color: #333D4B; padding: 4mm; font-size: 8.6pt; line-height: 1.45; border-radius: 4mm; }
pre code { background: none; color: inherit; padding: 0; }
figure { margin: 2mm 0 4mm; break-inside: avoid; display: inline-block; vertical-align: top; }
figure.half { width: 48.5%; } figure.half:nth-of-type(odd) { margin-right: 2%; }
figure.wide { width: 100%; }
figure.tall { width: 38%; margin: 2mm 31% 4mm; }
figure img { width: 100%; border-radius: 4mm; background: #F2F4F6; }
figcaption { font-size: 8.8pt; color: #8B95A1; text-align: center; margin-top: 1.2mm; }
ul, ol { padding-left: 5.5mm; } li { margin: 1mm 0; } li::marker { color: #5567F5; }
a { color: #3340B8; }
"""
doc = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>{name} 서비스 소개서</title><style>{css}</style></head><body>
<section class="cover"><img src="{icon}"><div class="name">{name.strip()}</div><div class="tag">{tagline.strip()}</div><div class="sub">{sub.strip()}</div></section>
{html}</body></html>"""
tmp = out_pdf.with_suffix(".html")
tmp.write_text(doc)
out_pdf.unlink(missing_ok=True)
# 기기가 바쁘면 Chrome이 PDF를 다 쓰고도 종료 단계에서 0이 아닌 값으로 끝난다. 종료 코드 대신 파일로 확인한다
subprocess.run(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--headless", "--disable-gpu",
                "--no-pdf-header-footer", "--allow-file-access-from-files", f"--print-to-pdf={out_pdf}", tmp.as_uri()],
               capture_output=True)
tmp.unlink()
assert out_pdf.exists() and out_pdf.stat().st_size > 100_000, "PDF가 만들어지지 않음"
print(out_pdf)
