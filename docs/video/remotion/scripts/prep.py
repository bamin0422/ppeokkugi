#!/usr/bin/env python3
"""Remotion public/ 준비: 실제 녹화 클립 자르기·앱 음성 정규화, 앱 TTS 구간 찾기, 마스코트·글꼴 복사, 효과음 합성,
나레이션 길이에 맞춘 장면 시간표(src/timeline.json) 계산.

사용: python3 scripts/prep.py            (docs/video/remotion 에서)
원본: ../src/raw (take8·take9 녹화, gitignore), public/audio/vo/*.mp3(나레이션), public/audio/bgm_flow_v6.wav(BGM)
결과: public/ (gitignore), src/speech.json, src/timeline.json
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
PEAK = -7.0  # 앱 음성 정규화 목표 피크(dBFS). 에뮬레이터 TTS 녹음은 피크 -28dB 안팎이라 구간마다 따로 맞춘다
SR = 48000
CFG = json.loads((HERE / "src/scenes.json").read_text())


def run(*a):
    subprocess.run([FF, "-v", "error", "-y", *map(str, a)], check=True)


def rec_start(take, seg):
    t = json.loads((RAW / take / "timeline.json").read_text())
    return [e["t"] for e in t if e["what"] == "rec start"][seg - 1] / 1000


SRCS = {"A1": ("take8/emu-1.webm", ("take8", 1)), "A2": ("take8/emu-2.webm", ("take8", 2)),
        "B": ("take9/emu-1.webm", ("take9", 1))}


def aligned_audio(f):
    """녹화 소리를 영상 시각에 맞춘 wav. webm 오디오는 무음 구간이 통째로 빠져 있어 그대로 자르면 말이 당겨지고 끊긴다"""
    out = PUB / f"clips/_aud_{f.replace('/', '_')}.wav"
    if not out.exists():
        run("-i", RAW / f, "-vn", "-af", f"aresample={SR}:async=1:first_pts=0", "-ac", "1", out)
    return out


def phone_video(out):
    """휴대폰 웹 CDP 스크린캐스트(가변 간격 jpg) → 30fps. 반환: 첫 프레임 epoch 초"""
    d = RAW / "take8/phone"
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


def gain_for(src, a, b):
    """구간 피크가 PEAK 가 되도록 올릴 dB(증폭 고정값 대신 정규화). 리미터는 안전장치로만 둔다"""
    r = subprocess.run([FF, "-hide_banner", "-ss", str(a), "-t", str(b - a), "-i", str(src), "-vn", "-af", "highpass=f=80,volumedetect", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    peak = float(re.findall(r"max_volume: (-?[\d.]+) dB", r)[-1])
    return f"highpass=f=80,volume={PEAK - peak:.1f}dB,alimiter=limit={10 ** ((PEAK + 0.5) / 20):.3f}:level=false"


def speech_windows(clip):
    """정규화한 클립 소리에서 말소리 구간 [시작, 끝] 목록 (피크보다 32dB 낮으면 조용함)"""
    r = subprocess.run([FF, "-v", "info", "-i", str(clip), "-vn", "-af", f"silencedetect=n={PEAK - 32:.0f}dB:d=0.3", "-f", "null", "-"],
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
            # 소리는 영상 조각과 따로 이어 붙인다(aseg). 에뮬레이터 TTS 는 카드가 뜬 뒤 몇 초 늦게 나와서
            # 화면 구간과 말 구간을 따로 고르고, 말 한마디가 이음매에 걸리지 않게 한다
            wav = aligned_audio(f)
            segs, asegs = c["segs"], c.get("aseg", c["segs"])
            total = sum(b - a for a, b in segs)
            aud = PUB / f"clips/_a_{cid}.wav"
            run("-i", wav, "-filter_complex",
                "".join(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS[a{k}];" for k, (a, b) in enumerate(asegs))
                + "".join(f"[a{k}]" for k in range(len(asegs))) + f"concat=n={len(asegs)}:v=0:a=1[a]", "-map", "[a]", aud)
            ins = [x for a, b in segs for x in ("-ss", a, "-t", b - a, "-i", RAW / f)]
            n = len(segs)
            vf = ("".join(f"[{k}:v]{CROP},fps=30,format=yuv420p,setpts=PTS-STARTPTS[v{k}];" for k in range(n))
                  + "".join(f"[v{k}]" for k in range(n)) + f"concat=n={n}:v=1:a=0[v]")
            run(*ins, "-i", aud, "-filter_complex", vf, "-map", "[v]", "-map", f"{n}:a", "-af", gain_for(aud, 0, total), "-t", total,
                "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-ar", SR, out)
            aud.unlink()
        speech[cid] = speech_windows(out)
        if c.get("phone"):
            t0 = phone_video(phone_all)
            a, b = c["segs"][0]
            ps = rec_start(take, seg) + a - t0
            pout = PUB / f"clips/{cid}_phone.mp4"
            if not pout.exists():
                run("-ss", f"{ps:.3f}", "-t", b - a, "-i", phone_all, "-c:v", "libx264", "-crf", "16", "-an", pout)
    phone_all.unlink(missing_ok=True)
    for w in (PUB / "clips").glob("_aud_*.wav"):
        w.unlink()
    (HERE / "src/speech.json").write_text(json.dumps(speech, indent=1) + "\n")
    print("speech", json.dumps(speech))


def assets():
    """마스코트 투명 PNG(design/character/cuckoo_*.png), 글꼴(remotion/fonts), 관제 보고서 화면"""
    for d in ("character", "fonts", "shots"):
        (PUB / d).mkdir(parents=True, exist_ok=True)
    for p in (PUB / "character").glob("cuckoo_*"):
        p.unlink()
    for p in (ROOT / "design/character").glob("cuckoo_*.png"):
        shutil.copy(p, PUB / "character" / p.name)
    for p in (HERE / "fonts").iterdir():
        if p.suffix in (".ttf", ".otf"):
            shutil.copy(p, PUB / "fonts" / p.name)
    shutil.copy(ROOT / "design/screens/control-report.png", PUB / "shots/report.png")


# ---------------- 효과음 합성 (코드로 생성) ----------------
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


def probe_len(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                                capture_output=True, text=True).stdout)


def timeline():
    """장면 시간표(프레임). 장면 길이 = max(기본 길이, 나레이션 + pad).
    다음 장면에 나레이션이 없으면 이번 나레이션이 다음 장면으로 넘어가도 된다(급제동 실사 → 급제동 시연).
    시연 장면은 앱 음성이 나레이션과 겹치지 않도록 클립 첫 프레임을 멈춰 두는 시간(hold)을 둔다."""
    fps, T = CFG["fps"], round(CFG["transition"] * CFG["fps"])
    delay, pad, gap = (round(CFG[k] * fps) for k in ("voDelay", "voPad", "voGap"))
    speech = json.loads((HERE / "src/speech.json").read_text())
    vo = {p.stem: probe_len(p) for p in sorted((PUB / "audio/vo").glob("n*.mp3"))}
    out = {"vo": vo}
    for kind in ("wide", "short"):
        rows, duck, frm, vo_end = [], [], 0, -10 ** 9
        lst = CFG[kind]
        for i, (sid, base, *rest) in enumerate(lst):
            v = rest[0] if rest else None
            nxt_vo = i + 1 < len(lst) and len(lst[i + 1]) > 2
            dur, hold, vlen = round(base * fps), 0, round(vo[v] * fps) if v else 0
            if v:
                at = frm + delay
                duck.append([at, at + vlen])
                vo_end = at + vlen
                if nxt_vo or i + 1 == len(lst):
                    dur = max(dur, delay + vlen + pad)
            wins = []
            if sid.startswith("f:"):
                c = CFG["clips"][sid[2:]]
                vstart = round(max(0, c.get("lead", 0) - 0.35) * fps)
                lo, hi = c.get("mute", 0), c.get("muteAfter", 99)
                wins = [[max(a, lo), min(b, hi)] for a, b in speech[sid[2:]] if b > lo and a < hi]
                if wins:
                    hold = max(0, vo_end + gap - (frm + vstart + round(wins[0][0] * fps)))
                dur = max(dur, round(base * fps) + hold)
                wins = [[frm + vstart + hold + round(a * fps), frm + vstart + hold + round(b * fps)] for a, b in wins]
                duck += wins
                if wins:  # 앱 음성이 다음 장면 나레이션 전에 끝나게
                    dur = max(dur, wins[-1][1] - frm + T - delay + gap)
            rows.append({"id": sid, "from": frm, "dur": dur, "vo": v, "hold": hold, "speech": wins})
            frm += dur - (T if i < len(lst) - 1 else 0)
        # 나레이션과 앱 음성이 겹치면 실패
        vos = [[r["from"] + delay, r["from"] + delay + round(vo[r["vo"]] * fps)] for r in rows if r["vo"]]
        for a, b in (w for r in rows for w in r["speech"]):
            for c, d in vos:
                assert b <= c or a >= d, f"{kind}: 앱 음성 {a}-{b} 이 나레이션 {c}-{d} 와 겹침"
        out[kind] = {"total": frm, "scenes": rows, "duck": sorted(duck)}
        print(kind, "total", round(frm / fps, 2), "s")
        for r in rows:
            print(f"  {r['id']:12s} {r['dur'] / fps:5.2f}s vo={r['vo']} hold={r['hold'] / fps:.2f}")
    (HERE / "src/timeline.json").write_text(json.dumps(out, indent=1) + "\n")


def main():
    PUB.mkdir(exist_ok=True)
    assets()
    if "--audio-only" not in sys.argv:
        clips()
    sfx()
    timeline()


if __name__ == "__main__":
    main()
