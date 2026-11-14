import React from 'react';
import {AbsoluteFill, Freeze, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import cfg from './scenes.json';
import speech from './speech.json';
import {Backdrop, BeforeAfter, Brand, C, Chip, FONT, FONT_B, Led, Pop, SERIF, Sfx, Sprite, useT, useTall, WaveBars} from './theme';

type Rect = [number, number, number, number]; // x, y, w, h (앱 화면 1682x1210 좌표)
const APP_W = 1682;
const APP_H = 1210;
const FULL: Rect = [0, 0, APP_W, APP_H];

// 새 앱 배치(2026-11-14 녹화) 기준. 화면 좌표에서 (853, 90)을 뺀 값
const CARDS: Rect = [640, 120, 1040, 640];
const CARD1: Rect = [652, 172, 1003, 128];
const CARD2: Rect = [652, 318, 1003, 128];
const CARD2_TALL: Rect = [652, 318, 1003, 176];
const CARD3: Rect = [652, 464, 1003, 128];
const PTT: Rect = [652, 1043, 1002, 142];
const VOTE_OPTS: Rect = [655, 255, 1000, 195];
const VOTE_2: Rect = [994, 255, 315, 195];
const CAR_LIST: Rect = [20, 700, 615, 360];
const NAV_LIST: Rect = [5, 5, 595, 800];
const NAV_ROUTE: Rect = [800, 20, 480, 1060];

export type FeatureDef = {
  tag: string;
  /** 예전 방식 → 뻐꾸기 (장면 첫머리에 크게) */
  before: string;
  after: string;
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
};

/** 클립별 녹화 의존 값(scenes.json clips): lead 첫머리 전·후 자막 시간, mute~muteAfter 밖은 클립 소리 끔(초) */
type ClipCfg = {lead?: number; mute?: number; muteAfter?: number};
const clipCfg = (id: string) => (cfg.clips as Record<string, ClipCfg>)[id] ?? {};

const TALL0: Rect = [640, 60, 1042, 800];

export const FEATURES: Record<string, FeatureDef> = {
  tx: {
    tag: '사람 무전',
    before: '전화 3통',
    after: '버튼 1번',
    title: '버튼 한 번, 전 차량 동시 무전',
    sub: '누르고 말하면 일행 모든 차에 동시 전달',
    note: '에뮬레이터는 마이크 입력 없음 · 송신 표시만',
    mood: 'tx',
    cam: [[0.3, [600, 150, 1082, 1060]]],
    camTall: [[0.0, TALL0], [0.5, [650, 560, 1020, 640]]],
    ring: [[1.0, PTT]],
    radio: [1.0],
  },
  rx: {
    tag: '무전 수신',
    before: '단톡 확인 불가',
    after: '스피커 음성 전달',
    title: '화면 대신 스피커로 듣는 무전',
    sub: '보낸 차·자리 표시, 차량 스피커 음성 재생',
    note: '왼쪽: Pleos 미탑재 일행의 휴대폰 웹',
    mood: 'rx',
    cam: [[0.2, CARDS]],
    camTall: [[0.0, TALL0], [0.4, [650, 120, 1020, 640]]],
    ring: [[0.7, CARD1], [3.6, null]],
    radio: [0.7],
  },
  brake: {
    tag: '자동 무전',
    before: '앞차 급제동 늦은 인지',
    after: '자동 무전',
    title: '급제동 자동 무전',
    sub: '앞차 급제동, 거리 포함 음성·카드·지도 핀 전달',
    mood: 'brake',
    cam: [[0.2, [0, 100, APP_W, 650]], [2.3, CARDS]],
    camTall: [[0.0, TALL0], [0.4, [650, 120, 1020, 640]]],
    ring: [[0.7, CARD1], [3.1, CARD2], [6.6, null]],
    radio: [0.7],
    alert: 0.75,
  },
  vote: {
    tag: '쉬어 가',
    before: '휴게소 제각각 결정',
    after: '투표 후 전 차량 경유지',
    title: '휴게소 투표',
    sub: '후보 3곳 · 번호 누르기나 "1번" 음성 투표',
    mood: 'vote',
    cam: [[0.2, [600, 100, 1082, 560]]],
    camTall: [[0.0, TALL0], [0.4, [650, 110, 1020, 560]]],
    ring: [[0.4, VOTE_OPTS], [7.0, VOTE_2], [7.7, CARD1]],
    radio: [0.2],
  },
  waypoint: {
    tag: '내비 연동',
    before: '휴게소 제각각 결정',
    after: '투표 후 전 차량 경유지',
    title: '순정 내비 경유지 등록',
    sub: '투표 결과 휴게소, 전 차량 내비에 자동 반영',
    note: '앱 → 차량 순정 내비 (NaviHelper)',
    mood: 'arrive',
    cam: [[0.2, CARDS], [0.7, [0, 0, 1300, 1100]], [3.0, FULL]],   // 내비로 바뀌기 전에 미리 넓혀 빈 지도를 비추지 않는다
    camTall: [[0.0, [640, 100, 1042, 800]], [0.7, [0, 0, 1000, 1210]]],
    ring: [[0.2, CARD1], [0.8, null], [1.8, NAV_LIST], [2.8, NAV_ROUTE], [3.7, null]],
    radio: [0.0],
  },
  arrive: {
    tag: '자동 무전',
    before: '"어디야?" 반복 확인',
    after: '위치·도착 자동 보고',
    title: '도착 자동 보고',
    sub: '차량 간 거리 표시, 휴게소 도착 보고, 전원 도착 시 깃발 색 깜빡임',
    mood: 'arrive',
    cam: [[0.1, [0, 520, 900, 560]], [1.8, CARDS]],
    camTall: [[0.0, [0, 480, 1000, 760]], [1.8, [650, 120, 1020, 640]]],
    ring: [[0.2, CAR_LIST], [1.7, null], [2.2, CARD2_TALL]],
    radio: [2.0],
  },
};

/** 클립이 장면 안에서 시작하는 초: 전·후 자막이 사라지기 시작할 때 */
export const featureLead = (id: string) => Math.max(0, (clipCfg(id).lead ?? 0) - 0.35);

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

const AppView: React.FC<{id: string; def: FeatureDef; vw: number; vh: number; tall: boolean; dur: number; still?: boolean}> = ({id, def, vw, vh, tall, dur, still}) => {
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
  const {mute = 0, muteAfter = 99} = clipCfg(id);
  const edge = 0.3;

  return (
    <div style={{position: 'absolute', width: vw, height: vh, overflow: 'hidden', background: C.ink}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: APP_W, height: APP_H, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`}}>
        <OffthreadVideo
          src={staticFile(`clips/${id}.mp4`)}
          style={{width: APP_W, height: APP_H}}
          muted={still}
          volume={(f) => {
            const ts = f / fps;
            const end = Math.min(dur, muteAfter + edge);
            if (ts < mute || ts > end) return 0;
            return interpolate(ts, [mute, mute + edge, end - edge, end], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
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
              borderRadius: 24,
              boxShadow: `0 0 0 ${(6 + pulse * 10) / Math.max(1, s)}px ${C.orange}40`,
              opacity: ringIn,
              transform: `scale(${1.25 - 0.25 * ringIn})`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

/** 차량 디스플레이: 흰 카드 + 옅은 그림자 */
const Bezel: React.FC<{x: number; y: number; w: number; h: number; children: React.ReactNode; tilt?: number}> = ({x, y, w, h, children, tilt = 0}) => (
  <div
    style={{
      position: 'absolute',
      left: x - 18,
      top: y - 18,
      width: w + 36,
      height: h + 36,
      borderRadius: 40,
      background: C.paper,
      boxShadow: '0 16px 40px rgba(0,29,58,.10)',
      transform: `perspective(2600px) rotateY(${tilt}deg)`,
    }}
  >
    <div style={{position: 'absolute', left: 17, top: 17, width: w, height: h, borderRadius: 24, overflow: 'hidden'}}>{children}</div>
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
        background: C.paper,
        padding: 12,
        boxShadow: '0 16px 40px rgba(0,29,58,.10)',
        opacity: p,
        transform: `translateY(${(1 - p) * 60}px)`,
      }}
    >
      <OffthreadVideo src={staticFile(src)} muted style={{width: w, height: h, borderRadius: 28, display: 'block'}} />
    </div>
  );
};

/** hold: 나레이션이 끝날 때까지 클립 첫 프레임을 멈춰 두는 시간(초, prep.py 가 계산) */
export const Feature: React.FC<{id: string; dur: number; index: number; hold: number}> = ({id, dur, index, hold}) => {
  const def = FEATURES[id];
  const tall = useTall();
  const t = useT();
  const {fps} = useVideoConfig();
  const sp = (speech as Record<string, number[][]>)[id] ?? [];
  const {lead = 0, mute = 0, muteAfter = 99} = clipCfg(id);
  const vstart = featureLead(id) + hold;
  const clipDur = dur - vstart;
  // 첫머리 큰 전·후 자막 → 사라지고 화면 등장
  const introOut = lead ? ramp01(t, lead - 0.35, lead) : 1;
  // TX·RX 꼬리표: 앱 음성이 나오는 동안 RX 파형이 출렁인다 (speech.json 기준)
  const ct = t - vstart;
  const talking = sp.some(([a, b]) => ct >= a && ct < b && b > mute && a < muteAfter);
  const sending = def.radio.some((r) => ct >= r - 0.05 && ct < r + 0.6);

  const sfx = (
    <>
      {def.radio.map((r, i) => {
        const after = sp.find(([a]) => a >= r - 0.2 && a >= mute && a < muteAfter);
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
  // 클립 자리: hold 동안 첫 프레임 정지(소리 없음) → 이어서 재생
  const v0 = Math.round(featureLead(id) * fps);
  const h = Math.round(hold * fps);
  const appClip = (play: React.ReactNode, still: React.ReactNode) => (
    <>
      {h > 0 ? (
        <Sequence from={v0} durationInFrames={h} layout="none">
          <Freeze frame={0}>{still}</Freeze>
        </Sequence>
      ) : null}
      <Sequence from={v0 + h} layout="none">
        {play}
      </Sequence>
    </>
  );
  const num = String(index).padStart(2, '0');
  const tagChip = (size: number) => (
    <Chip size={size}>
      <span style={{color: C.lcdInk, opacity: 0.75, marginRight: size * 0.4}}>CH {num}</span>
      {def.tag}
    </Chip>
  );
  const lcd = (size: number) => (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: size * 0.6, background: sending ? '#FFEEEE' : '#E8F3FF', color: sending ? C.tx : C.rx, borderRadius: Math.max(10, size * 0.45), padding: `${size * 0.4}px ${size * 0.9}px`, fontFamily: FONT_B, fontSize: size, letterSpacing: '0.04em'}}>
      <Led color={sending ? C.tx : C.rx} on={sending || talking} size={size * 0.55} />
      <span style={{width: size * 1.6}}>{sending ? 'TX' : 'RX'}</span>
      <WaveBars on={talking || sending} color={sending ? C.tx : C.rx} h={size * 1.2} n={9} />
    </div>
  );
  const intro = lead ? (
    <AbsoluteFill style={{opacity: 1 - introOut, transform: `scale(${1 + introOut * 0.04})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 44}}>
      <Pop at={0.05} blip={false} style={{transformOrigin: 'center'}}>
        {tagChip(tall ? 34 : 30)}
      </Pop>
      <BeforeAfter before={def.before} after={def.after} at={0.15} size={tall ? 96 : 110} stack />
    </AbsoluteFill>
  ) : null;
  const show = {opacity: introOut, transform: `translateY(${(1 - introOut) * 40}px)`};
  const pair = (size: number) => (
    <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
      <span style={{fontFamily: FONT, fontSize: size * 0.8, color: C.ink3, textDecoration: 'line-through', textDecorationColor: C.tx, textDecorationThickness: 3}}>{def.before}</span>
      <span style={{fontFamily: FONT_B, fontSize: size, color: C.orangeText}}>→ {def.after}</span>
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
            {tagChip(30)}
            <div style={{marginTop: 18}}>{pair(44)}</div>
            <div style={{fontFamily: SERIF, fontSize: 62, color: C.ink, lineHeight: 1.15, marginTop: 14, wordBreak: 'keep-all'}}>{def.title}</div>
          </div>
          <div style={{position: 'absolute', left: 24, top: 500, width: vw, height: vh, borderRadius: 32, overflow: 'hidden', border: `8px solid ${C.paper}`, boxShadow: '0 16px 40px rgba(0,29,58,.10)', background: C.ink}}>
            {appClip(<AppView id={id} def={def} vw={vw - 16} vh={vh - 16} tall dur={clipDur} />, <AppView id={id} def={def} vw={vw - 16} vh={vh - 16} tall dur={clipDur} still />)}
          </div>
          <div style={{position: 'absolute', left: 48, top: 1335, right: 48, textAlign: 'center'}}>
            <div style={{fontFamily: FONT_B, fontSize: 44, color: C.ink, lineHeight: 1.35, wordBreak: 'keep-all'}}>{def.sub}</div>
            <div style={{fontFamily: FONT, fontSize: 28, color: C.ink2, marginTop: 14}}>{def.note ?? '실제 앱 화면 녹화 · Pleos Connect Emulator'}</div>
          </div>
          <div style={{position: 'absolute', left: 140, top: 1640}}>
            <Sprite mood={def.mood} scale={3.4} />
          </div>
          <div style={{position: 'absolute', left: 420, top: 1700}}>{lcd(40)}</div>
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
          {tagChip(24)}
          <div style={{marginTop: 22}}>{pair(36)}</div>
          <div style={{fontFamily: SERIF, fontSize: 54, color: C.ink, lineHeight: 1.2, marginTop: 20, wordBreak: 'keep-all'}}>{def.title}</div>
          <div style={{width: 64, height: 8, borderRadius: 4, background: C.orange, margin: '22px 0 18px'}} />
          <div style={{fontFamily: FONT, fontSize: 30, color: C.ink, lineHeight: 1.45, wordBreak: 'keep-all'}}>{def.sub}</div>
          <div style={{fontFamily: FONT, fontSize: 21, color: C.ink2, marginTop: 14, lineHeight: 1.4}}>{def.note ?? '실제 앱 화면 녹화 · Pleos Connect Emulator'}</div>
        </div>
        {phone ? (
          <div style={{position: 'absolute', left: 170, top: 640}}>
            <Sequence from={Math.round(vstart * fps)} layout="none">
              <Phone src={`clips/${id}_phone.mp4`} h={380} at={0.1} dur={clipDur} />
            </Sequence>
          </div>
        ) : (
          <div style={{position: 'absolute', left: 72, bottom: 64, display: 'flex', alignItems: 'center', gap: 22}}>
            <Sprite mood={def.mood} scale={2.8} />
            {lcd(26)}
          </div>
        )}
        <Bezel x={620} y={Math.round((1080 - vh) / 2) + 20} w={vw} h={vh} tilt={-3 + Math.min(1, t / dur) * 1.5}>
          {appClip(<AppView id={id} def={def} vw={vw} vh={vh} tall={false} dur={clipDur} />, <AppView id={id} def={def} vw={vw} vh={vh} tall={false} dur={clipDur} still />)}
        </Bezel>
      </div>
      <Sequence from={Math.round(vstart * fps)} layout="none">
        {sfx}
      </Sequence>
    </AbsoluteFill>
  );
};

const ramp01 = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
