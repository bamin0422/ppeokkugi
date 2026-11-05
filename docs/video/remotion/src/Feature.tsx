import React from 'react';
import {AbsoluteFill, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import speech from './speech.json';
import {Backdrop, BeforeAfter, Brand, C, Chip, FONT, FONT_B, Pop, Sfx, Sprite, useT, useTall} from './theme';

type Rect = [number, number, number, number]; // x, y, w, h (앱 화면 1682x1210 좌표)
const APP_W = 1682;
const APP_H = 1210;
const FULL: Rect = [0, 0, APP_W, APP_H];

const CARDS: Rect = [640, 120, 1035, 600];
const CARD1: Rect = [665, 160, 990, 165];
const CARD2: Rect = [665, 360, 990, 150];
const PTT: Rect = [665, 1030, 990, 140];

export type FeatureDef = {
  tag: string;
  /** 예전 방식 → 뻐꾸기 (장면 첫머리에 크게) */
  before: string;
  after: string;
  /** 첫머리 전·후 자막을 크게 보여 주는 시간(초). 0이면 바로 화면 */
  lead: number;
  title: string;
  sub: string;
  note?: string;
  mood: string;
  /** 카메라 [초, 사각형]: 처음엔 전체, 이후 이 순서로 다가간다 (클립 기준 초) */
  cam: [number, Rect][];
  camTall: [number, Rect][];
  /** 강조 테두리 [초, 사각형 | null] */
  ring: [number, Rect | null][];
  /** 무전 이벤트(딸깍+스켈치) 시각 */
  radio: number[];
  alert?: number;
  /** 이 시각 전까지 클립 소리 끔(다른 장면 소리 겹침 방지) */
  muteUntil?: number;
};

const LEAD = 1.7;
const TALL0: Rect = [640, 60, 1042, 800];

export const FEATURES: Record<string, FeatureDef> = {
  tx: {
    tag: '사람 무전',
    before: '전화 3통',
    after: '버튼 1번',
    lead: LEAD,
    title: '버튼 한 번, 전 차량 동시 무전',
    sub: '누르고 말하면 일행 모든 차에 동시 전달',
    note: '에뮬레이터는 마이크 입력 없음 · 송신 표시만',
    mood: 'tx',
    cam: [[0.3, [600, 640, 1082, 570]]],
    camTall: [[0.0, TALL0], [0.5, [650, 700, 1020, 500]]],
    ring: [[1.0, PTT]],
    radio: [0.97],
  },
  rx: {
    tag: '무전 수신',
    before: '단톡 확인 불가',
    after: '스피커 음성 전달',
    lead: LEAD,
    title: '화면 대신 스피커로 듣는 무전',
    sub: '보낸 차·자리 표시, 차량 스피커 음성 재생',
    note: '왼쪽: Pleos 미탑재 일행의 휴대폰 웹',
    mood: 'rx',
    cam: [[0.2, CARDS]],
    camTall: [[0.0, TALL0], [0.4, [650, 120, 1020, 640]]],
    ring: [[0.5, CARD1]],
    radio: [0.5],
    muteUntil: 4.8,
  },
  brake: {
    tag: '자동 무전',
    before: '앞차 급제동 늦은 인지',
    after: '자동 무전',
    lead: LEAD,
    title: '급제동 자동 무전',
    sub: '앞차 급제동, 거리 포함 음성·카드·지도 핀 전달',
    mood: 'brake',
    cam: [[0.2, [0, 100, APP_W, 650]], [2.3, CARDS]],
    camTall: [[0.0, TALL0], [0.4, [650, 120, 1020, 640]]],
    ring: [[0.5, CARD1], [3.5, CARD2]],
    radio: [0.5],
    alert: 0.55,
  },
  vote: {
    tag: '쉬어 가',
    before: '휴게소 제각각 결정',
    after: '투표 후 전 차량 경유지',
    lead: LEAD,
    title: '휴게소 투표',
    sub: '후보 3곳 · 번호 누르기나 "1번" 음성 투표',
    mood: 'vote',
    cam: [[0.2, [600, 100, 1082, 560]]],
    camTall: [[0.0, TALL0], [0.4, [650, 110, 1020, 560]]],
    ring: [[0.3, [675, 250, 975, 240]], [4.9, [675, 250, 330, 240]]],
    radio: [1.2],
  },
  waypoint: {
    tag: '내비 연동',
    before: '휴게소 제각각 결정',
    after: '투표 후 전 차량 경유지',
    lead: 0,
    title: '순정 내비 경유지 등록',
    sub: '투표 결과 휴게소, 전 차량 내비에 자동 반영',
    note: '앱 → 차량 순정 내비 (NaviHelper)',
    mood: 'arrive',
    cam: [[0.3, [0, 60, 1300, 900]], [6.0, FULL]],
    camTall: [[0.0, [0, 60, 1000, 760]], [3.8, [560, 0, 1122, 1210]]],
    ring: [[2.4, [20, 115, 590, 230]], [4.0, [860, 60, 560, 1120]], [5.9, null]],
    radio: [0.0],
  },
  arrive: {
    tag: '자동 무전',
    before: '"어디야?" 반복 확인',
    after: '위치·도착 자동 보고',
    lead: LEAD,
    title: '도착 자동 보고',
    sub: '차량 간 거리 표시, 휴게소 도착 보고, 전원 도착 시 깃발 색 깜빡임',
    mood: 'arrive',
    cam: [[0.1, [0, 600, 900, 450]], [1.7, CARDS]],
    camTall: [[0.0, [0, 500, 1000, 760]], [1.7, [650, 120, 1020, 640]]],
    ring: [[0.2, [10, 780, 630, 250]], [2.1, CARD2]],
    radio: [2.0],
  },
};

/** 클립이 장면 안에서 시작하는 초: 전·후 자막이 사라지기 시작할 때 */
export const featureLead = (id: string) => Math.max(0, (FEATURES[id]?.lead ?? 0) - 0.35);

/** 카메라 사각형 → 확대·이동. contain 으로 맞추고 앱 밖 빈 곳이 보이지 않게 고정 */
const camTransform = (r: Rect, vw: number, vh: number) => {
  const s = Math.min(vw / r[2], vh / r[3]);
  const cx = r[0] + r[2] / 2;
  const cy = r[1] + r[3] / 2;
  let tx = vw / 2 - cx * s;
  let ty = vh / 2 - cy * s;
  const fit = (t: number, size: number, v: number) => (size * s >= v ? Math.min(0, Math.max(v - size * s, t)) : (v - size * s) / 2);
  tx = fit(tx, APP_W, vw);
  ty = fit(ty, APP_H, vh);
  return {s, tx, ty};
};

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const lerpRect = (a: Rect, b: Rect, p: number): Rect => [0, 1, 2, 3].map((i) => lerp(a[i], b[i], p)) as Rect;

const useKeyed = <T,>(keys: [number, T][], start: T, mix: (a: T, b: T, p: number) => T, damping = 22) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let cur = start;
  for (const [at, v] of keys) {
    const p = spring({frame: frame - Math.round(at * fps), fps, config: {damping, stiffness: 60, mass: 1}, durationInFrames: Math.round(1.1 * fps)});
    cur = mix(cur, v, p);
  }
  return cur;
};

const AppView: React.FC<{id: string; def: FeatureDef; vw: number; vh: number; tall: boolean; dur: number}> = ({id, def, vw, vh, tall, dur}) => {
  const t = useT();
  const {fps} = useVideoConfig();
  const start: Rect = tall ? def.camTall[0][1] : FULL;
  const keys = tall ? def.camTall.slice(1) : def.cam;
  let cam = useKeyed<Rect>(keys, start, lerpRect);
  // 켄 번스: 머무는 동안 아주 천천히 더 다가감
  const drift = 1 - 0.035 * Math.min(1, t / dur);
  cam = [cam[0] + (cam[2] * (1 - drift)) / 2, cam[1] + (cam[3] * (1 - drift)) / 2, cam[2] * drift, cam[3] * drift];
  const {s, tx, ty} = camTransform(cam, vw, vh);

  // 강조 테두리
  const firstRing = def.ring[0];
  const ringRect = useKeyed<Rect | null>(def.ring, null, (a, b, p) => (b === null ? (p > 0.5 ? null : a) : a === null ? b : lerpRect(a, b, p)), 18);
  const ringIn = t >= firstRing[0] ? spring({frame: Math.round((t - firstRing[0]) * fps), fps, config: {damping: 10, stiffness: 140}}) : 0;
  const pulse = 0.5 + 0.5 * Math.sin(t * 7);
  const muted = def.muteUntil ?? 0;
  const edge = 0.3;

  return (
    <div style={{position: 'absolute', width: vw, height: vh, overflow: 'hidden', background: '#0E1013'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: APP_W, height: APP_H, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`}}>
        <OffthreadVideo
          src={staticFile(`clips/${id}.mp4`)}
          style={{width: APP_W, height: APP_H}}
          volume={(f) => {
            const ts = f / fps;
            if (ts < muted) return 0;
            return interpolate(ts, [muted, muted + edge, dur - edge, dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          }}
        />
        {ringRect ? (
          <div
            style={{
              position: 'absolute',
              left: ringRect[0] - 8,
              top: ringRect[1] - 8,
              width: ringRect[2] + 16,
              height: ringRect[3] + 16,
              border: `${7 / Math.max(1, s)}px solid ${C.orange}`,
              borderRadius: 12,
              boxShadow: `0 0 ${18 + pulse * 22}px ${C.orange}, inset 0 0 ${10 + pulse * 10}px ${C.orange}88`,
              opacity: ringIn,
              transform: `scale(${1.25 - 0.25 * ringIn})`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

/** 차량 디스플레이 테두리 */
const Bezel: React.FC<{x: number; y: number; w: number; h: number; children: React.ReactNode; tilt?: number}> = ({x, y, w, h, children, tilt = 0}) => (
  <div
    style={{
      position: 'absolute',
      left: x - 18,
      top: y - 18,
      width: w + 36,
      height: h + 36,
      borderRadius: 30,
      background: 'linear-gradient(160deg, #3A3F46 0%, #15171A 40%, #0A0B0D 100%)',
      boxShadow: '0 40px 80px #000a, 0 0 0 2px #4a505833 inset',
      transform: `perspective(2600px) rotateY(${tilt}deg)`,
    }}
  >
    <div style={{position: 'absolute', left: 18, top: 18, width: w, height: h, borderRadius: 14, overflow: 'hidden'}}>
      {children}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(115deg, #ffffff10 0%, #ffffff05 30%, transparent 31%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  </div>
);

const Phone: React.FC<{src: string; h: number; at: number; dur: number}> = ({src, h, at}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at * fps, fps, config: {damping: 16}});
  const w = Math.round((h * 390) / 844);
  return (
    <div
      style={{
        width: w + 24,
        height: h + 24,
        borderRadius: 40,
        background: '#0A0B0D',
        border: '3px solid #3A3F46',
        padding: 12,
        boxShadow: '0 30px 60px #000a',
        opacity: p,
        transform: `translateY(${(1 - p) * 60}px)`,
      }}
    >
      <OffthreadVideo src={staticFile(src)} muted style={{width: w, height: h, borderRadius: 28, display: 'block'}} />
    </div>
  );
};

export const Feature: React.FC<{id: string; dur: number; index: number}> = ({id, dur, index}) => {
  const def = FEATURES[id];
  const tall = useTall();
  const t = useT();
  const {fps} = useVideoConfig();
  const sp = (speech as Record<string, number[][]>)[id] ?? [];
  const lead = def.lead;
  const vstart = featureLead(id);
  const clipDur = dur - vstart;
  // 첫머리 큰 전·후 자막 → 사라지고 화면 등장
  const introOut = lead ? ramp01(t, lead - 0.35, lead) : 1;

  const sfx = (
    <>
      {def.radio.map((r, i) => {
        const after = sp.find(([a]) => a >= r - 0.2 && a >= (def.muteUntil ?? 0));
        const end = after ? Math.min(after[1], clipDur - 0.3) : Math.min(r + 2.2, clipDur - 0.4);
        return (
          <React.Fragment key={i}>
            <Sfx name="ptt" at={Math.max(0, r - 0.05)} volume={0.85} />
            <Sfx name="roger" at={end} volume={0.42} />
          </React.Fragment>
        );
      })}
      {def.alert !== undefined ? <Sfx name="alert" at={def.alert} volume={0.5} /> : null}
    </>
  );
  const num = String(index).padStart(2, '0');
  const intro = lead ? (
    <AbsoluteFill style={{opacity: 1 - introOut, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40}}>
      <Pop at={0.05} blip={false}>
        <Chip size={tall ? 36 : 30}>
          기능 {num} · {def.tag}
        </Chip>
      </Pop>
      <BeforeAfter before={def.before} after={def.after} at={0.15} size={tall ? 96 : 104} stack />
    </AbsoluteFill>
  ) : null;
  const show = {opacity: introOut, transform: `translateY(${(1 - introOut) * 30}px)`};
  const pair = (size: number) => (
    <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
      <span style={{fontFamily: FONT, fontSize: size * 0.8, color: C.muted, textDecoration: 'line-through', textDecorationColor: C.tx, textDecorationThickness: 3}}>{def.before}</span>
      <span style={{fontFamily: FONT_B, fontSize: size, color: C.orange}}>→ {def.after}</span>
    </div>
  );

  if (tall) {
    const vw = 1032;
    const vh = 800;
    return (
      <AbsoluteFill>
        <Backdrop glow={{x: '50%', y: '50%'}} />
        <Brand tall />
        {intro}
        <div style={{...show, position: 'absolute', inset: 0}}>
          <div style={{position: 'absolute', left: 48, top: 110, right: 48}}>
            <Chip size={30}>
              기능 {num} · {def.tag}
            </Chip>
            <div style={{marginTop: 18}}>{pair(44)}</div>
            <div style={{fontFamily: FONT_B, fontSize: 58, color: C.paper, lineHeight: 1.15, marginTop: 14, wordBreak: 'keep-all'}}>{def.title}</div>
          </div>
          <div style={{position: 'absolute', left: 24, top: 500, width: vw, height: vh, borderRadius: 18, overflow: 'hidden', border: `3px solid ${C.line}`, boxShadow: '0 30px 60px #000a', background: '#0E1013'}}>
            <Sequence from={Math.round(vstart * fps)} layout="none">
              <AppView id={id} def={def} vw={vw} vh={vh} tall dur={clipDur} />
            </Sequence>
          </div>
          <div style={{position: 'absolute', left: 48, top: 1335, right: 48, textAlign: 'center'}}>
            <div style={{fontFamily: FONT_B, fontSize: 44, color: C.paper, lineHeight: 1.35, wordBreak: 'keep-all'}}>{def.sub}</div>
            <div style={{fontFamily: FONT, fontSize: 28, color: C.muted, marginTop: 14}}>{def.note ?? '실제 앱 화면 녹화 · Pleos Connect Emulator'}</div>
          </div>
          <div style={{position: 'absolute', left: 540 - 128, top: 1600}}>
            <Sprite mood={def.mood} scale={4} />
          </div>
        </div>
        <Sequence from={Math.round(vstart * fps)} layout="none">
          {sfx}
        </Sequence>
      </AbsoluteFill>
    );
  }

  const vw = 1240;
  const vh = Math.round((1240 * APP_H) / APP_W);
  const phone = id === 'rx';
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '66%', y: '50%'}} />
      <Brand />
      {intro}
      <div style={{...show, position: 'absolute', inset: 0}}>
        <div style={{position: 'absolute', left: 72, top: 96, width: 480}}>
          <Chip size={24}>
            기능 {num} · {def.tag}
          </Chip>
          <div style={{marginTop: 22}}>{pair(38)}</div>
          <div style={{fontFamily: FONT_B, fontSize: 50, color: C.paper, lineHeight: 1.2, marginTop: 20, wordBreak: 'keep-all'}}>{def.title}</div>
          <div style={{width: 64, height: 6, background: C.orange, margin: '22px 0 18px'}} />
          <div style={{fontFamily: FONT, fontSize: 30, color: C.paper, lineHeight: 1.45, wordBreak: 'keep-all'}}>{def.sub}</div>
          <div style={{fontFamily: FONT, fontSize: 21, color: C.muted, marginTop: 14, lineHeight: 1.4}}>{def.note ?? '실제 앱 화면 녹화 · Pleos Connect Emulator'}</div>
        </div>
        {phone ? (
          <div style={{position: 'absolute', left: 170, top: 640}}>
            <Sequence from={Math.round(vstart * fps)} layout="none">
              <Phone src={`clips/${id}_phone.mp4`} h={380} at={0.1} dur={clipDur} />
            </Sequence>
          </div>
        ) : (
          <div style={{position: 'absolute', left: 72, bottom: 56}}>
            <Sprite mood={def.mood} scale={3} />
          </div>
        )}
        <Bezel x={620} y={Math.round((1080 - vh) / 2) + 20} w={vw} h={vh} tilt={-3 + Math.min(1, t / dur) * 1.5}>
          <Sequence from={Math.round(vstart * fps)} layout="none">
            <AppView id={id} def={def} vw={vw} vh={vh} tall={false} dur={clipDur} />
          </Sequence>
        </Bezel>
      </div>
      <Sequence from={Math.round(vstart * fps)} layout="none">
        {sfx}
      </Sequence>
    </AbsoluteFill>
  );
};

const ramp01 = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
