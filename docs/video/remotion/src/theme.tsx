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

/** 화면 색: 회색 바탕·흰 카드. 주 색(orange, orangeText)은 마스코트 몸 파랑이다. 이름만 예전 주황 그대로 둔다.
 * 받은 무전(rx)은 파랑, 빨강(tx)은 경고에만 쓴다. lcd 계열은 옅은 파랑 꼬리표 */
export const C = {
  bg: '#F2F4F6',
  paper: '#FFFFFF',
  line: '#E5E8EB',
  ink: '#191F28',
  ink2: '#4E5968',
  ink3: '#8B95A1',
  lcd: '#EEF0FF',
  lcdInk: '#3340B8',
  lcdDim: '#A9B6F9',
  tx: '#F04452',
  rx: '#2F6FE0',
  orange: '#7B8EF5',
  /** 큰 파랑 글자(흰·회색 위 대비 3:1 이상). 채움에는 orange */
  orangeText: '#5567F5',
  shadow: '0 8px 24px rgba(0,29,58,.06)',
};
/** 차량 색: 1호차부터 차례로. 앱의 호차 색 순서와 같다(파랑, 보라, 청록, 분홍, 노랑, 빨강) */
export const CARS = ['#3182F6', '#7B55FF', '#14B8D4', '#FF3D8B', '#FFB331', '#F04452'];
export const VEH_COLORS = CARS;

/** 본문(Pretendard SemiBold) · 굵은 글자와 제목(Pretendard ExtraBold) */
export const FONT = 'PretendardSB';
export const FONT_B = 'PretendardXB';
export const SERIF = FONT_B;

const fontHandle = delayRender('fonts');
Promise.all([
  new FontFace(FONT, `url(${staticFile('fonts/Pretendard-SemiBold.otf')})`).load(),
  new FontFace(FONT_B, `url(${staticFile('fonts/Pretendard-ExtraBold.otf')})`).load(),
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
      <Audio src={staticFile(`audio/${name}.wav`)} volume={volume * 0.6} />
    </Sequence>
  );
};

/** 제 그림이 없는 표정 → 쓸 그림 */
const MOOD: Record<string, string> = {tx: 'talk', brake: 'alert', camera: 'alert', rain: 'base'};

/** 마스코트(투명 PNG). scale 1 = 64px. 영상 시간에 맞춰 살짝 들썩인다 */
export const Sprite: React.FC<{mood: string; scale: number; fps?: number; style?: React.CSSProperties}> = ({mood, scale, style}) => {
  const t = useT();
  const s = 64 * scale;
  const k = MOOD[mood] ?? mood;
  const bob = Math.sin(t * Math.PI * 1.6);
  const pop = useSpring(0.15, 9, 170);   // 장면이 시작되면 톡 튀어나온다
  return (
    <div style={{width: s, height: s, ...style}}>
      <Img
        src={staticFile(`character/cuckoo_${k}.png`)}
        style={{width: s, height: s, display: 'block', objectFit: 'contain', transformOrigin: '50% 100%', transform: `translateY(${bob * s * 0.025 + (1 - pop) * s * 0.3}px) scale(${(1 + bob * 0.015) * pop}, ${(1 - bob * 0.015) * pop})`}}
      />
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

/** 꼬리표. 기본은 옅은 파랑 바탕 + 진한 파랑 글자. 주 색(파랑) 바탕 위 글자는 흰색이면 대비가 모자라 늘 먹색 */
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
      color: color === C.orange ? C.ink : ink,
      fontFamily: FONT_B,
      fontSize: size,
      padding: `${size * 0.3}px ${size * 0.7}px`,
      borderRadius: Math.max(10, size * 0.4),
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

/** 수신·송신 점 */
export const Led: React.FC<{color: string; on?: boolean; size?: number}> = ({color, on = true, size = 14}) => (
  <span
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: on ? color : C.line,
    }}
  />
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

/** 카드: 위에서 내려앉는다(살짝 기울었다 바로잡힘). pin 은 예전 호출 호환용으로만 받는다 */
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
        borderRadius: 24,
        boxShadow: C.shadow,
        opacity: Math.min(1, p * 1.5),
        transform: `translateY(${(1 - p) * -70}px) rotate(${(1 - p) * tilt * 3}deg)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** 배경: 옅은 회색 바탕 + 흰 빛 한 점 */
export const Backdrop: React.FC<{glow?: {x: string; y: string}; children?: React.ReactNode}> = ({glow = {x: '62%', y: '50%'}, children}) => (
  <div style={{position: 'absolute', inset: 0, background: C.bg, overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse 50% 55% at ${glow.x} ${glow.y}, #ffffffcc, transparent 70%)`}} />
    {children}
  </div>
);

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
      background: 'rgba(255,255,255,.92)',
      borderRadius: 999,
      padding: tall ? '8px 22px' : '6px 18px',
    }}
  >
    <Led color={C.orange} size={tall ? 14 : 12} />
    <span style={{fontFamily: SERIF, fontSize: tall ? 34 : 28, color: C.ink}}>뻐꾸기</span>
    <span>Pleos Connect 차량용 앱</span>
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
        color: C.orangeText,
        fontFamily: SERIF,
        fontSize: size,
        lineHeight: 1.2,
        opacity: ap,
        transform: `scale(${0.6 + 0.4 * ap})`,
        transformOrigin: align === 'left' ? 'left center' : 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {after}
    </span>
  );
  return (
    <div style={{display: 'flex', flexDirection: stack ? 'column' : 'row', alignItems: stack ? (align === 'left' ? 'flex-start' : 'center') : 'center', justifyContent: align === 'left' ? 'flex-start' : 'center', gap: stack ? size * 0.15 : size * 0.4}}>
      {blip ? <Sfx name="blip" at={at + 0.65} volume={0.3} /> : null}
      {b}
      <span style={{fontFamily: FONT_B, fontSize: size * 0.6, color: C.orangeText, opacity: ap, lineHeight: 1}}>{stack ? '↓' : '→'}</span>
      {a}
    </div>
  );
};
