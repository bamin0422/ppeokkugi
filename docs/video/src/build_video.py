#!/usr/bin/env python3
"""녹화 원본(raw/)으로 가로 시연 영상과 세로 숏폼을 만든다.

사용: python3 docs/video/src/build_video.py   (build_video.sh 가 부른다)
원본: raw/take1(시연 모드·봇 3대·휴대폰), raw/take2(코드로 참여·대장 콜·투표·경유지)
모든 화면은 실제 녹화 구간을 잘라 쓰고, 소리는 에뮬레이터 녹화에 함께 담긴 앱 TTS 출력이다.
"""
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SRC = Path(__file__).resolve().parent
ROOT = SRC.parents[2]
RAW = SRC / "raw"
BUILD = SRC / "build"
OUT_DIR = SRC.parent
FF = "/opt/homebrew/bin/ffmpeg"
FONT_B = str(ROOT / "app/src/main/res/font/galmuri11_bold.ttf")
FONT_R = str(ROOT / "app/src/main/res/font/galmuri11.ttf")
SPRITES = ROOT / "app/src/main/res/drawable-nodpi"

BG, ACCENT, LCD, LCD_INK, PAPER, MUTED = "#121417", "#FF6A1A", "#C9D86A", "#1A1F12", "#F2EFE6", "#9A968C"
CROP = "crop=1682:1210:853:90"   # 2560x1440 에뮬레이터 화면에서 앱(오른쪽 화면) 영역
FPS = 30
GAIN = "volume=18dB,alimiter=limit=0.9"  # 에뮬레이터 TTS 녹음은 -42dB 안팎이라 올린다


def rec_start(take, seg):
    t = json.loads((RAW / take / "timeline.json").read_text())
    return [e["t"] for e in t if e["what"] == "rec start"][seg - 1] / 1000


SRCS = {
    "A1": (RAW / "take1/emu-1.webm", rec_start("take1", 1)),
    "A2": (RAW / "take1/emu-2.webm", rec_start("take1", 2)),
    "B": (RAW / "take2/emu-1.webm", rec_start("take2", 1)),
}

# (번호, 제목, 보조 설명, [(원본, 시작초, 끝초)], 휴대폰 함께, 소리 시작 지연초)
# 시각은 각 녹화 파일 기준 초. raw/*/timeline.json·logcat.txt 의 epoch 와 맞춰 골랐다
SCENES = [
    ("01", "운전 중 일행 연락 단절", None, "problem", False, 0),
    ("02", "방 만들기", "시연 모드 · 가상 차량 3대(봇)가 같은 방에 입장", [("A1", 5.0, 16.5)], False, 0),
    ("03", "코드로 참여", "6자리 채널 코드 입력 → 2호차로 입장", [("B", 3.0, 13.0)], False, 0),
    ("04", "무전 버튼 송신", "누르면 TX 표시와 음량 막대 · 에뮬레이터는 마이크 입력 없음", [("A1", 23.0, 30.0)], False, 0),
    ("05", "급제동 자동 무전", "2호차 급제동 → 거리 포함 음성·카드·지도 핀", [("A1", 32.6, 40.6)], False, 0),
    ("06", "무전 수신", "휴대폰(5호차)이 보낸 무전 → 차량 스피커로 읽기", [("A1", 35.4, 44.6)], True, 5.0),
    ("07", "선두 경로 공유", "1호차 대장 콜 → 2호차 순정 내비 재탐색", [("B", 14.5, 23.5)], False, 0),
    ("08", "휴게소 투표", "\"화장실\" 무전 → 후보 3곳 · 번호 누르기", [("B", 34.0, 41.6)], False, 0),
    ("09", "경유지 등록", "투표 결과 → 순정 내비 경유지 자동 추가", [("B", 44.3, 51.6), ("B", 52.9, 56.6)], False, 0),
    ("10", "출발 점호", "기어 D → 차량별 인원·벨트 보고, 선두가 음성으로 확인", [("A1", 16.8, 23.0)], False, 0),
    ("11", "도착 보고", "휴게소 도착 보고 · 전원 도착 시 깃발 색 깜빡임", [("A2", 55.0, 65.0)], False, 0),
    ("12", "키즈 채널", "뒷좌석끼리 차량 간 대화 · 뒷좌석 스피커(오디오 존 2)", [("A1", 60.5, 69.0)], False, 0),
    ("13", "휴대폰 참여", "Pleos 미탑재 일행 · 코드와 위치 동의로 입장, 같은 투표", [("A1", 77.8, 84.2)], True, 0),
    ("14", "뻐꾸기", None, "logo", False, 0),
]

# 숏폼: (장면 번호, 원본 구간 덮어쓰기 또는 None)
SHORTS = [
    # 구간 끝의 "R" 은 앱 오른쪽 열(무전 카드·무전 버튼)만 1:1 로 크게 보인다
    ("01", None), ("02", [("A1", 7.5, 14.0)]), ("04", [("A1", 23.5, 28.5, "R")]), ("05", [("A1", 32.6, 40.6, "R")]),
    ("06", [("A1", 39.4, 44.6)]), ("08", [("B", 35.0, 41.6, "R")]), ("09", [("B", 44.3, 50.0), ("B", 53.0, 56.0, "R")]),
    ("11", [("A2", 57.0, 64.0, "R")]), ("12", [("A1", 62.5, 68.5, "R")]), ("14", None),
]


def font(path, size):
    return ImageFont.truetype(path, size)


def wrap(draw, text, f, width):
    lines, cur = [], ""
    for word in text.split(" "):
        test = (cur + " " + word).strip()
        if draw.textlength(test, font=f) <= width or not cur:
            cur = test
        else:
            lines.append(cur)
            cur = word
    return lines + [cur]


def caption_wide(num, title, sub, path):
    """가로 영상 위 띠(1920x130): LCD 번호 · 제목 · 보조 설명"""
    im = Image.new("RGBA", (1920, 130), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([40, 25, 140, 105], fill=LCD)
    d.text((90, 65), num, font=font(FONT_B, 48), fill=LCD_INK, anchor="mm")
    d.text((172, 16), title, font=font(FONT_B, 60), fill=ACCENT)
    if sub:
        d.text((174, 90), sub, font=font(FONT_R, 24), fill=PAPER)
    d.text((1880, 108), "실제 앱 화면 녹화 · Pleos Connect Emulator", font=font(FONT_R, 24), fill=MUTED, anchor="rs")
    d.rectangle([0, 128, 1920, 130], fill="#2A2E33")
    im.save(path)


def caption_tall(num, title, sub, path):
    """숏폼 위 글자 판(1080x460)"""
    im = Image.new("RGBA", (1080, 460), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([60, 110, 180, 200], fill=LCD)
    d.text((120, 155), num, font=font(FONT_B, 60), fill=LCD_INK, anchor="mm")
    d.text((210, 115), title, font=font(FONT_B, 72), fill=ACCENT)
    if sub:
        y = 240
        for line in wrap(d, sub, font(FONT_R, 36), 960):
            d.text((60, y), line, font=font(FONT_R, 36), fill=PAPER)
            y += 50
    d.text((60, 30), "뻐꾸기 · 차량용 단체 무전", font=font(FONT_B, 36), fill=LCD)
    im.save(path)


def card(kind, w, h, path):
    """문제 장면·로고 장면 배경(글자만, 마스코트는 ffmpeg 에서 스프라이트로 움직인다)"""
    im = Image.new("RGBA", (w, h), BG)
    d = ImageDraw.Draw(im)
    tall = h > w
    cx = w // 2
    if kind == "problem":
        top = 760 if tall else 420
        d.text((cx, top), "운전 중 일행 연락 단절", font=font(FONT_B, 72 if tall else 84), fill=ACCENT, anchor="mm")
        lines = ["차마다 따로 거는 전화", "운전 중 단톡방 확인 불가", "앞차 급제동의 늦은 인지"]
        y = top + (120 if tall else 120)
        for s in lines:
            d.text((cx, y), s, font=font(FONT_R, 48), fill=PAPER, anchor="mm")
            y += 72
        d.rectangle([cx - 420, y + 20, cx + 420, y + 120], fill=LCD)
        d.text((cx, y + 70), "사람 무전 + 차가 대신 하는 자동 무전", font=font(FONT_B, 36 if tall else 40), fill=LCD_INK, anchor="mm")
    else:
        top = 900 if tall else 560
        d.text((cx, top), "뻐꾸기", font=font(FONT_B, 120), fill=ACCENT, anchor="mm")
        d.text((cx, top + 110), "Pleos 차량용 단체 무전 앱", font=font(FONT_B, 48), fill=PAPER, anchor="mm")
        d.rectangle([cx - 430, top + 175, cx + 430, top + 265], fill=LCD)
        d.text((cx, top + 220), "버튼 한 번, 전 차량 동시 무전", font=font(FONT_B, 48 if not tall else 44), fill=LCD_INK, anchor="mm")
        d.text((cx, top + 330), "급제동 · 처짐 · 도착 자동 무전", font=font(FONT_R, 36), fill=PAPER, anchor="mm")
    im.save(path)


def run(args):
    subprocess.run([FF, "-v", "error", "-y", *args], check=True)


def phone_video():
    """CDP 스크린캐스트 프레임(가변 간격)을 30fps 영상으로. 반환: 첫 프레임 epoch 초"""
    d = RAW / "take1/phone"
    rows = [l.split() for l in (d / "frames.txt").read_text().split("\n") if l.strip()]
    lst = []
    for (n, t), (_, t2) in zip(rows, rows[1:] + [(rows[-1][0], str(int(rows[-1][1]) + 100))]):
        lst += [f"file '{d}/{n}.jpg'", f"duration {(int(t2) - int(t)) / 1000:.3f}"]
    (BUILD / "phone.txt").write_text("\n".join(lst) + "\n")
    out = BUILD / "phone.mp4"
    if not out.exists():
        run(["-f", "concat", "-safe", "0", "-i", BUILD / "phone.txt", "-vf", f"fps={FPS},format=yuv420p",
             "-c:v", "libx264", "-crf", "16", out])
    return int(rows[0][1]) / 1000


def sprite_input(name, size):
    """앱 마스코트 스프라이트 시트(64px 프레임 가로 이음)를 125ms 마다 넘기는 입력"""
    sheet = SPRITES / f"sprite_{name}.png"
    n = Image.open(sheet).size[0] // 64
    return ["-loop", "1", "-framerate", str(FPS), "-i", str(sheet)], \
        f"crop=64:64:'64*mod(floor(t*8)\\,{n})':0,scale={size}:{size}:flags=neighbor,format=rgba"


def build_scene(i, scene, clips, tall, out):
    num, title, sub, src, phone, audio_delay = scene
    W, H = (1080, 1920) if tall else (1920, 1080)
    cap = BUILD / f"cap_{'t' if tall else 'w'}_{num}.png"
    if src in ("problem", "logo"):
        bgp = BUILD / f"card_{src}_{'t' if tall else 'w'}.png"
        card(src, W, H, bgp)
        dur = 6.0 if src == "problem" else 5.0
        if tall:
            dur = 4.5 if src == "problem" else 4.0
        sp_args, sp_f = sprite_input("alert" if src == "problem" else "tx", 256 if not tall else 320)
        sy = {("problem", False): 90, ("logo", False): 170, ("problem", True): 360, ("logo", True): 480}[(src, tall)]
        size = 256 if not tall else 320
        run(["-loop", "1", "-framerate", str(FPS), "-i", bgp, *sp_args,
             "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
             "-filter_complex", f"[1]{sp_f}[sp];[0][sp]overlay=(W-{size})/2:{sy}:shortest=1,format=yuv420p,"
             f"fade=t=in:d=0.3,fade=t=out:st={dur - 0.3}:d=0.3[v]",
             "-map", "[v]", "-map", "2:a", "-t", f"{dur}", "-r", str(FPS),
             "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-b:a", "160k", out])
        return dur
    (caption_tall if tall else caption_wide)(num, title, sub, cap)
    parts = []
    phone_t0 = phone_video() if phone else None
    for k, (sid, a, b, *roi) in enumerate(clips):
        f, t0 = SRCS[sid]
        right = tall and roi == ["R"]
        dur = b - a
        part = BUILD / f"{'t' if tall else 'w'}_{num}_{k}.mp4"
        inputs = ["-f", "lavfi", "-i", f"color=c={BG}:s={W}x{H}:r={FPS}", "-ss", f"{a}", "-t", f"{dur}", "-i", str(f),
                  "-loop", "1", "-i", str(cap)]
        crop = CROP
        if right:
            crop, app_w, app_h, ax, ay = "crop=1030:1210:1505:90", 1040, 1222, 20, 470
        elif tall:
            app_w, app_h, ax, ay = 1040, 748, 20, 470
        elif phone:
            app_w, app_h, ax, ay = 1292, 930, 60, 140
        else:
            app_w, app_h, ax, ay = 1292, 930, (1920 - 1292) // 2, 140
        fc = f"[1:v]{crop},fps={FPS},scale={app_w}:{app_h}:flags=lanczos,setpts=PTS-STARTPTS[app];" \
             f"[0][app]overlay={ax}:{ay}[b1];[b1][2]overlay=0:0[b2]"
        last = "b2"
        if phone:
            ps = t0 + a - phone_t0
            inputs += ["-ss", f"{ps:.3f}", "-t", f"{dur}", "-i", str(BUILD / "phone.mp4")]
            if tall:
                ph_h = 660; px, py = (1080 - 305) // 2, 1236
            else:
                ph_h = 930; px, py = 1920 - 60 - 430, 140
            fc += f";[3:v]scale=-2:{ph_h}:flags=lanczos,setpts=PTS-STARTPTS[ph];[{last}][ph]overlay={px}:{py}[b3]"
            last = "b3"
        elif tall and not right:
            sp_args, sp_f = sprite_input(MOOD.get(num, "base"), 384)
            inputs += sp_args
            fc += f";[3]{sp_f}[sp];[{last}][sp]overlay=(W-384)/2:1330:shortest=1[b3]"
            last = "b3"
        fades = f"fade=t=in:d=0.2,fade=t=out:st={dur - 0.2:.3f}:d=0.2"
        ad = f"volume=enable='lt(t,{audio_delay})':volume=0," if audio_delay and k == 0 else ""
        fc += f";[{last}]format=yuv420p,{fades}[v];[1:a]asetpts=PTS-STARTPTS,aresample=48000,{ad}{GAIN}," \
              f"afade=t=in:d=0.15,afade=t=out:st={dur - 0.2:.3f}:d=0.2,apad[a]"
        run([*inputs, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-t", f"{dur}", "-r", str(FPS),
             "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", part])
        parts.append(part)
    if len(parts) == 1:
        parts[0].rename(out)
    else:
        lst = BUILD / f"{out.stem}.txt"
        lst.write_text("".join(f"file '{p}'\n" for p in parts))
        run(["-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out])
    return sum(c[2] - c[1] for c in clips)


# 숏폼 아래쪽 마스코트 표정
MOOD = {"02": "wait", "03": "wait", "04": "tx", "05": "brake", "07": "rx", "08": "vote", "09": "vote",
        "10": "rollcall", "11": "arrive", "12": "kids"}


def assemble(files, out, title):
    lst = BUILD / f"{out.stem}.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in files))
    run(["-f", "concat", "-safe", "0", "-i", lst, "-map_metadata", "-1", "-metadata", f"title={title}",
         "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", str(FPS),
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out])


def main():
    BUILD.mkdir(exist_ok=True)
    by_num = {s[0]: s for s in SCENES}
    log = []
    wide, t = [], 0.0
    for i, s in enumerate(SCENES):
        out = BUILD / f"wide_{s[0]}.mp4"
        d = build_scene(i, s, s[3] if isinstance(s[3], list) else [], False, out)
        log.append(f"wide {t:6.1f}~{t + d:6.1f}  {s[0]} {s[1]}")
        t += d
        wide.append(out)
    tall, t = [], 0.0
    for num, clips in SHORTS:
        s = by_num[num]
        out = BUILD / f"tall_{num}.mp4"
        c = clips or (s[3] if isinstance(s[3], list) else [])
        sc = (s[0], s[1], s[2], s[3] if not isinstance(s[3], list) else c, s[4], s[5] if clips is None else max(0.0, s[5] - (clips[0][1] - s[3][0][1])))
        d = build_scene(0, sc, c, True, out)
        log.append(f"tall {t:6.1f}~{t + d:6.1f}  {num} {s[1]}")
        t += d
        tall.append(out)
    assemble(wide, OUT_DIR / "뻐꾸기_시연영상.mp4", "뻐꾸기 시연 영상")
    assemble(tall, OUT_DIR / "뻐꾸기_숏폼.mp4", "뻐꾸기 숏폼")
    (BUILD / "scenes.txt").write_text("\n".join(log) + "\n")
    print("\n".join(log))


if __name__ == "__main__":
    main()
