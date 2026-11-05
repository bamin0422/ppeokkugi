import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, staticFile, useVideoConfig} from 'remotion';
import {Backdrop, BeforeAfter, Brand, C, Chip, FONT, FONT_B, Pixels, Pop, ramp, Sfx, Sprite, useSpring, useT, useTall, VEH_COLORS, Vehicle, Waves} from './theme';

export const PURPOSE = ['운전 중에도 일행 전체와', '끊기지 않는 연락'];
export const PAIRS: [string, string][] = [
  ['전화 3통', '버튼 1번'],
  ['단톡 확인 불가', '스피커 음성 전달'],
  ['앞차 급제동 늦은 인지', '자동 무전'],
  ['"어디야?" 반복 확인', '위치·도착 자동 보고'],
  ['휴게소 제각각 결정', '투표 후 전 차량 경유지'],
];

const Road: React.FC<{y: number; h: number; speed?: number}> = ({y, h, speed = 260}) => {
  const t = useT();
  const {width} = useVideoConfig();
  const off = (t * speed) % 120;
  return (
    <div style={{position: 'absolute', left: 0, top: y, width, height: h, background: '#1A1D21', borderTop: `6px solid ${C.line}`, borderBottom: `6px solid ${C.line}`}}>
      <div style={{position: 'absolute', left: -120 - off, right: -120, top: h / 2 - 4, height: 8, backgroundImage: `repeating-linear-gradient(90deg, ${C.muted}88 0 60px, transparent 60px 120px)`}} />
    </div>
  );
};

const Handset: React.FC<{px: number; color?: string}> = ({px, color = C.paper}) => (
  <Pixels px={px} rows={['XX......XX', 'XXX....XXX', 'XXXXXXXXXX', '.XX....XX.']} palette={{X: color}} />
);

/** 말풍선: at~at+len 동안 */
const Bubble: React.FC<{at: number; len: number; text: string; color?: string; ink?: string; size: number}> = ({at, len, text, color = C.paper, ink = C.bg, size}) => {
  const t = useT();
  const p = useSpring(at, 9, 200);
  if (t < at || t > at + len) return null;
  const out = ramp(t, at + len - 0.15, at + len);
  return (
    <div style={{position: 'absolute', left: '50%', bottom: '100%', marginBottom: 14, transform: `translateX(-50%) scale(${p * (1 - out)})`, transformOrigin: 'bottom center'}}>
      <Sfx name="blip" at={at} volume={0.25} />
      <div style={{background: color, color: ink, fontFamily: FONT_B, fontSize: size, padding: `${size * 0.25}px ${size * 0.5}px`, borderRadius: 8, whiteSpace: 'nowrap'}}>{text}</div>
      <div style={{width: 0, height: 0, margin: '0 auto', borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: `12px solid ${color}`}} />
    </div>
  );
};

/* ---------- 1. 아픈 곳: 운전 중 끊기는 연락 ---------- */
export const Pain: React.FC<{dur: number}> = ({dur}) => {
  const t = useT();
  const tall = useTall();
  const {width} = useVideoConfig();
  const k = dur / 7;
  const px = tall ? 11 : 14;
  const gap = tall ? 252 : 420;
  const roadY = tall ? 600 : 470;
  const xs = [0, 1, 2, 3].map((i) => width / 2 + 1.5 * gap - i * gap - 9 * px);
  const cx = (i: number) => xs[i] + 9 * px;
  const vy = roadY + (tall ? 50 : 60);
  const bs = tall ? 30 : 34;
  const call1 = 0.3 * k;
  const call2 = 1.5 * k;
  const brake = t >= 3.3 * k && t < 4.6 * k;
  const brk = (at: number) => ramp(t, at, at + 0.3);
  const lineP = (at: number, len: number) => ramp(t, at, at + 0.35) * (1 - ramp(t, at + len - 0.2, at + len));
  const arc = (x1: number, x2: number, p: number, color: string, broken = false) => {
    if (p <= 0) return null;
    const y = vy - 20;
    const h = 60 + Math.abs(x2 - x1) * 0.12;
    return (
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <path d={`M ${x1} ${y} Q ${(x1 + x2) / 2} ${y - h * 2} ${x2} ${y}`} fill="none" stroke={color} strokeWidth={6} pathLength={1000} style={{strokeDasharray: broken ? '40 30' : `${Math.min(1, p * 1.4) * 1000} 1000`}} opacity={p} />
      </svg>
    );
  };
  const xMark = brk(call2 + 0.6 * k);
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: '40%'}} />
      <div style={{position: 'absolute', left: tall ? 48 : 80, top: tall ? 140 : 70}}>
        <Pop at={0.1}>
          <Chip size={tall ? 34 : 28} color={C.tx} ink={C.paper}>
            운전 중 일행 연락
          </Chip>
        </Pop>
      </div>
      <Road y={roadY} h={220} speed={300} />
      {arc(cx(0), cx(1), lineP(call1, 1.1 * k), C.orange)}
      {arc(cx(0), cx(2), lineP(call2, 1.6 * k), C.tx, t > call2 + 0.6 * k)}
      {xMark > 0 && t < call2 + 1.6 * k ? (
        <div style={{position: 'absolute', left: (cx(0) + cx(2)) / 2 - 40, top: vy - 20 - (60 + Math.abs(cx(2) - cx(0)) * 0.12) - 40, fontFamily: FONT_B, fontSize: 90, color: C.tx, transform: `scale(${xMark})`}}>✕</div>
      ) : null}
      {xs.map((x, i) => (
        <div key={i} style={{position: 'absolute', left: x, top: vy}}>
          <div style={{fontFamily: FONT_B, fontSize: 30, color: VEH_COLORS[i], textAlign: 'center', marginBottom: 8}}>{i + 1}호차</div>
          <div style={{position: 'relative'}}>
            <Vehicle kind="car" color={VEH_COLORS[i]} px={px} brake={i === 0 && brake} />
            {i === 0 ? (
              <>
                <div style={{position: 'absolute', left: 9 * px - 50, top: -110 - 40}}>
                  <Handset px={10} color={t < 3.0 * k ? C.orange : C.muted} />
                </div>
                <Bubble at={3.3 * k} len={1.3 * k} text="급제동!" color={C.tx} ink={C.paper} size={bs} />
              </>
            ) : null}
            {i === 1 ? <Bubble at={call1 + 0.3 * k} len={0.9 * k} text="통화 중…" size={bs} /> : null}
            {i === 2 ? (
              <>
                <Bubble at={call2 + 0.7 * k} len={0.9 * k} text="연결 안 됨" color={C.tx} ink={C.paper} size={bs} />
                <Bubble at={3.6 * k} len={1.2 * k} text="어디야?" size={bs} />
              </>
            ) : null}
            {i === 3 ? (
              <>
                <Bubble at={2.0 * k} len={1.0 * k} text="어디야?" size={bs} />
                <Bubble at={3.6 * k} len={1.2 * k} text="??" size={bs} />
              </>
            ) : null}
            {i === 1 ? <Bubble at={2.6 * k} len={0.9 * k} text="어디야?" size={bs} /> : null}
          </div>
        </div>
      ))}
      <Sfx name="alert" at={3.3 * k} volume={0.35} />
      <div style={{position: 'absolute', left: tall ? 48 : 80, right: tall ? 48 : 80, ...(tall ? {top: 960} : {bottom: 70}), textAlign: 'center'}}>
        <Pop at={4.4 * k}>
          <div style={{fontFamily: FONT_B, fontSize: tall ? 74 : 72, color: C.paper, lineHeight: 1.2, wordBreak: 'keep-all'}}>운전 중 끊기는 일행 연락</div>
        </Pop>
        <Pop at={4.7 * k} blip={false}>
          <div style={{fontFamily: FONT, fontSize: tall ? 36 : 32, color: C.muted, marginTop: 18, lineHeight: 1.5, wordBreak: 'keep-all'}}>
            전화는 한 번에 한 대 · 운전 중 단톡 확인 불가 · 앞차 급제동 늦은 인지
          </div>
        </Pop>
      </div>
      {tall ? (
        <div style={{position: 'absolute', left: 540 - 160, top: 1380}}>
          <Sprite mood="lost" scale={5} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------- 2. 목적 ---------- */
export const Purpose: React.FC<{dur: number}> = ({dur}) => {
  const t = useT();
  const tall = useTall();
  const {width} = useVideoConfig();
  const k = dur / 4.5;
  const link = ramp(t, 1.0 * k, 2.0 * k);
  const kinds: ('car' | 'bus')[] = ['car', 'car', 'bus', 'bus'];
  const px = tall ? 5 : 6;
  const gap = tall ? 230 : 300;
  const rowY = tall ? 1250 : 760;
  const xs = kinds.map((_, i) => width / 2 - 1.5 * gap + i * gap);
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: '45%'}} />
      <Brand tall={tall} />
      <div style={{position: 'absolute', left: 60, right: 60, top: tall ? 520 : 200, textAlign: 'center'}}>
        <Pop at={0.1}>
          <Chip size={tall ? 36 : 30}>목적</Chip>
        </Pop>
        <Pop at={0.3} blip={false}>
          <div style={{fontFamily: FONT_B, fontSize: tall ? 84 : 96, color: C.paper, lineHeight: 1.25, marginTop: tall ? 50 : 40}}>
            {PURPOSE[0]}
            <br />
            <span style={{color: C.orange}}>{PURPOSE[1]}</span>
          </div>
        </Pop>
        <Pop at={0.9 * k} blip={false}>
          <div style={{fontFamily: FONT, fontSize: tall ? 38 : 36, color: C.muted, marginTop: tall ? 44 : 34, wordBreak: 'keep-all'}}>여러 대로 움직이는 운전자·인솔자를 위한 차량용 무전</div>
        </Pop>
      </div>
      {/* 차들이 초록 선으로 이어진다 */}
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <line x1={xs[0]} y1={rowY - 20} x2={xs[0] + (xs[3] - xs[0]) * link} y2={rowY - 20} stroke={C.rx} strokeWidth={6} strokeDasharray="18 10" />
      </svg>
      {kinds.map((kd, i) => (
        <div key={i} style={{position: 'absolute', left: xs[i], top: rowY, transform: 'translateX(-50%)', opacity: ramp(t, 0.5 * k + i * 0.1, 0.8 * k + i * 0.1)}}>
          <Vehicle kind={kd} color={kd === 'bus' ? '#F2B33A' : VEH_COLORS[i]} px={px} />
          <div style={{position: 'absolute', left: '50%', top: -44, transform: 'translateX(-50%)', width: 22, height: 22, borderRadius: 11, background: link * 3 > i ? C.rx : C.line, boxShadow: link * 3 > i ? `0 0 16px ${C.rx}` : undefined}} />
        </div>
      ))}
    </AbsoluteFill>
  );
};

/* ---------- 끝: 무엇이 달라지나 ---------- */
export const Changes: React.FC<{dur: number}> = ({dur}) => {
  const tall = useTall();
  const k = dur / 8.5;
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: '45%'}} />
      <Brand tall={tall} />
      <div style={{position: 'absolute', left: tall ? 48 : 80, top: tall ? 140 : 64}}>
        <Pop at={0.1}>
          <Chip size={tall ? 36 : 30}>무엇이 달라지나</Chip>
        </Pop>
      </div>
      <div style={{position: 'absolute', left: tall ? 48 : 120, right: tall ? 48 : 120, top: tall ? 270 : 170, display: 'flex', flexDirection: 'column', gap: tall ? 34 : 18}}>
        {PAIRS.map(([b, a], i) => {
          const at = (0.3 + i * 0.55) * k;
          return tall ? (
            <BeforeAfter key={i} before={b} after={a} at={at} size={56} stack align="left" />
          ) : (
            <Row key={i} before={b} after={a} at={at} />
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: tall ? 1540 : 800, display: 'flex', justifyContent: 'center'}}>
        <Pop at={4.6 * k}>
          <div
            style={{
              background: C.lcd,
              color: C.lcdInk,
              fontFamily: FONT_B,
              fontSize: tall ? 50 : 58,
              padding: tall ? '24px 34px' : '22px 54px',
              borderRadius: 6,
              boxShadow: `0 0 0 6px ${C.bg}, 0 0 0 10px ${C.lcd}66, 0 0 60px ${C.lcd}44`,
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            {tall ? (
              <>
                {PURPOSE[0]}
                <br />
                {PURPOSE[1]}
              </>
            ) : (
              `${PURPOSE[0]} ${PURPOSE[1]}`
            )}
          </div>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

const Row: React.FC<{before: string; after: string; at: number}> = ({before, after, at}) => {
  const t = useT();
  const p = useSpring(at, 16, 160);
  const strike = ramp(t, at + 0.25, at + 0.5);
  const ap = useSpring(at + 0.5, 11, 170);
  return (
    <div style={{display: 'grid', gridTemplateColumns: '1fr 90px 1fr', alignItems: 'center', height: 104, background: `${C.panel}cc`, border: `3px solid ${C.line}`, borderRadius: 10, opacity: p, transform: `translateX(${(1 - p) * -40}px)`}}>
      <Sfx name="blip" at={at + 0.5} volume={0.28} />
      <div style={{textAlign: 'right', paddingRight: 10}}>
        <span style={{position: 'relative', fontFamily: FONT, fontSize: 40, color: C.muted, whiteSpace: 'nowrap'}}>
          {before}
          <span style={{position: 'absolute', left: -4, top: '52%', height: 4, width: `calc(${strike * 100}% + 8px)`, background: C.tx}} />
        </span>
      </div>
      <div style={{textAlign: 'center', fontFamily: FONT_B, fontSize: 44, color: C.paper, opacity: ap}}>→</div>
      <div style={{fontFamily: FONT_B, fontSize: 48, color: C.orange, opacity: ap, transform: `scale(${0.7 + 0.3 * ap})`, transformOrigin: 'left center', whiteSpace: 'nowrap'}}>{after}</div>
    </div>
  );
};

/* ---------- 운수사 관제 (확대 계획 · 적용 예시) ---------- */
const DESK = [
  '......HHHH..........',
  '.....HHHHHH.........',
  '.....HSSSSH...MMMMMM',
  '......SESE....MLLLLM',
  '......SSSS....MLLLLM',
  '..A....SS.....MMMMMM',
  '..A..BBBBBB.....MM..',
  '..A.BBBBBBBB....MM..',
  'DDDDDDDDDDDDDDDDDDDD',
  'DWWWWWWWWWWWWWWWWWWD',
  'D.D..............D.D',
  'D.D..............D.D',
];

export const Fleet: React.FC<{dur: number}> = ({dur}) => {
  const t = useT();
  const tall = useTall();
  const {width} = useVideoConfig();
  const k = dur / 7.5;
  const short = dur < 5;
  const px = tall ? 5 : 6;
  const bw = 26 * px;
  const gap = tall ? 225 : 285;
  const roadY = tall ? 900 : 470;
  const n = 4;
  const x0 = tall ? width / 2 - 1.5 * gap - bw / 2 : 760;
  const xs = Array.from({length: n}).map((_, i) => x0 + i * gap);
  const vy = roadY + 50;
  const deskX = tall ? width / 2 - 10 * 14 : 90;
  const deskY = tall ? 420 : 330;
  const deskPx = 14;
  const w1 = 1.0 * k;
  const w2 = short ? 99 : 3.9 * k;
  const pair2 = short ? 1.1 : 3.7 * k;
  const tag = (i: number) => {
    if (t >= w2 + 0.3) return i < 2 ? {txt: '도착', c: C.rx} : {txt: '출발', c: C.lcd};
    if (t >= w1 + 0.4 && t < w2) return {txt: 'RX', c: C.rx};
    return null;
  };
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: '45%'}} />
      <Brand tall={tall} />
      <div style={{position: 'absolute', left: tall ? 48 : 80, top: tall ? 130 : 60, right: tall ? 48 : 80}}>
        <Pop at={0.05}>
          <Chip size={tall ? 32 : 26} color={C.orange} ink={C.paper}>
            운수사 구독 전용 · 적용 예시
          </Chip>
        </Pop>
        <Pop at={0.2} blip={false}>
          <div style={{fontFamily: FONT_B, fontSize: tall ? 60 : 54, color: C.paper, marginTop: 22, lineHeight: 1.2, wordBreak: 'keep-all'}}>
            운수사 관제 <span style={{color: C.orange}}>→</span> 운행 중 기사 전원 동시 공지
          </div>
        </Pop>
      </div>
      {/* 관제 책상 */}
      <div style={{position: 'absolute', left: deskX, top: deskY}}>
        <Pixels rows={DESK} px={deskPx} palette={{H: '#2A1A12', S: '#F2C9A0', E: '#1A1F12', B: '#5DBB63', M: '#3A3F46', L: C.lcd, D: '#6B3A1E', W: '#8A4B26', A: '#8A8F96'}} />
        <div style={{fontFamily: FONT_B, fontSize: tall ? 30 : 28, color: C.paper, marginTop: 10, textAlign: 'center', width: 20 * deskPx}}>운수사 관제</div>
        <div style={{position: 'absolute', left: 3 * deskPx, top: 5 * deskPx}}>
          <Waves at={w1} color={C.orange} size={tall ? 1400 : 2400} count={3} />
          {!short ? <Waves at={w2} color={C.rx} size={tall ? 1400 : 2400} count={3} /> : null}
        </div>
      </div>
      {/* 실제 화면: 차 밖 휴대폰 웹 참여 */}
      {!tall ? (
        <div style={{position: 'absolute', left: 110, top: 600, display: 'flex', alignItems: 'flex-end', gap: 16, opacity: ramp(t, 1.6 * k, 2.0 * k)}}>
          <div style={{width: 120 + 12, height: 260 + 12, borderRadius: 18, background: '#0A0B0D', border: '3px solid #3A3F46', padding: 6}}>
            <OffthreadVideo src={staticFile('clips/rx_phone.mp4')} muted style={{width: 120, height: 260, borderRadius: 12, display: 'block'}} />
          </div>
          <div style={{fontFamily: FONT, fontSize: 22, color: C.muted, lineHeight: 1.45, width: 260}}>
            실제 화면
            <br />
            차 밖에서 휴대폰 웹으로
            <br />
            같은 무전방 참여
          </div>
        </div>
      ) : null}
      <div style={{position: 'absolute', left: tall ? 0 : 700, right: 0, top: roadY}}>
        <div style={{position: 'absolute', left: 0, right: 0, height: 200, background: '#1A1D21', borderTop: `6px solid ${C.line}`, borderBottom: `6px solid ${C.line}`}} />
      </div>
      {xs.map((x, i) => {
        const tg = tag(i);
        return (
          <div key={i} style={{position: 'absolute', left: x + Math.sin(t * 2 + i) * 4, top: vy}}>
            <div style={{fontFamily: FONT_B, fontSize: 26, color: C.paper, textAlign: 'center', marginBottom: 6}}>{i + 1}호차</div>
            <Vehicle kind="bus" color="#F2B33A" px={px} />
            {tg ? (
              <div style={{position: 'absolute', left: '50%', top: -80, transform: 'translateX(-50%)'}}>
                <Chip size={24} color={tg.c} ink={C.bg}>
                  {tg.txt}
                </Chip>
              </div>
            ) : null}
          </div>
        );
      })}
      <Sfx name="ptt" at={w1 - 0.05} volume={0.7} />
      <Sfx name="roger" at={w1 + 1.4 * k} volume={0.4} />
      {!short ? <Sfx name="ptt" at={w2 - 0.05} volume={0.6} /> : null}
      <div style={{position: 'absolute', left: tall ? 0 : 560, right: 0, top: tall ? 1200 : 790, display: 'flex', flexDirection: 'column', gap: tall ? 50 : 24, alignItems: 'center'}}>
        <div style={{opacity: short ? 1 : 1 - ramp(t, pair2 - 0.3, pair2)}}>
          <BeforeAfter before="기사님께 한 명씩 전화" after="버튼 1번" at={0.5 * k} size={tall ? 56 : 60} stack={tall} />
        </div>
        <div style={short ? {} : {position: 'absolute', top: 0, left: 0, right: 0}}>
          <BeforeAfter before={'"어디쯤이에요?"'} after="출발·도착 자동 보고" at={pair2} size={tall ? 56 : 60} stack={tall} />
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: tall ? 90 : 34, textAlign: 'center', fontFamily: FONT, fontSize: tall ? 26 : 22, color: C.muted}}>
        버스의 Pleos 탑재는 확인 전입니다. 관제석은 휴대폰·PC 웹으로 참여합니다.
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 운수사 통합 관제: 운행이 끝나면 차량별 운행 보고서 ---------- */
export const Report: React.FC<{dur: number}> = ({dur}) => {
  const t = useT();
  const tall = useTall();
  const k = dur / 6.5;
  const shot = useSpring(0.6 * k, 18, 110);
  const zoom = 1 + 0.04 * ramp(t, 1.2 * k, dur);
  const w = tall ? 980 : 1180;
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '60%', y: '55%'}} />
      <Brand tall={tall} />
      <div style={{position: 'absolute', left: tall ? 48 : 80, top: tall ? 130 : 60, right: tall ? 48 : 80}}>
        <Pop at={0.05}>
          <Chip size={tall ? 32 : 26} color={C.orange} ink={C.paper}>
            운수사 구독 전용 · 통합 관제
          </Chip>
        </Pop>
        <Pop at={0.2} blip={false}>
          <div style={{fontFamily: FONT_B, fontSize: tall ? 60 : 54, color: C.paper, marginTop: 22, lineHeight: 1.2, wordBreak: 'keep-all'}}>
            운행 종료 <span style={{color: C.orange}}>→</span> 차량별 운행 보고서
          </div>
        </Pop>
      </div>
      <div
        style={{
          position: 'absolute',
          left: tall ? 50 : 100,
          top: tall ? 470 : 250,
          width: w,
          opacity: shot,
          transform: `translateY(${(1 - shot) * 60}px) scale(${zoom})`,
          transformOrigin: 'left top',
          border: `4px solid ${C.line}`,
          background: '#0A0B0D',
          boxShadow: '12px 12px 0 #000',
        }}
      >
        <div style={{height: 34, background: C.line, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', fontFamily: FONT, fontSize: 18, color: C.muted}}>
          <span style={{width: 12, height: 12, background: C.tx}} />
          <span style={{width: 12, height: 12, background: C.lcd}} />
          <span style={{width: 12, height: 12, background: C.rx}} />
          <span style={{marginLeft: 12}}>관제석 · 운행 보고서</span>
        </div>
        <div style={{maxHeight: tall ? undefined : 640, overflow: 'hidden'}}>
          <Img src={staticFile('shots/report.png')} style={{width: '100%', display: 'block'}} />
        </div>
      </div>
      <Sfx name="blip" at={0.6 * k} volume={0.3} />
      <div style={{position: 'absolute', left: tall ? 0 : 1340, right: tall ? 0 : 60, top: tall ? 1280 : 330, display: 'flex', flexDirection: 'column', gap: tall ? 16 : 46, alignItems: tall ? 'center' : 'flex-start'}}>
        <BeforeAfter before="기사별 구두 보고" after="자동 보고서" at={1.6 * k} size={tall ? 56 : 46} stack align={tall ? 'center' : 'left'} />
        <BeforeAfter before="급제동·이탈 따로 확인" after="차량별 한 줄" at={3.4 * k} size={tall ? 56 : 46} stack align={tall ? 'center' : 'left'} />
      </div>
      <div style={{position: 'absolute', left: tall ? 48 : 0, right: tall ? 48 : 0, bottom: tall ? 90 : 34, textAlign: 'center', fontFamily: FONT, fontSize: tall ? 26 : 22, color: C.muted, wordBreak: 'keep-all', lineHeight: 1.45}}>
        실제 화면 · 가상 차량 3대 주행 기록. 무전은 횟수만 남기고 내용·음성은 저장하지 않습니다.
      </div>
    </AbsoluteFill>
  );
};
