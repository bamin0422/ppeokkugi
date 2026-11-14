import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, staticFile, useVideoConfig} from 'remotion';
import {Backdrop, BeforeAfter, Brand, BUS, C, Chip, FONT, FONT_B, Led, Pop, ramp, Road, SERIF, Sfx, Sprite, useSpring, useT, useTall, VEH_COLORS, Vehicle, WaveBars, Waves} from './theme';

export const PURPOSE = ['운전 중에도 일행 전체와', '끊기지 않는 연락'];
export const PAIRS: [string, string][] = [
  ['전화 3통', '버튼 1번'],
  ['단톡 확인 불가', '스피커 음성 전달'],
  ['앞차 급제동 늦은 인지', '자동 무전'],
  ['"어디야?" 반복 확인', '위치·도착 자동 보고'],
  ['휴게소 제각각 결정', '투표 후 전 차량 경유지'],
];

/** 전화기(통화 중 표시) */
const Handset: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      fill={color}
      d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"
    />
  </svg>
);

/** 말풍선: at~at+len 동안 */
const Bubble: React.FC<{at: number; len: number; text: string; color?: string; ink?: string; size: number}> = ({at, len, text, color = C.paper, ink = C.ink, size}) => {
  const t = useT();
  const p = useSpring(at, 9, 200);
  if (t < at || t > at + len) return null;
  const out = ramp(t, at + len - 0.15, at + len);
  return (
    <div style={{position: 'absolute', left: '50%', bottom: '100%', marginBottom: 52, transform: `translateX(-50%) scale(${p * (1 - out)})`, transformOrigin: 'bottom center', filter: 'drop-shadow(0 8px 14px rgba(80,40,60,.16))'}}>
      <Sfx name="blip" at={at} volume={0.25} />
      <div style={{background: color, color: ink, fontFamily: FONT_B, fontSize: size, padding: `${size * 0.28}px ${size * 0.6}px`, borderRadius: 999, whiteSpace: 'nowrap'}}>{text}</div>
      <div style={{width: 0, height: 0, margin: '0 auto', borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: `13px solid ${color}`}} />
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
        <path d={`M ${x1} ${y} Q ${(x1 + x2) / 2} ${y - h * 2} ${x2} ${y}`} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" pathLength={1000} style={{strokeDasharray: broken ? '30 34' : `${Math.min(1, p * 1.4) * 1000} 1000`}} opacity={p} />
      </svg>
    );
  };
  const xMark = brk(call2 + 0.6 * k);
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: '40%'}} />
      <div style={{position: 'absolute', left: tall ? 48 : 80, top: tall ? 140 : 70}}>
        <Pop at={0.1}>
          <Chip size={tall ? 32 : 26} color={C.tx} ink={C.paper}>
            운전 중 일행 연락
          </Chip>
        </Pop>
      </div>
      <Road y={roadY} h={220} speed={300} />
      {arc(cx(0), cx(1), lineP(call1, 1.1 * k), C.orange)}
      {arc(cx(0), cx(2), lineP(call2, 1.6 * k), C.tx, t > call2 + 0.6 * k)}
      {xMark > 0 && t < call2 + 1.6 * k ? (
        <div style={{position: 'absolute', left: (cx(0) + cx(2)) / 2 - 44, top: vy - 20 - (60 + Math.abs(cx(2) - cx(0)) * 0.12) - 44, width: 88, height: 88, borderRadius: 44, background: C.tx, color: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_B, fontSize: 56, transform: `scale(${xMark})`, boxShadow: C.shadow}}>✕</div>
      ) : null}
      {xs.map((x, i) => (
        <div key={i} style={{position: 'absolute', left: x, top: vy}}>
          <div style={{fontFamily: FONT_B, fontSize: 30, color: C.ink, textAlign: 'center', marginBottom: 8}}>{i + 1}호차</div>
          <div style={{position: 'relative'}}>
            <Vehicle kind="car" color={VEH_COLORS[i]} px={px} brake={i === 0 && brake} />
            {i === 0 ? (
              <>
                <div style={{display: t < 3.3 * k ? 'flex' : 'none', position: 'absolute', left: 9 * px - 36, top: -150, width: 72, height: 72, borderRadius: 36, background: t < 3.0 * k ? C.orange : C.line, alignItems: 'center', justifyContent: 'center', boxShadow: C.shadow, transform: `rotate(${t < 3.0 * k ? Math.sin(t * 30) * 8 : 0}deg)`}}>
                  <Handset size={40} color={C.paper} />
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
        <Pop at={4.4 * k} style={{transformOrigin: 'center'}}>
          <div style={{fontFamily: SERIF, fontSize: tall ? 78 : 76, color: C.ink, lineHeight: 1.2, wordBreak: 'keep-all'}}>운전 중 끊기는 일행 연락</div>
        </Pop>
        <Pop at={4.7 * k} blip={false} style={{transformOrigin: 'center'}}>
          <div style={{fontFamily: FONT, fontSize: tall ? 36 : 32, color: C.ink2, marginTop: 18, lineHeight: 1.5, wordBreak: 'keep-all'}}>
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
      <div style={{position: 'absolute', left: 60, right: 60, top: tall ? 520 : 190, textAlign: 'center'}}>
        <Pop at={0.1} style={{transformOrigin: 'center'}}>
          <Chip size={tall ? 34 : 28}>목적</Chip>
        </Pop>
        <Pop at={0.3} blip={false} style={{transformOrigin: 'center'}}>
          <div style={{fontFamily: SERIF, fontSize: tall ? 88 : 100, color: C.ink, lineHeight: 1.25, marginTop: tall ? 50 : 40, letterSpacing: '-0.02em'}}>
            {PURPOSE[0]}
            <br />
            <span style={{color: C.orange}}>{PURPOSE[1]}</span>
          </div>
        </Pop>
        <Pop at={0.9 * k} blip={false} style={{transformOrigin: 'center'}}>
          <div style={{fontFamily: FONT, fontSize: tall ? 38 : 36, color: C.ink2, marginTop: tall ? 44 : 34, wordBreak: 'keep-all'}}>여러 대로 움직이는 운전자·인솔자를 위한 차량용 무전</div>
        </Pop>
      </div>
      {/* 차들이 파란 무전 선으로 이어진다 */}
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <line x1={xs[0]} y1={rowY - 20} x2={xs[0] + (xs[3] - xs[0]) * link} y2={rowY - 20} stroke={C.rx} strokeWidth={6} strokeLinecap="round" strokeDasharray="2 16" />
      </svg>
      {kinds.map((kd, i) => (
        <div key={i} style={{position: 'absolute', left: xs[i], top: rowY, transform: 'translateX(-50%)', opacity: ramp(t, 0.5 * k + i * 0.1, 0.8 * k + i * 0.1)}}>
          <Vehicle kind={kd} color={kd === 'bus' ? BUS : VEH_COLORS[i]} px={px} />
          <div style={{position: 'absolute', left: '50%', top: -44, transform: 'translateX(-50%)'}}>
            <Led color={C.rx} on={link * 3 > i} size={22} />
          </div>
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
          <Chip size={tall ? 34 : 28}>무엇이 달라지나</Chip>
        </Pop>
      </div>
      <div style={{position: 'absolute', left: tall ? 48 : 120, right: tall ? 48 : 120, top: tall ? 270 : 160, display: 'flex', flexDirection: 'column', gap: tall ? 34 : 16}}>
        {PAIRS.map(([b, a], i) => {
          const at = (0.3 + i * 0.55) * k;
          return tall ? <BeforeAfter key={i} before={b} after={a} at={at} size={56} stack align="left" /> : <Row key={i} before={b} after={a} at={at} color={VEH_COLORS[i]} />;
        })}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: tall ? 1540 : 805, display: 'flex', justifyContent: 'center'}}>
        <Pop at={4.6 * k} style={{transformOrigin: 'center'}}>
          <div
            style={{
              background: C.lcd,
              color: C.lcdInk,
              fontFamily: FONT_B,
              fontSize: tall ? 50 : 54,
              padding: tall ? '26px 40px' : '24px 54px',
              borderRadius: 30,
              boxShadow: '0 16px 36px rgba(42,34,48,.24)',
              textAlign: 'center',
              lineHeight: 1.3,
              display: 'flex',
              alignItems: 'center',
              gap: 28,
            }}
          >
            <Led color={C.rx} size={16} />
            <span>
              {tall ? (
                <>
                  {PURPOSE[0]}
                  <br />
                  {PURPOSE[1]}
                </>
              ) : (
                `${PURPOSE[0]} ${PURPOSE[1]}`
              )}
            </span>
          </div>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

const Row: React.FC<{before: string; after: string; at: number; color: string}> = ({before, after, at, color}) => {
  const t = useT();
  const p = useSpring(at, 14, 160);
  const strike = ramp(t, at + 0.25, at + 0.5);
  const ap = useSpring(at + 0.5, 11, 170);
  return (
    <div style={{display: 'grid', gridTemplateColumns: '1fr 90px 1fr', alignItems: 'center', height: 108, background: C.paper, border: `1.5px solid ${C.line}`, borderLeft: `12px solid ${color}`, borderRadius: 28, boxShadow: C.shadow, opacity: Math.min(1, p * 1.4), transform: `translateX(${(1 - p) * -60}px) rotate(${(1 - p) * -2}deg)`}}>
      <Sfx name="blip" at={at + 0.5} volume={0.28} />
      <div style={{textAlign: 'right', paddingRight: 10}}>
        <span style={{position: 'relative', fontFamily: FONT, fontSize: 38, color: C.ink3, whiteSpace: 'nowrap'}}>
          {before}
          <span style={{position: 'absolute', left: -4, top: '54%', height: 4, borderRadius: 2, width: `calc(${strike * 100}% + 8px)`, background: C.tx}} />
        </span>
      </div>
      <div style={{textAlign: 'center', fontFamily: FONT_B, fontSize: 40, color: C.orange, opacity: ap}}>→</div>
      <div style={{fontFamily: SERIF, fontSize: 50, color: C.ink, opacity: ap, transform: `scale(${0.7 + 0.3 * ap})`, transformOrigin: 'left center', whiteSpace: 'nowrap'}}>{after}</div>
    </div>
  );
};

/** 관제석: 모니터(LCD 화면) 앞 마스코트 */
const Desk: React.FC<{talking: boolean}> = ({talking}) => (
  <div style={{position: 'relative', width: 280, height: 210}}>
    <div style={{position: 'absolute', left: 90, top: 0, width: 190, height: 130, background: C.lcd, borderRadius: 22, boxShadow: '0 12px 26px rgba(42,34,48,.22)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: FONT_B, fontSize: 20, color: C.lcdInk}}>
        <Led color={talking ? C.tx : C.rx} size={10} />
        {talking ? 'TX 전체' : '대기'}
      </div>
      <WaveBars on={talking} color={C.lcdInk} h={36} n={9} />
    </div>
    <div style={{position: 'absolute', left: 170, top: 130, width: 30, height: 34, background: C.ink3}} />
    <div style={{position: 'absolute', left: 0, top: 160, width: 280, height: 26, borderRadius: 13, background: VEH_COLORS[0]}} />
    <div style={{position: 'absolute', left: -20, top: 40}}>
      <Sprite mood={talking ? 'talk' : 'base'} scale={2} />
    </div>
  </div>
);

/* ---------- 운수사 관제 (확대 계획 · 적용 예시) ---------- */
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
  const deskX = tall ? width / 2 - 140 : 110;
  const deskY = tall ? 440 : 320;
  const w1 = 1.0 * k;
  const w2 = short ? 99 : 3.9 * k;
  const pair2 = short ? 1.1 : 3.7 * k;
  const talking = (t >= w1 && t < w1 + 1.4 * k) || (t >= w2 && t < w2 + 1.4 * k);
  const tag = (i: number) => {
    if (t >= w2 + 0.3) return i < 2 ? {txt: '도착', c: C.rx} : {txt: '출발', c: C.orange};
    if (t >= w1 + 0.4 && t < w2) return {txt: 'RX', c: C.rx};
    return null;
  };
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: '45%'}} />
      <Brand tall={tall} />
      <div style={{position: 'absolute', left: tall ? 48 : 80, top: tall ? 130 : 60, right: tall ? 48 : 80}}>
        <Pop at={0.05}>
          <Chip size={tall ? 30 : 24} color={C.orange} ink={C.paper}>
            운수사 구독 전용 · 적용 예시
          </Chip>
        </Pop>
        <Pop at={0.2} blip={false}>
          <div style={{fontFamily: SERIF, fontSize: tall ? 62 : 58, color: C.ink, marginTop: 22, lineHeight: 1.2, wordBreak: 'keep-all'}}>
            운수사 관제 <span style={{color: C.orange}}>→</span> 운행 중 기사 전원 동시 공지
          </div>
        </Pop>
      </div>
      {/* 관제 책상 */}
      <div style={{position: 'absolute', left: deskX, top: deskY}}>
        <Desk talking={talking} />
        <div style={{fontFamily: FONT_B, fontSize: tall ? 30 : 28, color: C.ink, marginTop: 6, textAlign: 'center', width: 280}}>운수사 관제</div>
        <div style={{position: 'absolute', left: 185, top: 65}}>
          <Waves at={w1} color={C.orange} size={tall ? 1400 : 2400} count={3} />
          {!short ? <Waves at={w2} color={C.rx} size={tall ? 1400 : 2400} count={3} /> : null}
        </div>
      </div>
      {/* 실제 화면: 차 밖 휴대폰 웹 참여 */}
      {!tall ? (
        <div style={{position: 'absolute', left: 110, top: 610, display: 'flex', alignItems: 'flex-end', gap: 18, opacity: ramp(t, 1.6 * k, 2.0 * k)}}>
          <div style={{width: 120 + 16, height: 260 + 16, borderRadius: 24, background: C.paper, border: `1.5px solid ${C.line}`, padding: 8, boxShadow: C.shadow}}>
            <OffthreadVideo src={staticFile('clips/rx_phone.mp4')} muted style={{width: 120, height: 260, borderRadius: 16, display: 'block'}} />
          </div>
          <div style={{fontFamily: FONT, fontSize: 22, color: C.ink2, lineHeight: 1.45, width: 260}}>
            실제 화면
            <br />
            차 밖에서 휴대폰 웹으로
            <br />
            같은 무전방 참여
          </div>
        </div>
      ) : null}
      <Road y={roadY} h={200} speed={0} left={tall ? 0 : 700} />
      {xs.map((x, i) => {
        const tg = tag(i);
        return (
          <div key={i} style={{position: 'absolute', left: x + Math.sin(t * 2 + i) * 4, top: vy}}>
            <div style={{fontFamily: FONT_B, fontSize: 26, color: C.ink, textAlign: 'center', marginBottom: 6}}>{i + 1}호차</div>
            <Vehicle kind="bus" color={BUS} px={px} />
            {tg ? (
              <div style={{position: 'absolute', left: '50%', top: -80, transform: 'translateX(-50%)'}}>
                <Chip size={24} color={tg.c} ink={C.paper}>
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
      <div style={{position: 'absolute', left: 0, right: 0, bottom: tall ? 90 : 34, textAlign: 'center', fontFamily: FONT, fontSize: tall ? 26 : 22, color: C.ink2}}>
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
  const shot = useSpring(0.6 * k, 16, 110);
  const zoom = 1 + 0.04 * ramp(t, 1.2 * k, dur);
  const w = tall ? 980 : 1180;
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '60%', y: '55%'}} />
      <Brand tall={tall} />
      <div style={{position: 'absolute', left: tall ? 48 : 80, top: tall ? 130 : 60, right: tall ? 48 : 80}}>
        <Pop at={0.05}>
          <Chip size={tall ? 30 : 24} color={C.orange} ink={C.paper}>
            운수사 구독 전용 · 통합 관제
          </Chip>
        </Pop>
        <Pop at={0.2} blip={false}>
          <div style={{fontFamily: SERIF, fontSize: tall ? 62 : 58, color: C.ink, marginTop: 22, lineHeight: 1.2, wordBreak: 'keep-all'}}>
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
          transform: `translateY(${(1 - shot) * -80}px) rotate(${(1 - shot) * -3}deg) scale(${zoom})`,
          transformOrigin: 'left top',
          border: `1.5px solid ${C.line}`,
          borderRadius: 28,
          overflow: 'hidden',
          background: C.paper,
          boxShadow: '0 24px 50px rgba(80,40,60,.16)',
        }}
      >
        <div style={{height: 44, background: C.paper, borderBottom: `1.5px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', fontFamily: FONT, fontSize: 18, color: C.ink2}}>
          {[VEH_COLORS[0], VEH_COLORS[2], VEH_COLORS[1]].map((c) => (
            <span key={c} style={{width: 13, height: 13, borderRadius: 7, background: c}} />
          ))}
          <span style={{marginLeft: 12}}>관제석 · 운행 보고서</span>
        </div>
        <div style={{maxHeight: tall ? 700 : 640, overflow: 'hidden'}}>
          <Img src={staticFile('shots/report.png')} style={{width: '100%', display: 'block'}} />
        </div>
      </div>
      <Sfx name="blip" at={0.6 * k} volume={0.3} />
      <div style={{position: 'absolute', left: tall ? 0 : 1340, right: tall ? 0 : 60, top: tall ? 1280 : 330, display: 'flex', flexDirection: 'column', gap: tall ? 16 : 46, alignItems: tall ? 'center' : 'flex-start'}}>
        <BeforeAfter before="기사별 구두 보고" after="자동 보고서" at={1.6 * k} size={tall ? 56 : 46} stack align={tall ? 'center' : 'left'} />
        <BeforeAfter before="급제동·이탈 따로 확인" after="차량별 한 줄" at={3.4 * k} size={tall ? 56 : 46} stack align={tall ? 'center' : 'left'} />
      </div>
      <div style={{position: 'absolute', left: tall ? 48 : 0, right: tall ? 48 : 0, bottom: tall ? 90 : 34, textAlign: 'center', fontFamily: FONT, fontSize: tall ? 26 : 22, color: C.ink2, wordBreak: 'keep-all', lineHeight: 1.45}}>
        실제 화면 · 가상 차량 3대 주행 기록. 무전은 횟수만 남기고 내용·음성은 저장하지 않습니다.
      </div>
    </AbsoluteFill>
  );
};
