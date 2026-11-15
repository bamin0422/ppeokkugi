import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Footage} from './Broll';
import {lerpRect, useKeyed} from './Feature';
import report from './report.json';
import {Backdrop, BeforeAfter, Brand, C, Chip, FONT, FONT_B, Led, Pop, ramp, SERIF, Sfx, Sprite, useSpring, useT, useTall, VEH_COLORS} from './theme';

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
            <span style={{color: C.orangeText}}>{PURPOSE[1]}</span>
          </div>
        </Pop>
        <Pop at={0.9 * k} blip={false} style={{transformOrigin: 'center'}}>
          <div style={{fontFamily: FONT, fontSize: tall ? 38 : 36, color: C.ink2, marginTop: tall ? 44 : 34, wordBreak: 'keep-all'}}>여러 대로 움직이는 운전자·인솔자를 위한 차량용 무전</div>
        </Pop>
      </div>
      {/* 삽화 두 장: 함께 달리는 승용차 · 단체 버스 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: rowY, display: 'flex', justifyContent: 'center', gap: tall ? 24 : 40}}>
        {[
          ['convoy_dusk', '가족 차량'],
          ['bus_convoy', '단체 버스'],
        ].map(([src, label], i) => {
          const p = ramp(t, 0.5 * k + i * 0.25, 0.9 * k + i * 0.25);
          return (
            <div key={src} style={{position: 'relative', width: tileW, height: (tileW * 9) / 16, borderRadius: 24, overflow: 'hidden', boxShadow: C.shadow, opacity: p, transform: `translateY(${(1 - p) * 40}px)`}}>
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
              borderRadius: 24,
              textAlign: 'center',
              lineHeight: 1.3,
              display: 'flex',
              alignItems: 'center',
              gap: 28,
            }}
          >
            <Led color={C.orange} size={16} />
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
    <div style={{display: 'grid', gridTemplateColumns: '1fr 90px 1fr', alignItems: 'center', height: 108, position: 'relative', background: C.paper, borderRadius: 24, boxShadow: C.shadow, opacity: Math.min(1, p * 1.4), transform: `translateX(${(1 - p) * -60}px) rotate(${(1 - p) * -2}deg)`}}>
      <Sfx name="blip" at={at + 0.5} volume={0.28} />
      <i style={{position: 'absolute', left: 36, top: 44, width: 20, height: 20, borderRadius: 10, background: color}} />
      <div style={{textAlign: 'right', paddingRight: 10}}>
        <span style={{position: 'relative', fontFamily: FONT, fontSize: 38, color: C.ink3, whiteSpace: 'nowrap'}}>
          {before}
          <span style={{position: 'absolute', left: -4, top: '54%', height: 4, borderRadius: 2, width: `calc(${strike * 100}% + 8px)`, background: C.orangeText}} />
        </span>
      </div>
      <div style={{textAlign: 'center', fontFamily: FONT_B, fontSize: 40, color: C.orangeText, opacity: ap}}>→</div>
      <div style={{fontFamily: SERIF, fontSize: 50, color: C.ink, opacity: ap, transform: `scale(${0.7 + 0.3 * ap})`, transformOrigin: 'left center', whiteSpace: 'nowrap'}}>{after}</div>
    </div>
  );
};

/* ---------- 운행 보고서: 가상 차량이 달리고 끝낸 방의 실제 보고서 화면(src/report.mjs 캡처) ---------- */
type Box = [number, number, number, number]; // x, y, w, h (보고서 화면 CSS px)
const R = report as unknown as {page: [number, number]; arrive: Box; drive: Box; events: Box; allArrived: Box | null; timeline: Box};
// 자막은 화면에 실제로 있는 항목만 쓴다(열 이름·타임라인 줄)
const REPORT_STEPS: {at: number; text: string; ring: Box | null}[] = [
  {at: 2.0, text: '차량별 입장 · 도착 시각 · 운행 시간', ring: R.arrive},
  {at: 4.3, text: '거리 · 최고 속도', ring: R.drive},
  {at: 6.5, text: '급제동 · 에어백 · 이탈 횟수', ring: R.events},
  {at: 9.0, text: '운행 타임라인 · 전원 도착 기록', ring: R.allArrived},
];

export const Report: React.FC<{dur: number}> = ({dur}) => {
  const t = useT();
  const tall = useTall();
  const k = dur / 13;
  const shot = useSpring(0.3 * k, 16, 110);
  const vw = tall ? 980 : 1240;
  const vh = tall ? 640 : 780;
  const [pw, ph] = R.page;
  const ty0 = R.arrive[1] - 40;
  const lineY = R.allArrived ? R.allArrived[1] + R.allArrived[3] / 2 : R.timeline[1] + 200;
  // 카메라: 전체 → 표 왼쪽(도착·운행·거리) → 표 오른쪽(급제동·이탈) → 타임라인의 "전원 도착"
  const cams: [number, Box][] = [
    [1.4, [20, ty0, 510, 320]],
    [6.0, [pw - 530, ty0, 510, 320]],
    [8.5, [20, lineY - 250, pw - 40, 500]],
  ];
  const cam = useKeyed<Box>(cams.map(([at, b]) => [at * k, b]), [0, 0, pw, (pw * vh) / vw], lerpRect);
  const sc = Math.min(vw / cam[2], vh / cam[3]);
  const fit = (v: number, size: number, view: number) => Math.min(0, Math.max(view - size * sc, v));
  const tx = fit(vw / 2 - (cam[0] + cam[2] / 2) * sc, pw, vw);
  const ty = fit(vh / 2 - (cam[1] + cam[3] / 2) * sc, ph, vh);
  const ring = useKeyed<Box | null>(REPORT_STEPS.map((s) => [s.at * k, s.ring]), null, (a, b, p) => (b === null ? (p > 0.5 ? null : a) : a === null ? b : lerpRect(a, b, p)), 18, 0.45);
  const pulse = 0.5 + 0.5 * Math.sin(t * 7);
  const step = REPORT_STEPS.filter((s) => t >= s.at * k).length - 1;
  const win = (
    <div style={{width: vw, borderRadius: 24, overflow: 'hidden', background: C.paper, boxShadow: '0 16px 40px rgba(0,29,58,.10)', opacity: shot, transform: `translateY(${(1 - shot) * 40}px)`}}>
      <div style={{height: 44, borderBottom: `1.5px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', fontFamily: FONT, fontSize: 18, color: C.ink2}}>
        {[VEH_COLORS[0], VEH_COLORS[2], VEH_COLORS[1]].map((c) => (
          <span key={c} style={{width: 13, height: 13, borderRadius: 7, background: c}} />
        ))}
        <span style={{marginLeft: 12}}>관제석 · 운행 보고서</span>
      </div>
      <div style={{position: 'relative', height: vh, overflow: 'hidden', background: C.bg}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: pw, height: ph, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${sc})`}}>
          <Img src={staticFile('shots/report.png')} style={{width: pw, height: ph, display: 'block'}} />
          {ring ? (
            <div
              style={{
                position: 'absolute',
                left: ring[0] - 4,
                top: ring[1] - 4,
                width: ring[2] + 8,
                height: ring[3] + 8,
                border: `${5 / sc}px solid ${C.orange}`,
                borderRadius: 12,
                boxShadow: `0 0 0 ${(4 + pulse * 8) / sc}px ${C.orange}40`,
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
  const steps = (size: number) => (
    <div style={{display: 'flex', flexDirection: 'column', gap: size * 0.5}}>
      {REPORT_STEPS.map((s, i) => (
        <Pop key={i} at={s.at * k} dy={16}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 14, fontFamily: i === step ? FONT_B : FONT, fontSize: size, color: i === step ? C.paper : '#C5CCD4', lineHeight: 1.35, wordBreak: 'keep-all'}}>
            <span style={{width: 12, height: 12, borderRadius: 6, flex: 'none', background: i === step ? C.orange : C.line, transform: 'translateY(-4px)'}} />
            {s.text}
          </div>
        </Pop>
      ))}
    </div>
  );
  const head = (size: number) => (
    <>
      <Pop at={0.05}>
        <Chip size={size * 0.43} color={C.orange}>
          운행 보고서
        </Chip>
      </Pop>
      <Pop at={0.2} blip={false}>
        <div style={{fontFamily: SERIF, fontSize: size, color: C.paper, marginTop: 26, lineHeight: 1.2, wordBreak: 'keep-all'}}>
          운행이 끝나면 <span style={{color: C.lcdDim}}>차량별 보고서</span>
        </div>
      </Pop>
    </>
  );
  const note = '실제 화면 · 가상 차량 3대 운행 기록. 무전은 횟수만 남기고 내용·음성은 저장하지 않습니다.';
  if (tall) {
    return (
      <AbsoluteFill>
        <Brand tall />
        <div style={{position: 'absolute', left: 48, top: 130, right: 48}}>{head(62)}</div>
        <div style={{position: 'absolute', left: 50, top: 470}}>{win}</div>
        <div style={{position: 'absolute', left: 64, top: 1230, right: 48}}>{steps(40)}</div>
        <div style={{position: 'absolute', left: 48, right: 48, bottom: 90, textAlign: 'center', fontFamily: FONT, fontSize: 26, color: '#D1D6DB', wordBreak: 'keep-all', lineHeight: 1.45}}>{note}</div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Brand />
      <div style={{position: 'absolute', left: 72, top: 150, width: 500}}>
        {head(60)}
        <div style={{width: 64, height: 8, borderRadius: 4, background: C.orange, margin: '24px 0 26px'}} />
        {steps(29)}
      </div>
      <div style={{position: 'absolute', left: 72, bottom: 64, width: 500, display: 'flex', alignItems: 'center', gap: 18}}>
        <Sprite mood="arrive" scale={2.4} />
        <div style={{fontFamily: FONT, fontSize: 20, color: '#D1D6DB', lineHeight: 1.45, wordBreak: 'keep-all'}}>{note}</div>
      </div>
      <div style={{position: 'absolute', left: 620, top: 126}}>{win}</div>
    </AbsoluteFill>
  );
};
