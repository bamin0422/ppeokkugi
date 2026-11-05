import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig} from 'remotion';
import {Backdrop, Brand, C, Chip, FONT, FONT_B, Pixels, Pop, ramp, Sfx, Sprite, useSpring, useT, useTall, VEH_COLORS, Vehicle, Waves} from './theme';

const ONE_LINER = '버튼 한 번, 일행 차·버스 동시 무전';
const SUBTITLE = 'Pleos 차량용 단체 무전 앱';

/* ---------- 도로: 흐르는 차선 ---------- */
const Road: React.FC<{y: number; h: number; speed?: number}> = ({y, h, speed = 220}) => {
  const t = useT();
  const {width} = useVideoConfig();
  const off = (t * speed) % 120;
  return (
    <div style={{position: 'absolute', left: 0, top: y, width, height: h, background: '#1A1D21', borderTop: `6px solid ${C.line}`, borderBottom: `6px solid ${C.line}`}}>
      <div
        style={{
          position: 'absolute',
          left: -120 + -off,
          right: -120,
          top: h / 2 - 4,
          height: 8,
          backgroundImage: `repeating-linear-gradient(90deg, ${C.muted}88 0 60px, transparent 60px 120px)`,
        }}
      />
    </div>
  );
};

/* ---------- 1. 일행 차량 도로 (AI b-roll 자리) ---------- */
export const Convoy: React.FC<{broll: string | null}> = ({broll}) => {
  const t = useT();
  const tall = useTall();
  const {width, height} = useVideoConfig();
  if (broll) {
    return (
      <AbsoluteFill>
        <OffthreadVideo src={staticFile(broll)} muted style={{width, height, objectFit: 'cover'}} />
        <ConvoyCaption tall={tall} />
      </AbsoluteFill>
    );
  }
  // 기본: 해 질 녘 고속도로를 달리는 일행 차 4대(픽셀 그림)
  const roadY = tall ? 1120 : 700;
  const px = tall ? 9 : 12;
  const kinds: ('car' | 'bus')[] = ['car', 'car', 'car', 'car'];
  const gap = tall ? 260 : 420;
  const x0 = width / 2 + 1.5 * gap - 9 * px + t * 30 - (tall ? 0 : 60);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #1B1E3A 0%, #4A2E52 38%, #C2553A 64%, #FF9A4A 75%, #FF9A4A 100%)'}} />
      <div
        style={{
          position: 'absolute',
          left: width * 0.62 - 90,
          top: roadY - 300 + t * 10,
          width: 180,
          height: 180,
          background: '#FFD27A',
          boxShadow: '0 0 120px #FFB45Acc',
          imageRendering: 'pixelated',
          clipPath: 'polygon(30% 0,70% 0,70% 10%,90% 10%,90% 30%,100% 30%,100% 70%,90% 70%,90% 90%,70% 90%,70% 100%,30% 100%,30% 90%,10% 90%,10% 70%,0 70%,0 30%,10% 30%,10% 10%,30% 10%)',
        }}
      />
      <svg width={width} height={260} viewBox="0 0 64 13" preserveAspectRatio="none" shapeRendering="crispEdges" style={{position: 'absolute', left: -((t * 20) % 40), top: roadY - 250, width: width + 80}}>
        <path d="M0 13 V8 h4 v-2 h3 v-3 h4 v2 h3 v3 h5 v-4 h3 v-2 h4 v3 h3 v2 h4 v-5 h3 v3 h5 v2 h4 v-3 h3 v3 h4 v2 h3 V13 Z" fill="#2A1F3A" />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: roadY, bottom: 0, background: '#15171A'}} />
      <Road y={roadY} h={tall ? 300 : 260} speed={420} />
      {kinds.map((k, i) => {
        const bob = Math.round(Math.sin(t * 9 + i) * 1.2) * px * 0.5;
        return (
          <div key={i} style={{position: 'absolute', left: x0 - i * gap, top: roadY + (tall ? 150 : 130) - 10 * px + bob}}>
            <Vehicle kind={k} color={VEH_COLORS[i]} px={px} />
          </div>
        );
      })}
      <ConvoyCaption tall={tall} />
    </AbsoluteFill>
  );
};

const ConvoyCaption: React.FC<{tall: boolean}> = ({tall}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: tall ? 420 : 220, textAlign: 'center'}}>
    <Pop at={0.4} blip={false}>
      <div style={{fontFamily: FONT_B, fontSize: tall ? 64 : 72, color: C.paper, textShadow: '0 4px 0 #0008'}}>여러 대가 함께 가는 길</div>
    </Pop>
    <Pop at={1.1} blip={false}>
      <div style={{fontFamily: FONT, fontSize: tall ? 40 : 40, color: '#FFE3C8', marginTop: 18, textShadow: '0 3px 0 #0008'}}>명절 귀성길 · 수학여행 버스</div>
    </Pop>
  </div>
);

/* ---------- 2. 이름 소개: 뻐꾸기시계 ---------- */
export const Clock: React.FC<{dur: number}> = ({dur}) => {
  const k = dur / 6;
  const t = useT() / k;
  const tall = useTall();
  const {width} = useVideoConfig();
  const door = useSpring(0.5 * k, 12, 140);
  const out = useSpring(0.65 * k, 9, 120);
  const back = ramp(t, 5.0, 5.6);
  const S = tall ? 1.4 : 1;
  const cx = tall ? width / 2 : 560;
  const cy = tall ? 720 : 520;
  const bubble = (at: number) => ramp(t, at, at + 0.08) * (1 - ramp(t, at + 0.55, at + 0.7));
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: tall ? '50%' : '30%', y: tall ? '36%' : '50%'}} />
      <Brand tall={tall} />
      <Sfx name="cuckoo" at={1.05 * k} volume={0.85} />
      <Sfx name="cuckoo" at={1.95 * k} volume={0.7} />
      {/* 시계 집 */}
      <div style={{position: 'absolute', left: cx - 230 * S, top: cy - 300 * S, width: 460 * S, height: 600 * S}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 0, height: 0, borderLeft: `${230 * S}px solid transparent`, borderRight: `${230 * S}px solid transparent`, borderBottom: `${150 * S}px solid #6B3A1E`}} />
        <div style={{position: 'absolute', left: 30 * S, top: 150 * S, width: 400 * S, height: 330 * S, background: '#8A4B26', border: `${8 * S}px solid #4A2812`}} />
        {/* 문틀 */}
        <div style={{position: 'absolute', left: 150 * S, top: 175 * S, width: 160 * S, height: 130 * S, background: '#1A0E07', border: `${6 * S}px solid #4A2812`}} />
        {/* 시계판 */}
        <div style={{position: 'absolute', left: 145 * S, top: 330 * S, width: 170 * S, height: 130 * S, background: C.lcd, border: `${6 * S}px solid #4A2812`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_B, fontSize: 52 * S, color: C.lcdInk}}>
          {t < 1 ? '07:59' : '08:00'}
        </div>
        {/* 추 */}
        {[120, 300].map((x, i) => (
          <div key={i} style={{position: 'absolute', left: x * S, top: 480 * S, width: 8 * S, height: (60 + Math.sin(t * 3 + i) * 10) * S, background: '#C9A24A'}}>
            <div style={{position: 'absolute', left: -14 * S, bottom: -40 * S, width: 36 * S, height: 44 * S, background: '#C9A24A', border: `${4 * S}px solid #7A5A1A`}} />
          </div>
        ))}
        {/* 마스코트 튀어나옴 */}
        <div style={{position: 'absolute', left: 230 * S - 96, top: 175 * S - 30 + (1 - out * (1 - back)) * 60, opacity: out > 0.02 ? 1 : 0, transform: `scale(${0.6 + 0.4 * out})`}}>
          <Sprite mood={t > 0.9 && t < 5.0 ? 'talk' : 'base'} scale={3} fps={10} />
        </div>
        {/* 문짝 */}
        <div style={{position: 'absolute', left: 150 * S, top: 175 * S, width: 80 * S, height: 130 * S, background: '#A5612F', border: `${4 * S}px solid #4A2812`, transformOrigin: 'left center', transform: `perspective(600px) rotateY(${-100 * door * (1 - back)}deg)`}} />
        <div style={{position: 'absolute', left: 230 * S, top: 175 * S, width: 80 * S, height: 130 * S, background: '#A5612F', border: `${4 * S}px solid #4A2812`, transformOrigin: 'right center', transform: `perspective(600px) rotateY(${100 * door * (1 - back)}deg)`}} />
        {/* 말풍선 */}
        {[1.05, 1.95].map((at, i) => (
          <div key={i} style={{position: 'absolute', left: (i ? 360 : -150) * S, top: (i ? 40 : 60) * S, opacity: bubble(at), transform: `scale(${0.7 + 0.3 * bubble(at)})`}}>
            <Chip size={44 * S} color={C.paper} ink={C.bg}>
              뻐꾹!
            </Chip>
          </div>
        ))}
      </div>
      {/* 이름 뜻 */}
      <div style={tall ? {position: 'absolute', left: 64, right: 64, top: 1340, textAlign: 'center'} : {position: 'absolute', left: 940, right: 80, top: 330}}>
        <Pop at={0.1}>
          <Chip size={tall ? 34 : 28}>그래서, 뻐꾸기</Chip>
        </Pop>
        <Pop at={1.9 * k} blip={false}>
          <div style={{fontFamily: FONT_B, fontSize: tall ? 54 : 52, color: C.paper, lineHeight: 1.35, marginTop: 30, wordBreak: 'keep-all'}}>
            뻐꾸기시계가 때맞춰
            <br />
            <span style={{color: C.orange}}>"뻐꾹"</span> 하고 알리듯
          </div>
        </Pop>
        <Pop at={2.8 * k} blip={false}>
          <div style={{fontFamily: FONT, fontSize: tall ? 42 : 38, color: C.paper, lineHeight: 1.45, marginTop: 30, wordBreak: 'keep-all'}}>
            차가 필요한 순간,
            <br />
            일행에게 소식을 전하는 앱
          </div>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 3. 로고 ---------- */
export const Logo: React.FC<{outro?: boolean}> = ({outro}) => {
  const tall = useTall();
  const p = useSpring(0.1, 11, 130);
  const t = useT();
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: tall ? '42%' : '45%'}} />
      {outro ? <Sfx name="cuckoo" at={0.3} volume={0.6} /> : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: tall ? 470 : 120, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{transform: `scale(${p}) translateY(${Math.round(Math.sin(t * 4) * 2) * 4}px)`}}>
          <Sprite mood={outro ? 'talk' : 'tx'} scale={tall ? 6 : 5} />
        </div>
        <Pop at={0.35} blip={false}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 28, marginTop: tall ? 30 : 10}}>
            <div style={{fontFamily: FONT_B, fontSize: tall ? 170 : 150, color: C.orange, lineHeight: 1, textShadow: `0 8px 0 #7A2E08`}}>뻐꾸기</div>
            <div style={{fontFamily: FONT_B, fontSize: tall ? 52 : 48, color: C.muted}}>Cuckoo</div>
          </div>
        </Pop>
        <Pop at={0.9}>
          <div
            style={{
              marginTop: tall ? 70 : 44,
              background: C.lcd,
              color: C.lcdInk,
              fontFamily: FONT_B,
              fontSize: tall ? 50 : 54,
              padding: tall ? '26px 34px' : '20px 48px',
              borderRadius: 6,
              boxShadow: `0 0 0 6px ${C.bg}, 0 0 0 10px ${C.lcd}66, 0 0 60px ${C.lcd}44`,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {ONE_LINER}
          </div>
        </Pop>
        <Pop at={1.4} blip={false}>
          <div style={{fontFamily: FONT_B, fontSize: tall ? 46 : 40, color: C.paper, marginTop: tall ? 56 : 38}}>{SUBTITLE}</div>
        </Pop>
        <Pop at={1.8} blip={false}>
          <div style={{fontFamily: FONT, fontSize: tall ? 34 : 28, color: C.muted, marginTop: 18}}>급제동 · 처짐 · 도착 자동 무전</div>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 6. 서비스 개념: 사람 무전 + 자동 무전 ---------- */
export const Concept: React.FC<{dur: number}> = ({dur}) => {
  const t = useT();
  const tall = useTall();
  const {width} = useVideoConfig();
  const k = dur / 11.5;
  const kinds: ('car' | 'bus')[] = ['car', 'car', 'bus', 'bus'];
  const px = tall ? 7 : 10;
  const gap = tall ? 255 : 420;
  const roadY = tall ? 640 : 430;
  const vy = roadY + 40;
  const press = 0.8 * k;
  const phase2 = 4.9 * k;
  const ev = [5.4 * k, 7.3 * k, 9.2 * k];
  const lag = ramp(t, ev[1], ev[1] + 0.6) * (tall ? 90 : 130) * (1 - ramp(t, ev[2], ev[2] + 0.5));
  const arrive = ramp(t, ev[2], ev[2] + 0.8);
  const widths = kinds.map((kd) => (kd === 'car' ? 18 : 26) * px);
  const xs = kinds.map((_, i) => width / 2 + 1.5 * gap - i * gap - widths[i] / 2 - arrive * (tall ? 40 : 60));
  const center = (i: number) => xs[i] + widths[i] / 2 - (i === 3 ? lag : 0);
  const p1 = 1 - ramp(t, phase2 - 0.3, phase2);
  const p2 = ramp(t, phase2, phase2 + 0.3);
  const btn = useSpring(press, 8, 300);
  const pressed = t >= press && t < press + 1.6 * k;
  const brakeOn = t >= ev[0] && t < ev[0] + 1.5 * k;

  const tag = (i: number): {txt: string; color: string} | null => {
    if (t >= press + 0.4 && t < phase2 - 0.2 && i > 0) return {txt: 'RX', color: C.rx};
    if (brakeOn && i > 1) return {txt: '급제동 콜', color: C.tx};
    if (t >= ev[1] + 0.3 && t < ev[2] && i === 0) return {txt: '꼬리 콜', color: C.orange};
    if (t >= ev[2] + 0.6) return {txt: '도착', color: C.rx};
    return null;
  };

  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: '40%'}} />
      <Brand tall={tall} />
      <div style={{position: 'absolute', left: tall ? 48 : 80, right: tall ? 48 : 80, top: tall ? 140 : 70}}>
        <Pop at={0.1}>
          <Chip size={tall ? 34 : 28}>뻐꾸기의 무전</Chip>
        </Pop>
        <div style={{position: 'relative', height: tall ? 200 : 100}}>
          <div style={{position: 'absolute', opacity: p1, fontFamily: FONT_B, fontSize: tall ? 66 : 62, color: C.paper, marginTop: 24, lineHeight: 1.2}}>
            사람 무전 <span style={{color: C.orange}}>· 버튼 한 번</span>
          </div>
          <div style={{position: 'absolute', opacity: p2, fontFamily: FONT_B, fontSize: tall ? 66 : 62, color: C.paper, marginTop: 24, lineHeight: 1.2, wordBreak: 'keep-all'}}>
            말이 없을 땐 <span style={{color: C.orange}}>차가 대신 무전</span>
          </div>
        </div>
      </div>
      <Road y={roadY} h={tall ? 200 : 220} speed={arrive > 0 ? 300 * (1 - arrive) : 300} />
      {/* 휴게소 표지 */}
      <div style={{position: 'absolute', left: width - (tall ? 150 : 230) + (1 - arrive) * 300, top: roadY - (tall ? 150 : 170), opacity: arrive}}>
        <Chip size={tall ? 28 : 32} color="#2E7D4F" ink={C.paper}>
          휴게소
        </Chip>
      </div>
      {kinds.map((kd, i) => {
        const tg = tag(i);
        return (
          <div key={i} style={{position: 'absolute', left: xs[i] - (i === 3 ? lag : 0), top: vy, width: widths[i]}}>
            <div style={{fontFamily: FONT_B, fontSize: tall ? 26 : 28, color: C.paper, textAlign: 'center', marginBottom: 8}}>
              {kd === 'bus' ? '버스' : `${i + 1}호차`}
            </div>
            <Vehicle kind={kd} color={kd === 'bus' ? '#F2B33A' : VEH_COLORS[i]} px={px} brake={i === 1 && brakeOn} />
            {tg ? (
              <div style={{position: 'absolute', left: '50%', top: -(tall ? 86 : 96), transform: 'translateX(-50%)'}}>
                <Chip size={tall ? 24 : 26} color={tg.color} ink={tg.color === C.rx ? C.bg : C.paper}>
                  {tg.txt}
                </Chip>
              </div>
            ) : null}
          </div>
        );
      })}
      {/* 전파 */}
      <div style={{position: 'absolute', left: center(0), top: vy + 50}}>
        <Waves at={press + 0.1} color={C.orange} size={tall ? 1100 : 1700} count={3} />
      </div>
      <div style={{position: 'absolute', left: center(1), top: vy + 50}}>
        <Waves at={ev[0]} color={C.tx} size={tall ? 900 : 1300} />
      </div>
      <div style={{position: 'absolute', left: center(3), top: vy + 50}}>
        <Waves at={ev[1] + 0.2} color={C.orange} size={tall ? 900 : 1300} />
      </div>
      <div style={{position: 'absolute', left: width / 2, top: vy + 50}}>
        <Waves at={ev[2] + 0.4} color={C.rx} size={tall ? 1100 : 1700} />
      </div>
      {/* 아래: 단계 1 무전 버튼 / 단계 2 자동 콜 세 가지 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: tall ? 1020 : 790, display: 'flex', justifyContent: 'center', opacity: p1}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 36, flexDirection: tall ? 'column' : 'row'}}>
          <div
            style={{
              width: tall ? 360 : 300,
              height: tall ? 150 : 120,
              borderRadius: 14,
              background: pressed ? C.tx : C.panel,
              border: `5px solid ${pressed ? C.tx : C.orange}`,
              boxShadow: pressed ? `0 0 50px ${C.tx}` : `0 10px 0 #000`,
              transform: `translateY(${pressed ? 8 : 0}px) scale(${0.9 + 0.1 * btn})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FONT_B,
              fontSize: tall ? 64 : 56,
              color: C.paper,
            }}
          >
            {pressed ? 'TX 무전' : '무전'}
          </div>
          <div style={{fontFamily: FONT_B, fontSize: tall ? 44 : 40, color: C.paper, opacity: ramp(t, press + 0.4, press + 0.7), textAlign: 'center'}}>
            누르고 말하면 <span style={{color: C.rx}}>전 차량 동시 수신</span>
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: tall ? 1020 : 800, display: 'flex', justifyContent: 'center', gap: tall ? 20 : 36, opacity: p2, flexDirection: tall ? 'column' : 'row', alignItems: 'center'}}>
        {[
          ['급제동', '앞차 급제동 거리 안내', C.tx],
          ['처짐', '대열 2km 이상 처짐', C.orange],
          ['도착', '휴게소 도착 보고', C.rx],
        ].map(([a, b, col], i) => {
          const on = t >= ev[i];
          return (
            <div
              key={i}
              style={{
                width: tall ? 820 : 540,
                padding: tall ? '20px 28px' : '22px 26px',
                borderRadius: 10,
                background: on ? C.panel : '#16191C',
                border: `4px solid ${on ? col : C.line}`,
                opacity: on ? 1 : 0.45,
                transform: `scale(${on ? 1 : 0.96})`,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{fontFamily: FONT_B, fontSize: tall ? 44 : 44, color: col as string}}>{a}</span>
              <span style={{fontFamily: FONT, fontSize: tall ? 32 : 30, color: C.paper}}>{b}</span>
            </div>
          );
        })}
      </div>
      {tall ? <div style={{position: 'absolute', left: 540 - 128, top: 1580}}><Sprite mood={t < phase2 ? 'tx' : t < ev[2] ? 'brake' : 'arrive'} scale={4} /></div> : null}
      <Sfx name="ptt" at={press} volume={0.6} />
      <Sfx name="roger" at={press + 1.6 * k} volume={0.45} />
      <Sfx name="whoosh" at={phase2 - 0.2} volume={0.25} />
      <Sfx name="alert" at={ev[0]} volume={0.45} />
      <Sfx name="ptt" at={ev[1] + 0.2} volume={0.5} />
      <Sfx name="roger" at={ev[2] + 0.5} volume={0.45} />
    </AbsoluteFill>
  );
};

/* ---------- 7. 차라서 가능한 것 (5초) ---------- */
export const Sdk: React.FC = () => {
  const tall = useTall();
  const items = [
    ['차량 신호', 'Vehicle', '급제동·도착 자동 무전', C.orange],
    ['순정 내비', 'NaviHelper', '투표 결과 경유지 등록', '#4A90E2'],
    ['스피커·마이크', 'TextToSpeech · SpeechToText', '손 안 쓰는 음성 무전', C.lcd],
    ['차량 위치', 'FusedLocation', '차량 간 거리·처짐 안내', '#5DBB63'],
  ];
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: '55%'}} />
      <Brand tall={tall} />
      <div style={{position: 'absolute', left: tall ? 48 : 80, top: tall ? 140 : 70, right: 48}}>
        <Pop at={0.05}>
          <Chip size={tall ? 34 : 28}>Pleos SDK</Chip>
        </Pop>
        <Pop at={0.15} blip={false}>
          <div style={{fontFamily: FONT_B, fontSize: tall ? 72 : 72, color: C.paper, marginTop: 22}}>
            차라서 <span style={{color: C.orange}}>가능한 것</span>
          </div>
        </Pop>
      </div>
      <div style={{position: 'absolute', left: tall ? 48 : 80, right: tall ? 48 : 80, top: tall ? 470 : 330, display: 'grid', gridTemplateColumns: tall ? '1fr' : 'repeat(4, 1fr)', gap: tall ? 26 : 26}}>
        {items.map(([res, sdk, fn, col], i) => (
          <Pop key={i} at={0.4 + i * 0.22} dy={40}>
            <div style={{background: C.panel, border: `3px solid ${C.line}`, borderTop: `10px solid ${col}`, borderRadius: 10, padding: tall ? '26px 30px' : '36px 30px', height: tall ? 'auto' : 440, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center'}}>
              <div style={{fontFamily: FONT_B, fontSize: tall ? 48 : 46, color: col as string}}>{res}</div>
              <div style={{fontFamily: FONT, fontSize: tall ? 26 : 24, color: C.muted}}>{sdk}</div>
              {!tall ? <div style={{fontFamily: FONT_B, fontSize: 52, color: col as string, margin: '8px 0'}}>↓</div> : null}
              <div style={{fontFamily: FONT_B, fontSize: tall ? 38 : 38, color: C.paper, lineHeight: 1.35, wordBreak: 'keep-all'}}>{fn}</div>
            </div>
          </Pop>
        ))}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: tall ? 120 : 70, textAlign: 'center'}}>
        <Pop at={1.6} blip={false}>
          <div style={{fontFamily: FONT_B, fontSize: tall ? 40 : 38, color: C.paper}}>핸즈프리 · 화면을 보지 않아도 들리는 무전</div>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 8. 쓰임새 ---------- */
export const UseCase: React.FC = () => {
  const tall = useTall();
  const t = useT();
  const Panel: React.FC<{at: number; badge: string; badgeColor: string; title: string; lines: string[]; kind: 'car' | 'bus'; foot?: string}> = ({
    at,
    badge,
    badgeColor,
    title,
    lines,
    kind,
    foot,
  }) => (
    <Pop at={at} dy={50}>
      <div style={{background: C.panel, border: `3px solid ${C.line}`, borderRadius: 14, padding: 40, height: tall ? 640 : 700, position: 'relative', overflow: 'hidden'}}>
        <Chip size={26} color={badgeColor} ink={badgeColor === C.lcd ? C.lcdInk : C.paper}>
          {badge}
        </Chip>
        <div style={{fontFamily: FONT_B, fontSize: 64, color: C.paper, marginTop: 28}}>{title}</div>
        <div style={{display: 'flex', gap: 18, margin: '48px 0', height: 130, alignItems: 'flex-end', transform: `translateX(${(t * 40) % 40 - 20}px)`}}>
          {[0, 1, 2, 3].map((i) => (
            <Vehicle key={i} kind={kind} color={kind === 'bus' ? '#F2B33A' : VEH_COLORS[i]} px={kind === 'bus' ? 6 : 8} />
          ))}
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{fontFamily: FONT, fontSize: 38, color: C.paper, lineHeight: 1.65}}>
            · {l}
          </div>
        ))}
        {foot ? <div style={{fontFamily: FONT, fontSize: 28, color: C.orange, marginTop: 24}}>{foot}</div> : null}
      </div>
    </Pop>
  );
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: '55%'}} />
      <Brand />
      <div style={{position: 'absolute', left: 80, top: 70}}>
        <Pop at={0.1}>
          <Chip size={28}>쓰임새</Chip>
        </Pop>
      </div>
      <div style={{position: 'absolute', left: 80, right: 80, top: 170, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40}}>
        <Panel at={0.4} badge="구현 · 시연 완료" badgeColor={C.lcd} title="가족 귀성길" kind="car" lines={['친척 차 4대 동시 무전', '급제동·처짐·도착 자동 무전', '키즈 채널 · 휴게소 투표']} />
        <Panel
          at={1.2}
          badge="적용 예시"
          badgeColor={C.orange}
          title="수학여행 단체 버스"
          kind="bus"
          lines={['인솔 교사의 전 버스 동시 무전', '앞 버스 급제동 · 뒤 버스 처짐 안내', '같은 휴게소 경유지 등록']}
          foot="버스의 Pleos 탑재 여부는 확인 전입니다."
        />
      </div>
    </AbsoluteFill>
  );
};

export const Outro: React.FC = () => <Logo outro />;

