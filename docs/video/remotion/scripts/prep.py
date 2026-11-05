#!/usr/bin/env python3
"""Remotion public/ 준비: 실제 녹화 클립 자르기, 앱 TTS 구간 찾기, 스프라이트·글꼴 복사, BGM·효과음 합성.

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
    (PUB / "sprites").mkdir(parents=True, exist_ok=True)
    (PUB / "fonts").mkdir(parents=True, exist_ok=True)
    for p in (ROOT / "app/src/main/res/drawable-nodpi").glob("sprite_*.png"):
        shutil.copy(p, PUB / "sprites" / p.name)
    for n in ("galmuri11.ttf", "galmuri11_bold.ttf"):
        shutil.copy(ROOT / "app/src/main/res/font" / n, PUB / "fonts" / n)
    (PUB / "shots").mkdir(exist_ok=True)
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


def pulse(f, d, duty=0.5):
    ph = (t_(d) * f) % 1.0
    return np.where(ph < duty, 1.0, -1.0)


def tri(f, d):
    ph = (t_(d) * f) % 1.0
    return 4 * np.abs(ph - 0.5) - 1


def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    from scipy.signal import lfilter
    return lfilter([1 - a], [1, -a], x)


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
    d = PUB / "audio"
    d.mkdir(parents=True, exist_ok=True)
    # 무전 버튼 딸깍 + 스켈치
    click = np.zeros(int(0.02 * SR))
    click[:200] = RNG.uniform(-1, 1, 200) * np.linspace(1, 0, 200)
    sq = bandpass(RNG.uniform(-1, 1, int(0.16 * SR)), 900, 3200) * env(int(0.16 * SR), 0.004, 0.12) * 0.9
    write(d / "ptt.wav", np.concatenate([click * 0.35, sq * 0.6]))
    # 로저 비프: 스켈치 꼬리 + 짧은 두 음
    tail = bandpass(RNG.uniform(-1, 1, int(0.08 * SR)), 900, 3200) * env(int(0.08 * SR), 0.003, 0.06) * 0.5
    b1 = pulse(1200, 0.07, 0.5) * env(int(0.07 * SR), 0.002, 0.01) * 0.35
    b2 = pulse(1600, 0.09, 0.5) * env(int(0.09 * SR), 0.002, 0.03) * 0.35
    write(d / "roger.wav", lowpass(np.concatenate([b1, b2, tail]), 6000))
    # 휙: 대역이 올라가는 잡음
    n = int(0.45 * SR)
    noise = RNG.uniform(-1, 1, n)
    out = np.zeros(n)
    for i, (lo, hi) in enumerate([(200, 600), (400, 1200), (800, 2400), (1500, 4500), (2500, 7000)]):
        seg = slice(i * n // 5, (i + 1) * n // 5 + 2000)
        out[seg] += bandpass(noise, lo, hi)[seg][: len(out[seg])]
    w = np.sin(np.linspace(0, np.pi, n)) ** 2
    write(d / "whoosh.wav", out * w * 0.7)
    # 픽셀 블립(자막 등장)
    blip = np.concatenate([pulse(988, 0.035, 0.25), pulse(1480, 0.05, 0.25)])
    write(d / "blip.wav", lowpass(blip * env(len(blip), 0.001, 0.02) * 0.28, 7000))
    # 급제동 경보음: 두 음 번갈아 3회
    beeps = []
    for k in range(3):
        for f in (1046, 1568):
            beeps.append(pulse(f, 0.09, 0.5) * env(int(0.09 * SR), 0.002, 0.01) * 0.4)
        beeps.append(np.zeros(int(0.04 * SR)))
    write(d / "alert.wav", lowpass(np.concatenate(beeps), 5000))
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
    """118 BPM 8비트 곡: 인트로 4마디 → A/B 반복 → 아웃트로 2마디. 길이는 영상 길이에 맞춘다."""
    bpm = 118
    beat = 60 / bpm
    bar = 4 * beat
    nbar = int(np.ceil(total / bar))
    N = int(total * SR) + SR
    L, R = np.zeros(N), np.zeros(N)

    def put(x, t, pan=0.0, g=1.0):
        i = int(t * SR)
        x = x[: max(0, N - i)]
        L[i:i + len(x)] += x * g * (1 - max(0, pan))
        R[i:i + len(x)] += x * g * (1 + min(0, pan))

    chords = [("C", ["C4", "E4", "G4"], "C2"), ("G", ["B3", "D4", "G4"], "G2"),
              ("Am", ["C4", "E4", "A4"], "A2"), ("F", ["C4", "F4", "A4"], "F2")]
    # A 선율(8마디, 8분음표 단위, '-' 이음, '.' 쉼)
    melA = ["E5 . G5 - C6 - B5 G5", "D5 - G5 - B5 - A5 G5", "A5 . C6 - E6 - D6 C6", "A5 - G5 - F5 - E5 F5",
            "E5 . G5 - C6 - D6 E6", "D6 - B5 - G5 - A5 B5", "C6 - A5 - E5 - G5 A5", "F5 - A5 - C6 . . ."]
    melB = ["G5 G5 . E5 G5 . C6 .", "B5 B5 . G5 D5 . G5 .", "A5 A5 . E5 C6 . A5 .", "F5 . A5 . C6 . A5 .",
            "G5 G5 . E5 G5 . C6 E6", "D6 . B5 . G5 . D6 .", "C6 . E6 . A5 . C6 .", "A5 G5 F5 E5 F5 . . ."]

    def lead(line, t0, g=0.11):
        toks = line.split()
        i = 0
        while i < len(toks):
            tok = toks[i]
            n = 1
            while i + n < len(toks) and toks[i + n] == "-":
                n += 1
            if tok not in (".", "-"):
                d = n * beat / 2
                x = pulse(hz(tok), d * 0.92, 0.25)
                x = x * env(len(x), 0.004, 0.04, 1.0) * (1 + 0.003 * np.sin(2 * np.pi * 5.5 * t_(d * 0.92)))
                put(lowpass(x, 5200), t0 + i * beat / 2, 0.15, g)
            i += n

    for b in range(nbar):
        t0 = b * bar
        outro = b >= nbar - 2
        intro = b < 4
        name, triad, root = chords[b % 4]
        if outro:
            name, triad, root = chords[0]
        # 베이스(삼각파): 8분음표 근음-옥타브
        for k in range(8):
            f = hz(root) * (2 if k % 2 else 1)
            if outro and k >= 4:
                break
            x = tri(f, beat / 2 * 0.9) * env(int(beat / 2 * 0.9 * SR), 0.003, 0.03)
            put(x, t0 + k * beat / 2, 0, 0.32)
        # 아르페지오(16분음표, 펄스 12.5%)
        if not outro:
            for k in range(16):
                f = hz(triad[k % 3]) * (2 if (k // 3) % 2 else 1)
                x = pulse(f, beat / 4 * 0.8, 0.125) * env(int(beat / 4 * 0.8 * SR), 0.002, 0.02)
                put(lowpass(x, 4000), t0 + k * beat / 4, -0.35, 0.045 if intro else 0.055)
        # 드럼
        for k in range(8):
            tt = t0 + k * beat / 2
            if outro and k > 0:
                break
            if k in (0, 4) or (k == 7 and b % 2):
                d = 0.16
                t = t_(d)
                kick = np.sin(2 * np.pi * np.cumsum(55 + 110 * np.exp(-t * 35)) / SR) * env(len(t), 0.001, 0.12)
                put(kick, tt, 0, 0.5 if not intro or k == 0 else 0.35)
            if k in (2, 6) and not (intro and b < 2):
                n = int(0.12 * SR)
                sn = bandpass(RNG.uniform(-1, 1, n), 1200, 6000) * env(n, 0.001, 0.11)
                put(sn, tt, 0, 0.22)
            n = int(0.03 * SR)
            hat = bandpass(RNG.uniform(-1, 1, n), 7000, 14000) * env(n, 0.001, 0.025)
            put(hat, tt, 0.25, 0.07 if k % 2 else 0.1)
        # 선율: 인트로 뒤부터, A(8마디)/B(8마디) 번갈아
        if not intro and not outro:
            k = (b - 4) % 16
            lead((melA if k < 8 else melB)[k % 8], t0)
        if outro and b == nbar - 2:
            for i, n in enumerate(["C6", "G5", "E5", "C5"]):
                x = pulse(hz(n), 0.3 if i < 3 else 1.6, 0.25)
                x = x * env(len(x), 0.004, 0.25)
                put(lowpass(x, 5000), t0 + i * beat / 2, 0.15, 0.12)
            ch = sum(pulse(hz(n), bar * 1.6, 0.125) for n in ["C4", "E4", "G4", "C5"]) / 4
            put(lowpass(ch * env(len(ch), 0.01, bar * 1.2), 3000), t0 + 2 * beat, -0.2, 0.18)
            d = 1.2
            t = t_(d)
            cym = bandpass(RNG.uniform(-1, 1, len(t)), 5000, 15000) * np.exp(-t * 3)
            put(cym, t0 + 2 * beat, 0, 0.12)
    n = int(total * SR)
    st = np.stack([L[:n], R[:n]], 1)
    fade = int(0.6 * SR)
    st[-fade:] *= np.linspace(1, 0, fade)[:, None]
    write(path, None, st)


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
