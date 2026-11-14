#!/usr/bin/env python3
"""Remotion public/ 준비: 실제 녹화 클립 자르기, 앱 TTS 구간 찾기, 마스코트·글꼴 복사, BGM·효과음 합성.

사용: python3 scripts/prep.py            (docs/video/remotion 에서)
원본: ../src/raw (take1·take2 녹화, gitignore). 결과: public/ (gitignore), src/speech.json
"""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parents[2]
RAW = HERE.parent / "src/raw"
PUB = HERE / "public"
FF = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
CROP = "crop=1682:1210:853:90"  # 2560x1440 에뮬레이터 녹화에서 앱 화면
GAIN = "volume=18dB,alimiter=limit=0.9"  # 에뮬레이터 TTS 녹음이 -45dB 안팎
SR = 48000
CFG = json.loads((HERE / "src/scenes.json").read_text())


def run(*a):
    subprocess.run([FF, "-v", "error", "-y", *map(str, a)], check=True)


def rec_start(take, seg):
    t = json.loads((RAW / take / "timeline.json").read_text())
    return [e["t"] for e in t if e["what"] == "rec start"][seg - 1] / 1000


SRCS = {"A1": ("take1/emu-1.webm", ("take1", 1)), "A2": ("take1/emu-2.webm", ("take1", 2)),
        "B": ("take2/emu-1.webm", ("take2", 1))}


def phone_video(out):
    """휴대폰 웹 CDP 스크린캐스트(가변 간격 jpg) → 30fps. 반환: 첫 프레임 epoch 초"""
    d = RAW / "take1/phone"
    rows = [l.split() for l in (d / "frames.txt").read_text().splitlines() if l.strip()]
    lst = []
    for (n, t), (_, t2) in zip(rows, rows[1:] + [(rows[-1][0], str(int(rows[-1][1]) + 100))]):
        lst += [f"file '{d}/{n}.jpg'", f"duration {(int(t2) - int(t)) / 1000:.3f}"]
    txt = PUB / "clips/phone.txt"
    txt.write_text("\n".join(lst) + "\n")
    if not out.exists():
        run("-f", "concat", "-safe", "0", "-i", txt, "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "18", out)
    txt.unlink()
    return int(rows[0][1]) / 1000


def speech_windows(clip):
    """증폭한 클립 소리에서 말소리 구간 [시작, 끝] 목록"""
    r = subprocess.run([FF, "-v", "info", "-i", str(clip), "-vn", "-af", "silencedetect=n=-42dB:d=0.3", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(clip)],
                               capture_output=True, text=True).stdout)
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", r)]
    ends = [float(x) for x in re.findall(r"silence_end: (-?[\d.]+)", r)]
    out, cur = [], 0.0
    for i, s in enumerate(starts):
        s = max(0.0, s)
        if s - cur > 0.15:
            out.append([round(cur, 2), round(s, 2)])
        cur = ends[i] if i < len(ends) else dur
    if dur - cur > 0.15:
        out.append([round(cur, 2), round(dur, 2)])
    return out


def clips():
    (PUB / "clips").mkdir(parents=True, exist_ok=True)
    speech = {}
    phone_all = PUB / "clips/phone_all.mp4"
    for cid, c in CFG["clips"].items():
        f, (take, seg) = SRCS[c["src"]]
        out = PUB / f"clips/{cid}.mp4"
        if not out.exists():
            parts = []
            for k, (a, b) in enumerate(c["segs"]):
                p = PUB / f"clips/{cid}_{k}.mp4"
                run("-ss", a, "-t", b - a, "-i", RAW / f, "-vf", f"{CROP},fps=30,format=yuv420p",
                    "-af", f"aresample={SR},{GAIN}", "-c:v", "libx264", "-crf", "16", "-preset", "medium",
                    "-c:a", "aac", "-b:a", "192k", "-ar", SR, p)
                parts.append(p)
            if len(parts) == 1:
                parts[0].rename(out)
            else:
                lst = PUB / f"clips/{cid}.txt"
                lst.write_text("".join(f"file '{p}'\n" for p in parts))
                run("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out)
                lst.unlink()
                for p in parts:
                    p.unlink()
        speech[cid] = speech_windows(out)
        if c.get("phone"):
            t0 = phone_video(phone_all)
            a, b = c["segs"][0]
            ps = rec_start(take, seg) + a - t0
            pout = PUB / f"clips/{cid}_phone.mp4"
            if not pout.exists():
                run("-ss", f"{ps:.3f}", "-t", b - a, "-i", phone_all, "-c:v", "libx264", "-crf", "16", "-an", pout)
    phone_all.unlink(missing_ok=True)
    (HERE / "src/speech.json").write_text(json.dumps(speech, indent=1) + "\n")
    print("speech", json.dumps(speech))


def assets():
    """마스코트 벡터(design/character), 글꼴(remotion/fonts), 관제 보고서 화면"""
    for d in ("character", "fonts", "shots"):
        (PUB / d).mkdir(parents=True, exist_ok=True)
    for p in (ROOT / "design/character").glob("cuckoo_*.svg"):
        shutil.copy(p, PUB / "character" / p.name)
    for p in (HERE / "fonts").iterdir():
        if p.suffix in (".ttf", ".otf"):
            shutil.copy(p, PUB / "fonts" / p.name)
    shutil.copy(ROOT / "design/screens/control-report.png", PUB / "shots/report.png")


# ---------------- 소리 합성 (모두 코드로 생성, 외부 음원 없음) ----------------
RNG = np.random.default_rng(7)


def t_(d):
    return np.arange(int(d * SR)) / SR


def env(n, a=0.005, r=0.05, sustain=1.0):
    e = np.ones(n) * sustain
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        e[:na] = np.linspace(0, sustain, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def sine(f, d, ph=0.0):
    return np.sin(2 * np.pi * f * t_(d) + ph)


def decay(n, k):
    return np.exp(-np.arange(n) / SR * k)


def lowpass(x, fc):
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(2, fc, btype="low", fs=SR, output="sos"), x)


def bandpass(x, lo, hi):
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(2, [lo, hi], btype="band", fs=SR, output="sos"), x)


def write(path, x, stereo=None):
    from scipy.io import wavfile
    x = np.asarray(stereo if stereo is not None else x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    peak = np.max(np.abs(x)) or 1
    if peak > 0.98:
        x = x / peak * 0.98
    wavfile.write(path, SR, (x * 32767).astype(np.int16))


def sfx():
    """무전기 느낌은 살리되 깨끗한 소리: 사인파 위주, 잡음은 짧고 대역을 좁게"""
    d = PUB / "audio"
    d.mkdir(parents=True, exist_ok=True)

    def tone(f, dur, a=0.004, r=0.03, h2=0.15):
        x = sine(f, dur) + h2 * sine(2 * f, dur)
        return x * env(len(x), a, r)

    def squelch(dur, g):
        n = int(dur * SR)
        return lowpass(bandpass(RNG.uniform(-1, 1, n), 1200, 2800), 5000) * env(n, 0.003, dur * 0.8) * decay(n, 18) * g

    # 무전 버튼: 부드러운 딸깍(낮은 톡 + 짧은 고음) + 아주 짧은 스켈치
    n = int(0.03 * SR)
    click = (sine(180, 0.03) * 0.6 + sine(2400, 0.03) * 0.25) * decay(n, 160)
    write(d / "ptt.wav", np.concatenate([click * 0.7, squelch(0.14, 0.38)]))
    # 로저 비프: 두 음 사인
    write(d / "roger.wav", np.concatenate([tone(1175, 0.07) * 0.32, np.zeros(int(0.015 * SR)), tone(1568, 0.11, r=0.06) * 0.32, squelch(0.06, 0.12)]))
    # 휙: 대역이 올라가는 부드러운 바람
    n = int(0.45 * SR)
    noise = RNG.uniform(-1, 1, n)
    out = np.zeros(n)
    for i, (lo, hi) in enumerate([(200, 600), (350, 1000), (600, 1800), (1000, 3000), (1600, 4500)]):
        seg = slice(i * n // 5, (i + 1) * n // 5 + 2000)
        out[seg] += bandpass(noise, lo, hi)[seg][: len(out[seg])]
    write(d / "whoosh.wav", lowpass(out * np.sin(np.linspace(0, np.pi, n)) ** 2, 4000) * 0.5)
    # 톡(자막 등장): 음높이가 살짝 내려가는 물방울 소리
    dur = 0.09
    tt = t_(dur)
    ph = 2 * np.pi * np.cumsum(1400 - 500 * (1 - np.exp(-tt * 40))) / SR
    write(d / "blip.wav", np.sin(ph) * decay(len(tt), 45) * env(len(tt), 0.002, 0.02) * 0.3)
    # 급제동 경보: 두 음 번갈아 3회(사인 + 약한 3배음)
    beeps = []
    for _ in range(3):
        for f in (1046, 1397):
            x = sine(f, 0.1) + 0.18 * sine(3 * f, 0.1)
            beeps.append(x * env(len(x), 0.006, 0.03) * 0.38)
        beeps.append(np.zeros(int(0.05 * SR)))
    write(d / "alert.wav", np.concatenate(beeps))

    # 뻐꾹: 내려가는 두 음(장3도), 부드러운 플루트 같은 음색
    def coo(f, dur):
        t = t_(dur)
        bend = 1 + 0.015 * np.exp(-t * 30)
        ph = 2 * np.pi * np.cumsum(f * bend) / SR
        x = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
        return x * env(len(t), 0.025, 0.12)
    cu = np.concatenate([coo(784, 0.24), np.zeros(int(0.07 * SR)), coo(622, 0.36)])
    write(d / "cuckoo.wav", cu * 0.5)


NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name):
    n, o = name[:-1], int(name[-1])
    return 440 * 2 ** ((NOTE[n] + 12 * (o + 1) - 69) / 12)


def bgm(total, path):
    """96 BPM 따뜻한 로파이 팝: 전자 피아노 화음, 부드러운 베이스, 가벼운 드럼, 종소리 선율.
    인트로 2마디(피아노만) → 본곡 반복 → 끝 화음. 길이는 영상 길이에 맞춘다."""
    bpm = 96
    beat = 60 / bpm
    bar = 4 * beat
    swing = beat * 0.06  # 8분음표 뒤 박을 살짝 늦춘다
    nbar = int(np.ceil(total / bar))
    N = int(total * SR) + 4 * SR
    L, R = np.zeros(N), np.zeros(N)

    def put(x, t, pan=0.0, g=1.0):
        i = int(t * SR)
        x = x[: max(0, N - i)]
        L[i:i + len(x)] += x * g * (1 - max(0, pan))
        R[i:i + len(x)] += x * g * (1 + min(0, pan))

    def ep(f, dur, vel=1.0):
        """전자 피아노: 감쇠하는 FM 종소리 + 사인 몸통"""
        t = t_(dur)
        idx = 1.6 * np.exp(-t * 6) * vel
        x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t)) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 4)
        return x * np.exp(-t * 1.6) * env(len(t), 0.004, 0.25)

    def bell(f, dur):
        t = t_(dur)
        x = np.sin(2 * np.pi * f * t + 0.8 * np.exp(-t * 9) * np.sin(2 * np.pi * 3.5 * f * t))
        return x * np.exp(-t * 3.2) * env(len(t), 0.002, 0.1)

    def bass(f, dur):
        t = t_(dur)
        x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
        return x * env(len(t), 0.01, 0.08) * (0.75 + 0.25 * np.exp(-t * 5))

    # Cmaj7 → Am7 → Dm7 → G7sus 순환
    prog = [(["E3", "G3", "B3", "D4"], "C2"), (["E3", "G3", "C4", "E4"], "A1"),
            (["F3", "A3", "C4", "E4"], "D2"), (["F3", "A3", "C4", "D4"], "G1")]
    # 종소리 선율(8분음표 칸, '.' 쉼): 4마디마다 바뀌는 두 줄
    melA = ["E5 . G5 . . D5 . .", "C5 . E5 . G5 . . .", "A5 . G5 . F5 . E5 .", "D5 . . . . . . ."]
    melB = ["G5 . . E5 . . C5 .", "E5 . D5 . C5 . A4 .", "C5 . D5 . F5 . A5 .", "G5 . . . D5 . . ."]
    ending = nbar - 1
    for b in range(nbar):
        t0 = b * bar
        chord, root = prog[b % 4]
        if b == ending:
            chord, root = ["E3", "G3", "B3", "D4", "G4"], "C2"
        # 피아노: 1박 길게, 2박 반 뒤 짧게 다시
        for k, n in enumerate(chord):
            pan = -0.3 + 0.6 * k / max(1, len(chord) - 1)
            put(ep(hz(n), bar * (2.2 if b == ending else 1.1)), t0 + k * 0.012, pan, 0.075)
            if b != ending:
                put(ep(hz(n), beat * 1.2, 0.6), t0 + 2.5 * beat + swing + k * 0.01, pan, 0.045)
        if b < 2:
            continue
        # 베이스
        f = hz(root)
        if b == ending:
            put(bass(f, bar * 1.5), t0, 0, 0.32)
            continue
        for at, ln, ff in [(0, 1.5, f), (1.5 * beat + swing, 0.5, f), (2 * beat, 1.0, f * 1.5), (3 * beat, 0.9, f * 2)]:
            put(bass(ff, ln * beat), t0 + at, 0, 0.3)
        # 드럼: 부드러운 킥, 둥근 스네어, 셰이커
        for k in range(8):
            tt = t0 + k * beat / 2 + (swing if k % 2 else 0)
            if k in (0, 5):
                d = 0.25
                t = t_(d)
                kick = np.sin(2 * np.pi * np.cumsum(48 + 70 * np.exp(-t * 30)) / SR) * np.exp(-t * 14)
                put(kick, tt, 0, 0.5)
            if k in (2, 6):
                n = int(0.18 * SR)
                sn = lowpass(bandpass(RNG.uniform(-1, 1, n), 900, 5000), 4500) * decay(n, 22) + 0.4 * sine(190, 0.18) * decay(n, 30)
                put(sn, tt, 0.05, 0.14)
            n = int(0.05 * SR)
            sh = bandpass(RNG.uniform(-1, 1, n), 5000, 10000) * env(n, 0.012, 0.03)
            put(sh, tt, 0.3, 0.04 if k % 2 else 0.06)
        # 선율: 6마디째부터
        if b >= 6:
            line = (melA if (b // 4) % 2 == 0 else melB)[b % 4]
            for i, tok in enumerate(line.split()):
                if tok != ".":
                    put(bell(hz(tok), beat * 1.6), t0 + i * beat / 2 + (swing if i % 2 else 0), 0.2, 0.06)
    # 마스터: 고역을 살짝 깎아 따뜻하게, 아주 옅은 지연 반향
    st = np.stack([lowpass(L, 9000), lowpass(R, 9000)], 1)
    dl = int(0.19 * SR)
    st[dl:, 0] += st[:-dl, 1] * 0.18
    st[dl:, 1] += st[:-dl, 0] * 0.18
    n = int(total * SR)
    st = st[:n]
    fade = int(1.2 * SR)
    st[-fade:] *= np.linspace(1, 0, fade)[:, None]
    write(path, None, st / (np.max(np.abs(st)) or 1) * 0.8)


def main():
    PUB.mkdir(exist_ok=True)
    assets()
    if "--audio-only" not in sys.argv:
        clips()
    sfx()
    T = CFG["transition"]
    for name in ("wide", "short"):
        sc = CFG[name]
        total = sum(d for _, d in sc) - T * (len(sc) - 1)
        bgm(total, PUB / f"audio/bgm_{name}.wav")
        print(name, "total", round(total, 2))


if __name__ == "__main__":
    main()
