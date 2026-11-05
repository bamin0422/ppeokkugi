import React from 'react';
import {
  Audio,
  continueRender,
  delayRender,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const C = {
  bg: '#121417',
  panel: '#1E2226',
  line: '#2A2E33',
  lcd: '#C9D86A',
  lcdInk: '#1A1F12',
  orange: '#FF6A1A',
  tx: '#FF3B30',
  rx: '#34C759',
  paper: '#F2EFE6',
  muted: '#9A968C',
};
export const FONT = 'Galmuri11';
export const FONT_B = 'Galmuri11Bold';

const fontHandle = delayRender('fonts');
Promise.all([
  new FontFace(FONT, `url(${staticFile('fonts/galmuri11.ttf')})`).load(),
  new FontFace(FONT_B, `url(${staticFile('fonts/galmuri11_bold.ttf')})`).load(),
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

const FRAMES: Record<string, number> = {
  alert: 8, arrive: 8, base: 1, brake: 8, camera: 8, emergency: 8, kids: 8, lost: 16,
  rain: 8, rest: 16, rollcall: 8, rx: 16, talk: 8, tx: 8, vote: 6, wait: 8,
};

/** 마스코트 스프라이트(64px 프레임 가로 시트). size 는 64의 정수배, 최근접 확대 */
export const Sprite: React.FC<{mood: string; scale: number; fps?: number; style?: React.CSSProperties}> = ({
  mood,
  scale,
  fps: sfps = 8,
  style,
}) => {
  const t = useT();
  const n = FRAMES[mood] ?? 1;
  const k = Math.floor(t * sfps) % n;
  const s = 64 * Math.round(scale);
  return (
    <div
      style={{
        width: s,
        height: s,
        backgroundImage: `url(${staticFile(`sprites/sprite_${mood}.png`)})`,
        backgroundSize: `${s * n}px ${s}px`,
        backgroundPosition: `-${k * s}px 0px`,
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  );
};

/** 문자열 픽셀 그림 → SVG. palette 의 키 한 글자 = 색 */
export const Pixels: React.FC<{rows: string[]; palette: Record<string, string>; px: number; style?: React.CSSProperties}> = ({
  rows,
  palette,
  px,
  style,
}) => {
  const w = Math.max(...rows.map((r) => r.length));
  const rects: React.ReactNode[] = [];
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      const fill = palette[ch];
      if (fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={fill} />);
    }),
  );
  return (
    <svg width={w * px} height={rows.length * px} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges" style={style}>
      {rects}
    </svg>
  );
};

const CAR = [
  '.....XXXXXXX......',
  '....XWWWXWWWX.....',
  '...XWWWWXWWWWX....',
  '.XXXXXXXXXXXXXXXX.',
  'XCCCCCCCCCCCCCCCCX',
  'XCCCCCCCCCCCCCCCLX',
  'XBCCCCCCCCCCCCCCCX',
  'XXXTTTXXXXXXTTTXXX',
  '...TGT......TGT...',
  '...TTT......TTT...',
];
const BUS = [
  'XXXXXXXXXXXXXXXXXXXXXXXXX.',
  'XCCCCCCCCCCCCCCCCCCCCCCCCX',
  'XCWWWCWWWCWWWCWWWCWWWCWWWX',
  'XCWWWCWWWCWWWCWWWCWWWCWWWX',
  'XCCCCCCCCCCCCCCCCCCCCCCCCX',
  'XCCCCCCCCCCCCCCCCCCCCCCCLX',
  'XBCCCCCCCCCCCCCCCCCCCCCCCX',
  'XXXXTTTXXXXXXXXXXXXTTTXXXX',
  '....TGT............TGT....',
  '....TTT............TTT....',
];
export const VEH_COLORS = ['#FF6A1A', '#E8484A', '#4A90E2', '#5DBB63', '#B07BE0'];

export const Vehicle: React.FC<{kind: 'car' | 'bus'; color: string; px: number; brake?: boolean; style?: React.CSSProperties}> = ({
  kind,
  color,
  px,
  brake,
  style,
}) => (
  <Pixels
    rows={kind === 'car' ? CAR : BUS}
    px={px}
    style={style}
    palette={{X: '#0B0C0E', C: color, W: '#9FD3FF', L: '#FFE58A', B: brake ? '#FF2A2A' : '#7A1F1F', T: '#22252A', G: '#8A8F96'}}
  />
);

/** 무전 전파: 원이 번져 나간다 */
export const Waves: React.FC<{at: number; color?: string; size?: number; count?: number}> = ({at, color = C.rx, size = 260, count = 3}) => {
  const t = useT();
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{position: 'absolute', left: -size / 2, top: -size / 2, pointerEvents: 'none'}}>
      {Array.from({length: count}).map((_, i) => {
        const p = (t - at - i * 0.22) / 1.1;
        if (p < 0 || p > 1) return null;
        return <circle key={i} r={8 + p * 40} fill="none" stroke={color} strokeWidth={((8 - p * 5) * 100) / size} opacity={1 - p} />;
      })}
    </svg>
  );
};

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
      padding: `${size * 0.28}px ${size * 0.6}px`,
      borderRadius: 4,
      boxShadow: `0 0 0 3px ${C.bg}, 0 0 0 5px ${color}55`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

/** 자막 등장: 아래에서 올라오며 나타남 + 블립 */
export const Pop: React.FC<{at: number; children: React.ReactNode; blip?: boolean; style?: React.CSSProperties; dy?: number}> = ({
  at,
  children,
  blip = true,
  style,
  dy = 24,
}) => {
  const p = useSpring(at, 16, 160);
  return (
    <div style={{opacity: p, transform: `translateY(${(1 - p) * dy}px)`, ...style}}>
      {blip ? <Sfx name="blip" at={at} volume={0.32} /> : null}
      {children}
    </div>
  );
};

/** 배경: 어두운 바탕 + 픽셀 격자 + 주황 빛 */
export const Backdrop: React.FC<{glow?: {x: string; y: string}; children?: React.ReactNode}> = ({glow = {x: '62%', y: '50%'}, children}) => {
  const t = useT();
  return (
    <div style={{position: 'absolute', inset: 0, background: C.bg, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 55% 60% at ${glow.x} ${glow.y}, ${C.orange}22, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: -40,
          backgroundImage: `linear-gradient(${C.line}55 2px, transparent 2px), linear-gradient(90deg, ${C.line}55 2px, transparent 2px)`,
          backgroundSize: '40px 40px',
          transform: `translate(${(t * 6) % 40}px, ${(t * 3) % 40}px)`,
          opacity: 0.45,
        }}
      />
      {children}
    </div>
  );
};

/** 영상 머리글: 화면 위쪽 작은 브랜드 표시 */
export const Brand: React.FC<{tall?: boolean}> = ({tall}) => (
  <div
    style={{
      position: 'absolute',
      top: tall ? 56 : 34,
      right: tall ? 48 : 48,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontFamily: FONT_B,
      fontSize: tall ? 30 : 24,
      color: C.muted,
    }}
  >
    <span style={{color: C.orange}}>뻐꾸기</span>
    <span>· Pleos 차량용 단체 무전</span>
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
    <span style={{position: 'relative', display: 'inline-block', color: C.muted, fontFamily: FONT, fontSize: size * 0.72, opacity: inP, whiteSpace: 'nowrap'}}>
      {before}
      <span style={{position: 'absolute', left: -4, top: '52%', height: Math.max(3, size * 0.07), width: `calc(${strike * 100}% + 8px)`, background: C.tx}} />
    </span>
  );
  const a = (
    <span
      style={{
        display: 'inline-block',
        color: C.orange,
        fontFamily: FONT_B,
        fontSize: size,
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
      {blip ? <Sfx name="blip" at={at + 0.65} volume={0.32} /> : null}
      {b}
      <span style={{fontFamily: FONT_B, fontSize: size * 0.7, color: C.paper, opacity: ap, lineHeight: 1}}>{stack ? '↓' : '→'}</span>
      {a}
    </div>
  );
};
