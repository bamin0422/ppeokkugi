import React from 'react';
import {AbsoluteFill, Freeze, Img, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Footage} from './Broll';
import cfg from './scenes.json';
import speech from './speech.json';
import {Brand, C, Chip, FONT, FONT_B, Led, SERIF, Sfx, Sprite, useT, useTall, WaveBars} from './theme';

type Rect = [number, number, number, number]; // x, y, w, h (앱 화면 1682x1210 좌표)
const APP_W = 1682;
const APP_H = 1210;
const FULL: Rect = [0, 0, APP_W, APP_H];

// 새 앱 배치(2026-11-14 녹화) 기준. 화면 좌표에서 (853, 90)을 뺀 값
// 카드 가운데(1154)에 맞춘다. 천천히 다가가도 강조 테두리 좌우가 잘리지 않는다
const CARDS: Rect = [614, 120, 1080, 640];
// 카드는 클립 프레임에서 잰 값(흰·옅은 빨강 카드의 가장자리)
const CARD1: Rect = [654, 163, 1000, 182];
const CARD2: Rect = [654, 364, 1000, 186];
const CARD2_TALL: Rect = CARD2;
const CARD3: Rect = [654, 569, 1000, 182];
const PTT: Rect = [652, 1043, 1002, 142];
const VOTE_OPTS: Rect = [654, 254, 1000, 200];
const VOTE_2: Rect = [994, 254, 320, 200];
const CAR_LIST: Rect = [20, 700, 615, 360];
// 내비 화면에서 잰 값: 경로 목록 패널(안내 시작 버튼 포함), 경로 선과 도착 핀·시간 표시
const NAV_LIST: Rect = [26, 36, 578, 841];
const NAV_ROUTE: Rect = [870, 40, 510, 1130];

export type FeatureDef = {
  /** 영상의 축: 연락 · 정보 공유 · 도착 확인 */
  tag: string;
  title: string;
  sub: string;
  note?: string;
  mood: string;
  /** 앱 정지 화면(public/screens/<shot>.png, 1682×1210)과 뒤에 깔 삽화(public/broll/<illust>.jpg) */
  shot: string;
  illust: string;
  /** 이 기능이 쓰는 Pleos SDK */
  sdk: string;
  /** 카메라 [초, 사각형]: 처음엔 전체, 이후 이 순서로 다가간다 (클립 기준 초) */
  cam: [number, Rect][];
  camTall: [number, Rect][];
  /** 강조 테두리 [초, 사각형 | null] */
  ring: [number, Rect | null][];
  /** 무전 이벤트(딸깍+스켈치) 시각 */
  radio: number[];
  alert?: number;
};

/** 클립별 녹화 의존 값(scenes.json clips): lead 클립을 늦게 시작하는 시간, mute~muteAfter 밖은 클립 소리 끔(초) */
type ClipCfg = {lead?: number; mute?: number; muteAfter?: number};
const clipCfg = (id: string) => (cfg.clips as Record<string, ClipCfg>)[id] ?? {};

const TALL0: Rect = [640, 60, 1042, 800];

export const FEATURES: Record<string, FeatureDef> = {
  tx: {
    tag: '연락',
    title: '단체 무전 송신',
    sub: '버튼 한 번 누르고 말하면 일행 모든 차에 동시 전달',
    mood: 'tx',
    shot: 'ptt-tx',
    illust: 'ptt_press',
    sdk: 'SpeechToText · TextToSpeech',
    cam: [[0.3, [600, 150, 1082, 1060]]],
    camTall: [[0.0, TALL0], [0.5, [614, 560, 1080, 640]]],
    ring: [[1.0, PTT]],
    radio: [1.15],
  },
  rx: {
    tag: '연락',
    title: '단체 무전 수신',
    sub: '보낸 차·자리 표시, 차량 스피커로 음성 재생',
    note: '왼쪽: Pleos 미탑재 일행의 휴대폰 웹',
    mood: 'rx',
    shot: 'brake-alert',
    illust: 'convoy_dusk',
    sdk: 'TextToSpeech',
    cam: [[0.2, CARDS]],
    camTall: [[0.0, TALL0], [0.4, CARDS]],
    ring: [[0.7, CARD1], [3.5, null]],   // 0.70초 카드 등장, 3.83초 목록 바뀜
    radio: [0.7],
  },
  brake: {
    tag: '정보 공유',
    title: '급제동 자동 콜',
    sub: '앞차 급제동을 거리와 함께 음성·카드·지도 핀으로 전달',
    mood: 'brake',
    shot: 'brake-alert',
    illust: 'brake_chain',
    sdk: 'Vehicle · TextToSpeech',
    cam: [[0.2, [0, 100, APP_W, 650]], [2.3, CARDS]],
    camTall: [[0.0, TALL0], [0.4, CARDS]],
    ring: [[0.7, CARD1], [3.2, CARD2]],   // 3.33초 새 카드가 밀어 내림
    radio: [0.7],
    alert: 0.75,
  },
  tail: {
    tag: '정보 공유',
    title: '일행 위치 · 처짐 알림',
    sub: '지도와 차량별 거리로 일행 위치 확인, 대열에서 처지면 자동 알림',
    mood: 'lost',
    shot: 'driver',
    illust: 'traffic_gap',
    sdk: 'FusedLocation',
    cam: [[0.2, [0, 100, APP_W, 1000]]],
    camTall: [[0.0, TALL0], [0.4, CARDS]],
    ring: [[0.6, CARD3], [2.6, CAR_LIST], [4.6, null]],
    radio: [],
  },
  vote: {
    tag: '정보 공유',
    title: '쉬어 가 투표',
    sub: '후보 3곳 · 번호 누르기나 "1번" 음성 투표',
    mood: 'vote',
    shot: 'vote',
    illust: 'rest_stop',
    sdk: 'SpeechToText · TextToSpeech',
    cam: [[0.2, [614, 100, 1080, 560]]],
    camTall: [[0.0, TALL0], [0.4, [614, 110, 1080, 560]]],
    ring: [[1.0, VOTE_OPTS], [6.2, VOTE_2], [7.4, null]],   // 0.93초 투표 창 등장, 7.73초 목록 바뀜
    radio: [0.2],
  },
  waypoint: {
    tag: '정보 공유',
    title: '모든 차 경유지 등록',
    sub: '투표 결과 휴게소가 모든 차 순정 내비에 자동 반영',
    note: '앱 → 차량 순정 내비',
    mood: 'arrive',
    shot: 'vote',
    illust: 'rest',
    sdk: 'NaviHelper',
    cam: [[0.2, CARDS], [0.7, [0, 0, 1300, 1100]], [2.3, FULL]],   // 내비로 바뀌기 전에 미리 넓혀 빈 지도를 비추지 않는다
    camTall: [[0.0, [640, 100, 1042, 800]], [0.7, [0, 0, 1000, 1210]]],
    ring: [[0.2, CARD1], [0.8, null], [1.8, NAV_LIST], [2.8, NAV_ROUTE], [3.7, null]],
    radio: [0.0],
  },
  arrive: {
    tag: '도착 확인',
    title: '도착 자동 보고',
    sub: '도착하면 자동으로 알리고, 모두 모이면 함께 알림',
    mood: 'arrive',
    shot: 'arrive',
    illust: 'arrive',
    sdk: 'FusedLocation · TextToSpeech',
    cam: [[0.1, [0, 520, 900, 560]], [1.8, CARDS]],
    camTall: [[0.0, [0, 480, 1000, 760]], [1.8, CARDS]],
    ring: [[0.2, CAR_LIST], [1.7, null], [2.2, CARD2_TALL]],
    radio: [2.0],
  },
};

/** 클립이 장면 안에서 시작하는 초 */
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
export const lerpRect = (a: Rect, b: Rect, p: number): Rect => [0, 1, 2, 3].map((i) => lerp(a[i], b[i], p)) as Rect;

export const useKeyed = <T,>(keys: [number, T][], start: T, mix: (a: T, b: T, p: number) => T, damping = 22, move = 1.1) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let cur = start;
  for (const [at, v] of keys) {
    const p = spring({frame: frame - Math.round(at * fps), fps, config: {damping, stiffness: 60, mass: 1}, durationInFrames: Math.round(move * fps)});
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
  const ringRect = useKeyed<Rect | null>(def.ring, null, (a, b, p) => (b === null ? (p > 0.5 ? null : a) : a === null ? b : lerpRect(a, b, p)), 18, 0.45);   // 카드는 한 프레임에 바뀌므로 테두리도 빨리 옮긴다
  const ringIn = t >= firstRing[0] ? spring({frame: Math.round((t - firstRing[0]) * fps), fps, config: {damping: 10, stiffness: 140, overshootClamping: true}}) : 0;   // 튕기면 테두리가 카드 안쪽으로 줄어 글자를 가린다
  const pulse = 0.5 + 0.5 * Math.sin(t * 7);

  return (
    <div style={{position: 'absolute', width: vw, height: vh, overflow: 'hidden', background: C.ink}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: APP_W, height: APP_H, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`}}>
        <Img src={staticFile(`screens/${def.shot}.png`)} style={{width: APP_W, height: APP_H, display: 'block'}} />
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
              transform: `scale(${1.1 - 0.1 * ringIn})`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

/** 삽화 위 글자판 */
const PANEL: React.CSSProperties = {background: 'rgba(255,255,255,.95)', borderRadius: 28, padding: '28px 32px', boxShadow: '0 16px 40px rgba(0,29,58,.18)'};

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
      <Img src={staticFile(src)} style={{width: w, height: h, borderRadius: 28, display: 'block', objectFit: 'cover', objectPosition: 'top'}} />
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
  const {mute = 0, muteAfter = 99} = clipCfg(id);
  const vstart = featureLead(id) + hold;
  const clipDur = dur - vstart;
  // TX·RX 꼬리표: 앱 음성이 나오는 동안 RX 파형이 출렁인다 (speech.json 기준)
  const ct = t - vstart;
  const talking = sp.some(([a, b]) => ct >= a && ct < b && b > mute && a < muteAfter);
  const sending = def.radio.some((r) => ct >= r - 0.05 && ct < r + (id === 'tx' ? 3.05 : 0.6));   // 송신 장면은 버튼을 누르고 있는 동안 내내 TX

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
  const pleos = `Pleos Connect 차량용 앱 · Pleos SDK ${def.sdk}`;
  const tagChip = (size: number) => (
    <Chip size={size}>
      <span style={{color: C.lcdInk, opacity: 0.75, marginRight: size * 0.4}}>CH {num}</span>
      {def.tag}
    </Chip>
  );
  const lcd = (size: number) => (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: size * 0.6, background: sending ? C.lcd : '#E8F1FF', color: sending ? C.lcdInk : C.rx, borderRadius: Math.max(10, size * 0.45), padding: `${size * 0.4}px ${size * 0.9}px`, fontFamily: FONT_B, fontSize: size, letterSpacing: '0.04em'}}>
      <Led color={sending ? C.orange : C.rx} on={sending || talking} size={size * 0.55} />
      <span style={{width: size * 1.6}}>{sending ? 'TX' : 'RX'}</span>
      <WaveBars on={talking || sending} color={sending ? C.orange : C.rx} h={size * 1.2} n={9} />
    </div>
  );

  if (tall) {
    const vw = 1032;
    const vh = 800;
    return (
      <AbsoluteFill>
        <Footage shots={[{src: def.illust}]} dur={dur} dim={0.15} />
        <Brand tall />
        <div style={{position: 'absolute', inset: 0}}>
          <div style={{position: 'absolute', left: 32, top: 120, right: 32, ...PANEL}}>
            {tagChip(30)}
            <div style={{fontFamily: SERIF, fontSize: 62, color: C.ink, lineHeight: 1.15, marginTop: 22, wordBreak: 'keep-all'}}>{def.title}</div>
          </div>
          <div style={{position: 'absolute', left: 24, top: 500, width: vw, height: vh, borderRadius: 32, overflow: 'hidden', border: `8px solid ${C.paper}`, boxShadow: '0 16px 40px rgba(0,29,58,.10)', background: C.ink}}>
            {appClip(<AppView id={id} def={def} vw={vw - 16} vh={vh - 16} tall dur={clipDur} />, <AppView id={id} def={def} vw={vw - 16} vh={vh - 16} tall dur={clipDur} still />)}
          </div>
          <div style={{position: 'absolute', left: 32, top: 1330, right: 32, textAlign: 'center', ...PANEL}}>
            <div style={{fontFamily: FONT_B, fontSize: 44, color: C.ink, lineHeight: 1.35, wordBreak: 'keep-all'}}>{def.sub}</div>
            <div style={{fontFamily: FONT, fontSize: 28, color: C.ink2, marginTop: 14}}>{pleos}</div>
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
      <Footage shots={[{src: def.illust}]} dur={dur} dim={0.15} />
      <Brand />
      <div style={{position: 'absolute', inset: 0}}>
        <div style={{position: 'absolute', left: 48, top: 112, width: 520, ...PANEL}}>
          {tagChip(26)}
          <div style={{fontFamily: SERIF, fontSize: 60, color: C.ink, lineHeight: 1.2, marginTop: 26, wordBreak: 'keep-all'}}>{def.title}</div>
          <div style={{width: 64, height: 8, borderRadius: 4, background: C.orange, margin: '22px 0 18px'}} />
          <div style={{fontFamily: FONT, fontSize: 30, color: C.ink, lineHeight: 1.45, wordBreak: 'keep-all'}}>{def.sub}</div>
          <div style={{fontFamily: FONT_B, fontSize: 22, color: C.lcdInk, marginTop: 18, lineHeight: 1.45}}>{pleos}</div>
          {def.note ? <div style={{fontFamily: FONT, fontSize: 21, color: C.ink2, marginTop: 6, lineHeight: 1.4}}>{def.note}</div> : null}
        </div>
        {phone ? (
          <div style={{position: 'absolute', left: 190, top: 668}}>
            <Sequence from={Math.round(vstart * fps)} layout="none">
              <Phone src="screens/phone-04-radio.png" h={350} at={0.1} dur={clipDur} />
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

