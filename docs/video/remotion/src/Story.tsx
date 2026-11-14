import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Footage} from './Broll';
import {Backdrop, BeforeAfter, Brand, C, Chip, FONT, FONT_B, Led, Pop, ramp, SERIF, Sfx, useSpring, useT, useTall, VEH_COLORS} from './theme';

export const PURPOSE = ['운전 중에도 일행 전체와', '끊기지 않는 연락'];
export const PAIRS: [string, string][] = [
  ['전화 3통', '버튼 1번'],
  ['단톡 확인 불가', '스피커 음성 전달'],
  ['앞차 급제동 늦은 인지', '자동 무전'],
  ['"어디야?" 반복 확인', '위치·도착 자동 보고'],
  ['휴게소 제각각 결정', '투표 후 전 차량 경유지'],
];

/* ---------- 2. 목적 ---------- */
export const Purpose: React.FC<{dur: number}> = ({dur}) => {
  const t = useT();
  const tall = useTall();
  const k = dur / 4.5;
  const rowY = tall ? 1150 : 640;
  const tileW = tall ? 480 : 560;
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: '45%'}} />
      <Brand tall={tall} />
      <div style={{position: 'absolute', left: 60, right: 60, top: tall ? 420 : 110, textAlign: 'center'}}>
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
      {/* 실사 두 컷: 함께 달리는 승용차 · 단체 버스 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: rowY, display: 'flex', justifyContent: 'center', gap: tall ? 24 : 40}}>
        {[
          ['convoy_dusk', '가족 차량'],
          ['bus_convoy', '단체 버스'],
        ].map(([src, label], i) => {
          const p = ramp(t, 0.5 * k + i * 0.25, 0.9 * k + i * 0.25);
          return (
            <div key={src} style={{position: 'relative', width: tileW, height: (tileW * 9) / 16, borderRadius: 28, overflow: 'hidden', border: `6px solid ${C.paper}`, boxShadow: C.shadow, opacity: p, transform: `translateY(${(1 - p) * 40}px)`}}>
              <Footage shots={[{src}]} dur={dur} mark={false} />
              <div style={{position: 'absolute', left: 20, bottom: 18}}>
                <Chip size={tall ? 24 : 22} color={i ? C.orange : C.rx} ink={C.paper}>
                  {label}
                </Chip>
              </div>
            </div>
          );
        })}
      </div>
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
