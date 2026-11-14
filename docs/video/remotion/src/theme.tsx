import React from 'react';
import {
  Audio,
  continueRender,
  delayRender,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

/** 앱 시안(driver.html :root)과 같은 색. 초록은 쓰지 않는다. */
export const C = {
  bg: '#fffaf6',
  paper: '#ffffff',
  line: '#f1e6df',
  ink: '#2a2230',
  ink2: '#6e6170',
  ink3: '#ab9ca8',
  lcd: '#2a2230',
  lcdInk: '#ffe9a3',
  lcdDim: '#a48f73',
  tx: '#ff3d5a',
  rx: '#2b8cff',
  orange: '#ff7a1a',
  shadow: '0 14px 34px rgba(80,40,60,.12)',
};
/** 차량 색: 1호차부터 차례로 */
export const CARS = ['#ff5a4e', '#2b8cff', '#ffbf1f', '#7b55ff', '#ff3d8b', '#14b8d4'];
export const VEH_COLORS = CARS;
export const BUS = '#ffbf1f';

/** 본문(Pretendard SemiBold) · 굵은 글자(Pretendard ExtraBold) · 제목(Gowun Batang Bold) */
export const FONT = 'PretendardSB';
export const FONT_B = 'PretendardXB';
export const SERIF = 'GowunBatangB';

const fontHandle = delayRender('fonts');
Promise.all([
  new FontFace(FONT, `url(${staticFile('fonts/Pretendard-SemiBold.otf')})`).load(),
  new FontFace(FONT_B, `url(${staticFile('fonts/Pretendard-ExtraBold.otf')})`).load(),
  new FontFace(SERIF, `url(${staticFile('fonts/GowunBatang-Bold.ttf')})`).load(),
]).then((faces) => {
  faces.forEach((f) => document.fonts.add(f));
  continueRender(fontHandle);
});

export const useT = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return frame / fps;
};

export const useTall = () => {
  const {width, height} = useVideoConfig();
  return height > width;
};

/** 0→1 spring starting at second `at` */
export const useSpring = (at: number, damping = 14, stiffness = 120) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - Math.round(at * fps), fps, config: {damping, stiffness}});
};

export const ramp = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** 효과음: 장면 안 `at` 초에 한 번 */
export const Sfx: React.FC<{name: string; at: number; volume?: number}> = ({name, at, volume = 0.5}) => {
  const {fps} = useVideoConfig();
  return (
    <Sequence from={Math.max(0, Math.round(at * fps))} layout="none">
      <Audio src={staticFile(`audio/${name}.wav`)} volume={volume} />
    </Sequence>
  );
};

/** 예전 픽셀 스프라이트 이름 → 새 벡터 마스코트 6종 */
const MOOD: Record<string, string> = {
  brake: 'alert', emergency: 'alert', lost: 'alert', camera: 'alert',
  rain: 'base', wait: 'base', arrive: 'base',
  rx: 'talk', tx: 'talk', vote: 'rollcall',
};

/** 마스코트(벡터). scale 1 = 64px. 숨 쉬듯 살짝 들썩인다 */
export const Sprite: React.FC<{mood: string; scale: number; fps?: number; style?: React.CSSProperties}> = ({mood, scale, style}) => {
  const t = useT();
  const s = 64 * scale;
  const k = MOOD[mood] ?? mood;
  const sq = Math.sin(t * (k === 'talk' ? 9 : 3.2));
  return (
    <div style={{width: s, height: s, ...style}}>
      <Img
        src={staticFile(`character/cuckoo_${k}.svg`)}
        style={{width: s, height: s, display: 'block', transformOrigin: '50% 90%', transform: `scale(${1 + sq * 0.025}, ${1 - sq * 0.025})`}}
      />
    </div>
  );
};

/** 옆에서 본 차(벡터). 크기는 예전 픽셀 그림과 같다: 승용차 18×10px, 버스 26×10px 단위 */
export const Vehicle: React.FC<{kind: 'car' | 'bus'; color: string; px: number; brake?: boolean; style?: React.CSSProperties}> = ({
  kind,
  color,
  px,
  brake,
  style,
}) => {
  const W = kind === 'car' ? 180 : 260;
  const glass = '#e3f0ff';
  return (
    <svg width={(W / 10) * px} height={10 * px} viewBox={`0 0 ${W} 100`} style={{overflow: 'visible', ...style}}>
      <ellipse cx={W / 2} cy={97} rx={W * 0.46} ry={5} fill="rgba(42,34,48,.14)" />
      {kind === 'car' ? (
        <>
          <path d="M40 46 L58 14 Q62 8 70 8 L116 8 Q124 8 129 14 L150 46 Z" fill={color} />
          <path d="M60 42 L73 18 L94 18 L94 42 Z M101 42 L101 18 L120 18 Q124 18 126 22 L138 42 Z" fill={glass} />
          <rect x={6} y={40} width={168} height={42} rx={20} fill={color} />
          <rect x={6} y={60} width={168} height={6} fill="rgba(255,255,255,.28)" />
        </>
      ) : (
        <>
          <rect x={4} y={6} width={252} height={76} rx={20} fill={color} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={18 + i * 36} y={18} width={28} height={26} rx={7} fill={glass} />
          ))}
          <rect x={232} y={18} width={16} height={44} rx={6} fill={glass} />
          <rect x={4} y={56} width={252} height={6} fill="rgba(255,255,255,.28)" />
        </>
      )}
      <rect x={W - 14} y={kind === 'car' ? 48 : 50} width={10} height={10} rx={4} fill="#ffe9a3" />
      <rect x={2} y={kind === 'car' ? 48 : 50} width={8} height={12} rx={4} fill={brake ? C.tx : '#c43a4e'} />
      {brake ? <circle cx={4} cy={kind === 'car' ? 54 : 56} r={16} fill={C.tx} opacity={0.35} /> : null}
      {(kind === 'car' ? [44, 136] : [50, 210]).map((x) => (
        <g key={x}>
          <circle cx={x} cy={82} r={16} fill={C.ink} />
          <circle cx={x} cy={82} r={6} fill="#ece3dc" />
        </g>
      ))}
    </svg>
  );
};

/** 도로: 흐르는 흰 차선 */
export const Road: React.FC<{y: number; h: number; speed?: number; left?: number}> = ({y, h, speed = 260, left = 0}) => {
  const t = useT();
  const {width} = useVideoConfig();
  const off = (t * speed) % 140;
  return (
    <div style={{position: 'absolute', left, top: y, width: width - left, height: h, background: '#efe3da', borderTop: '10px solid #f7ece4', borderBottom: '10px solid #e6d6ca', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: -140 - off, right: -140, top: h / 2 - 6, height: 12, backgroundImage: 'repeating-linear-gradient(90deg, #ffffff 0 70px, transparent 70px 140px)', borderRadius: 6}} />
    </div>
  );
};

/** 무전 전파: 원이 번져 나간다 */
export const Waves: React.FC<{at: number; color?: string; size?: number; count?: number}> = ({at, color = C.rx, size = 260, count = 3}) => {
  const t = useT();
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{position: 'absolute', left: -size / 2, top: -size / 2, pointerEvents: 'none'}}>
      {Array.from({length: count}).map((_, i) => {
        const p = (t - at - i * 0.22) / 1.1;
        if (p < 0 || p > 1) return null;
        return <circle key={i} r={8 + p * 40} fill="none" stroke={color} strokeWidth={((6 - p * 4) * 100) / size} opacity={(1 - p) * 0.8} />;
      })}
    </svg>
  );
};

/** 알약 꼬리표. 기본은 무전기 LCD(먹색 바탕 + 노란 글자) */
export const Chip: React.FC<{children: React.ReactNode; size?: number; color?: string; ink?: string; style?: React.CSSProperties}> = ({
  children,
  size = 26,
  color = C.lcd,
  ink = C.lcdInk,
  style,
}) => (
  <div
    style={{
      display: 'inline-block',
      background: color,
      color: ink,
      fontFamily: FONT_B,
      fontSize: size,
      letterSpacing: '0.02em',
      padding: `${size * 0.3}px ${size * 0.75}px`,
      borderRadius: 999,
      boxShadow: '0 6px 16px rgba(42,34,48,.14)',
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

/** 무전 파형: on 이면 막대가 출렁인다 */
export const WaveBars: React.FC<{on: boolean; color?: string; h?: number; n?: number}> = ({on, color = C.rx, h = 28, n = 7}) => {
  const t = useT();
  return (
    <span style={{display: 'inline-flex', alignItems: 'center', gap: h * 0.14, height: h}}>
      {Array.from({length: n}).map((_, i) => {
        const v = on ? 0.35 + 0.65 * Math.abs(Math.sin(t * 11 + i * 1.7) * Math.sin(t * 4.3 + i)) : 0.2;
        return <i key={i} style={{width: h * 0.16, height: h * v, borderRadius: h, background: color, display: 'block'}} />;
      })}
    </span>
  );
};

/** 수신·송신 표시등 */
export const Led: React.FC<{color: string; on?: boolean; size?: number}> = ({color, on = true, size = 14}) => (
  <span
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: on ? color : C.line,
      boxShadow: on ? `0 0 0 ${size * 0.3}px ${color}33, 0 0 ${size}px ${color}` : undefined,
    }}
  />
);

/** 스피커 그릴 점 무늬 */
export const Grille: React.FC<{w: number; h: number; color?: string; dot?: number; style?: React.CSSProperties}> = ({w, h, color = C.line, dot = 12, style}) => (
  <div style={{width: w, height: h, background: `radial-gradient(circle, ${color} ${dot * 0.26}px, transparent ${dot * 0.3}px) 0 0/${dot}px ${dot}px`, ...style}} />
);

/** 자막 등장: 아래에서 튀어 오르며 나타남 + 톡 */
export const Pop: React.FC<{at: number; children: React.ReactNode; blip?: boolean; style?: React.CSSProperties; dy?: number}> = ({
  at,
  children,
  blip = true,
  style,
  dy = 28,
}) => {
  const p = useSpring(at, 13, 150);
  return (
    <div style={{opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * dy}px) scale(${0.96 + 0.04 * p})`, transformOrigin: 'left center', ...style}}>
      {blip ? <Sfx name="blip" at={at} volume={0.3} /> : null}
      {children}
    </div>
  );
};

/** 핀 카드: 위에서 떨어져 꽂힌다(살짝 기울었다 바로잡힘) */
export const PinCard: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties; tilt?: number; pin?: string}> = ({
  at,
  children,
  style,
  tilt = -2,
  pin,
}) => {
  const p = useSpring(at, 11, 140);
  return (
    <div
      style={{
        position: 'relative',
        background: C.paper,
        border: `1.5px solid ${C.line}`,
        borderRadius: 28,
        boxShadow: C.shadow,
        opacity: Math.min(1, p * 1.5),
        transform: `translateY(${(1 - p) * -70}px) rotate(${(1 - p) * tilt * 3}deg)`,
        ...style,
      }}
    >
      {pin ? (
        <span style={{position: 'absolute', left: '50%', top: -9, width: 18, height: 18, marginLeft: -9, borderRadius: '50%', background: pin, boxShadow: '0 3px 6px rgba(42,34,48,.25)'}} />
      ) : null}
      {children}
    </div>
  );
};

/** 배경: 따뜻한 종이 + 여러 색 번짐 + 스피커 그릴 */
export const Backdrop: React.FC<{glow?: {x: string; y: string}; children?: React.ReactNode}> = ({glow = {x: '62%', y: '50%'}, children}) => {
  const t = useT();
  const {width, height} = useVideoConfig();
  const blob = (x: number, y: number, r: number, col: string, ph: number) => (
    <div
      style={{
        position: 'absolute',
        left: x + Math.sin(t * 0.5 + ph) * 30 - r,
        top: y + Math.cos(t * 0.4 + ph) * 24 - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${col}2e, ${col}00 70%)`,
      }}
    />
  );
  return (
    <div style={{position: 'absolute', inset: 0, background: C.bg, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse 50% 55% at ${glow.x} ${glow.y}, #ffe6d4aa, transparent 70%)`}} />
      {blob(width * 0.08, height * 0.12, width * 0.22, CARS[4], 0)}
      {blob(width * 0.95, height * 0.2, width * 0.2, CARS[2], 1.3)}
      {blob(width * 0.9, height * 0.92, width * 0.24, CARS[1], 2.1)}
      {blob(width * 0.05, height * 0.9, width * 0.18, CARS[3], 3.4)}
      <Grille w={168} h={84} style={{position: 'absolute', right: 44, bottom: 40, opacity: 0.9}} />
      {children}
    </div>
  );
};

/** 영상 머리글: 화면 위쪽 작은 브랜드 표시 */
export const Brand: React.FC<{tall?: boolean}> = ({tall}) => (
  <div
    style={{
      position: 'absolute',
      top: tall ? 52 : 34,
      right: 48,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontFamily: FONT,
      fontSize: tall ? 28 : 22,
      color: C.ink2,
    }}
  >
    <Led color={C.rx} size={tall ? 14 : 12} />
    <span style={{fontFamily: SERIF, fontSize: tall ? 34 : 28, color: C.ink}}>뻐꾸기</span>
    <span>Pleos 차량용 단체 무전</span>
  </div>
);

/** 전 → 후: 예전 방식에 빨간 줄이 그어지고 새 방식이 튀어나온다 */
export const BeforeAfter: React.FC<{
  before: string;
  after: string;
  at: number;
  size: number;
  stack?: boolean;
  align?: 'center' | 'left';
  blip?: boolean;
}> = ({before, after, at, size, stack, align = 'center', blip = true}) => {
  const t = useT();
  const inP = useSpring(at, 16, 160);
  const strike = ramp(t, at + 0.3, at + 0.6);
  const ap = useSpring(at + 0.65, 10, 170);
  const b = (
    <span style={{position: 'relative', display: 'inline-block', color: C.ink3, fontFamily: FONT, fontSize: size * 0.68, opacity: inP, whiteSpace: 'nowrap'}}>
      {before}
      <span style={{position: 'absolute', left: -4, top: '54%', height: Math.max(3, size * 0.06), borderRadius: 4, width: `calc(${strike * 100}% + 8px)`, background: C.tx}} />
    </span>
  );
  const a = (
    <span
      style={{
        display: 'inline-block',
        color: C.ink,
        fontFamily: SERIF,
        fontSize: size,
        lineHeight: 1.2,
        opacity: ap,
        transform: `scale(${0.6 + 0.4 * ap})`,
        transformOrigin: align === 'left' ? 'left center' : 'center',
        whiteSpace: 'nowrap',
        backgroundImage: `linear-gradient(transparent 62%, ${C.orange}55 62%, ${C.orange}55 92%, transparent 92%)`,
      }}
    >
      {after}
    </span>
  );
  return (
    <div style={{display: 'flex', flexDirection: stack ? 'column' : 'row', alignItems: stack ? (align === 'left' ? 'flex-start' : 'center') : 'center', justifyContent: align === 'left' ? 'flex-start' : 'center', gap: stack ? size * 0.15 : size * 0.4}}>
      {blip ? <Sfx name="blip" at={at + 0.65} volume={0.3} /> : null}
      {b}
      <span style={{fontFamily: FONT_B, fontSize: size * 0.6, color: C.orange, opacity: ap, lineHeight: 1}}>{stack ? '↓' : '→'}</span>
      {a}
    </div>
  );
};
