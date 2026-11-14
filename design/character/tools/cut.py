"""뻐꾸기 3D 마스코트 정리. 사용: python3 tools/cut.py [design/character 폴더]

source/<표정>.png(Google Flow 이미지 생성 원본, 흰 바탕)에서 흰 바탕을 걷어 cuckoo_<표정>.png(1024px 투명 PNG)를 만든다.
어른 새는 모두 같은 배율로 맞추고 새끼(kids)만 어른 키의 0.62배로 줄인다. 밝은·어두운 바탕 미리보기 preview.png도 만든다.
"""
import sys, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ORDER = ["base", "talk", "rx", "alert", "rest", "rollcall", "kids", "arrive", "vote"]
OUT, MARGIN = 1024, 0.08
KIDS_RATIO = 0.62          # chick height relative to the adult bird height
NEAR_WHITE = 14            # max channel distance from white counted as background
OVERRIDE = {}              # per-pose extra scale if a generation drew the bird bigger/smaller

def cutout(path):
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    d = (255 - rgb).max(axis=2)                       # distance from white
    near = d < NEAR_WHITE
    lab, n = ndi.label(near)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    # enclosed pure-white pockets (gaps between wing and body) are background too
    sizes = ndi.sum(np.ones_like(d), lab, range(1, n + 1))
    means = ndi.mean(d, lab, range(1, n + 1))
    for i, (s, m) in enumerate(zip(sizes, means), 1):
        if s > 1500 and m < 5:
            bg |= lab == i
    fg = ~bg
    fg = ndi.binary_opening(fg, iterations=1)         # drop speckles
    lab2, n2 = ndi.label(fg)                           # keep big parts only (bird + props)
    if n2:
        sz = ndi.sum(fg, lab2, range(1, n2 + 1))
        fg = np.isin(lab2, 1 + np.flatnonzero(sz > max(400, sz.max() * 0.002)))
    a = fg.astype(np.float32)
    band = ndi.binary_dilation(~fg, iterations=3) & fg
    interior = fg & ~band
    # coverage of an edge pixel = its distance from white relative to the nearby solid colour's
    dobj = ndi.maximum_filter(np.where(interior, d, 0), size=9)
    a[band] = np.clip(d[band] / np.maximum(dobj[band], 20), 0, 1)
    a = ndi.gaussian_filter(a, 0.6)
    a[~ndi.binary_dilation(fg, iterations=1)] = 0
    a = np.clip(a, 0, 1)
    # un-premultiply against white: C = a*F + (1-a)*255
    safe = np.maximum(a, 1e-3)[..., None]
    f = np.clip((rgb - (1 - a[..., None]) * 255) / safe, 0, 255)
    f = np.where(a[..., None] > 0.02, f, 0)
    return np.dstack([f, a * 255]).astype(np.uint8)

def bbox(rgba):
    ys, xs = np.nonzero(rgba[..., 3] > 128)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def main():
    cuts = {}
    for p in ORDER:
        src = glob.glob(f"{ROOT}/source/{p}.*")
        if src:
            cuts[p] = cutout(src[0])
    box = OUT * (1 - 2 * MARGIN)
    adults = [p for p in cuts if p != "kids"]
    # one shared factor: the biggest adult extent fills the safe box
    base_scale = min(box / max(b[2] - b[0], b[3] - b[1]) for b in (bbox(cuts[p]) for p in adults))
    adult_h = np.median([bbox(cuts[p])[3] - bbox(cuts[p])[1] for p in adults]) * base_scale
    for p, im in cuts.items():
        x0, y0, x1, y1 = bbox(im)
        w, h = x1 - x0, y1 - y0
        s = base_scale * OVERRIDE.get(p, 1)
        if p == "kids":
            s = adult_h * KIDS_RATIO / h
        s = min(s, box / max(w, h))
        crop = Image.fromarray(im).crop((x0, y0, x1, y1))
        crop = crop.resize((max(1, round(w * s)), max(1, round(h * s))), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
        canvas.paste(crop, ((OUT - crop.width) // 2, (OUT - crop.height) // 2), crop)
        canvas.save(f"{ROOT}/cuckoo_{p}.png")
        print(p, "scale %.3f" % s, "size", crop.size)
    # contact sheet: light row + dark row
    t, names = 240, [p for p in ORDER if p in cuts]
    sheet = Image.new("RGB", (t * len(names), t * 2))
    for i, p in enumerate(names):
        im = Image.open(f"{ROOT}/cuckoo_{p}.png").resize((t, t), Image.Resampling.LANCZOS)
        for r, col in enumerate(["#F2F4F6", "#191F28"]):
            tile = Image.new("RGB", (t, t), col)
            tile.paste(im, (0, 0), im)
            sheet.paste(tile, (i * t, r * t))
    sheet.save(f"{ROOT}/preview.png")

if __name__ == "__main__":
    main()
