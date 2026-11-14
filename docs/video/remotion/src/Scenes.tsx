import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig} from 'remotion';
import {Backdrop, Brand, BUS, C, Chip, FONT, FONT_B, Grille, Led, PinCard, Pop, ramp, Road, SERIF, Sfx, Sprite, useSpring, useT, useTall, VEH_COLORS, Vehicle, WaveBars, Waves} from './theme';

const ONE_LINER = '버튼 한 번, 일행 차·버스 동시 무전';
const SUBTITLE = 'Pleos 차량용 단체 무전 앱';

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
  // 기본: 해 질 녘 길을 달리는 일행 차 4대(벡터 그림)
  const roadY = tall ? 1120 : 700;
  const px = tall ? 9 : 12;
  const gap = tall ? 260 : 420;
  const x0 = width / 2 + 1.5 * gap - 9 * px + t * 30 - (tall ? 0 : 60);
  const hill = (y: number, amp: number, col: string, sp: number) => (
    <svg width={width + 400} height={360} viewBox={`0 0 ${width + 400} 360`} style={{position: 'absolute', left: -((t * sp) % 400), top: y}}>
      <path d={`M0 360 V180 ${Array.from({length: 12}).map((_, i) => `Q ${i * 200 + 100} ${180 - (i % 2 ? amp : -amp * 0.3)} ${(i + 1) * 200} 180`).join(' ')} V360 Z`} fill={col} />
    </svg>
  );
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #fff3ea 0%, #ffe1cf 45%, #ffc9ae 72%)'}} />
      <div style={{position: 'absolute', left: width * 0.66 - 110, top: roadY - 380 + t * 10, width: 220, height: 220, borderRadius: '50%', background: '#ffbf1f', boxShadow: '0 0 0 40px #ffbf1f22, 0 0 140px #ff7a1a66'}} />
      {hill(roadY - 330, 90, '#ffb79c', 14)}
      {hill(roadY - 250, 70, '#ff9e86', 26)}
      <div style={{position: 'absolute', left: 0, right: 0, top: roadY, bottom: 0, background: '#f7ece4'}} />
      <Road y={roadY} h={tall ? 300 : 260} speed={420} />
      {[0, 1, 2, 3].map((i) => {
        const bob = Math.sin(t * 9 + i) * px * 0.4;
        return (
          <div key={i} style={{position: 'absolute', left: x0 - i * gap, top: roadY + (tall ? 150 : 130) - 10 * px + bob}}>
            <Vehicle kind="car" color={VEH_COLORS[i]} px={px} />
          </div>
        );
      })}
      <ConvoyCaption tall={tall} />
    </AbsoluteFill>
  );
};

const ConvoyCaption: React.FC<{tall: boolean}> = ({tall}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: tall ? 420 : 200, textAlign: 'center'}}>
    <Pop at={0.4} blip={false} style={{transformOrigin: 'center'}}>
      <div style={{fontFamily: SERIF, fontSize: tall ? 72 : 84, color: C.ink}}>여러 대가 함께 가는 길</div>
    </Pop>
    <Pop at={1.1} blip={false} style={{transformOrigin: 'center'}}>
      <div style={{fontFamily: FONT, fontSize: 40, color: C.ink2, marginTop: 18}}>명절 귀성길 · 수학여행 버스</div>
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
  const wood = C.orange;
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: tall ? '50%' : '30%', y: tall ? '36%' : '50%'}} />
      <Brand tall={tall} />
      <Sfx name="cuckoo" at={1.05 * k} volume={0.85} />
      <Sfx name="cuckoo" at={1.95 * k} volume={0.7} />
      {/* 시계 집 */}
      <div style={{position: 'absolute', left: cx - 230 * S, top: cy - 300 * S, width: 460 * S, height: 600 * S}}>
        <svg width={460 * S} height={170 * S} viewBox="0 0 460 170" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <path d="M30 160 L210 18 Q230 2 250 18 L430 160 Q440 170 426 170 L34 170 Q20 170 30 160 Z" fill={VEH_COLORS[0]} />
          <circle cx={230} cy={70} r={12} fill={C.paper} opacity={0.85} />
        </svg>
        <div style={{position: 'absolute', left: 30 * S, top: 150 * S, width: 400 * S, height: 330 * S, background: C.paper, borderRadius: 34 * S, border: `${1.5 * S}px solid ${C.line}`, boxShadow: C.shadow}} />
        {/* 문틀 */}
        <div style={{position: 'absolute', left: 150 * S, top: 175 * S, width: 160 * S, height: 130 * S, background: C.lcd, borderRadius: 22 * S}} />
        {/* 시계판: 무전기 LCD */}
        <div style={{position: 'absolute', left: 135 * S, top: 330 * S, width: 190 * S, height: 120 * S, background: C.lcd, borderRadius: 22 * S, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_B, fontSize: 50 * S, letterSpacing: '0.04em', color: C.lcdInk, boxShadow: '0 8px 20px rgba(42,34,48,.18)'}}>
          {t < 1 ? '07:59' : '08:00'}
        </div>
        <Grille w={70 * S} h={60 * S} dot={12 * S} style={{position: 'absolute', left: 50 * S, top: 360 * S}} />
        <Grille w={70 * S} h={60 * S} dot={12 * S} style={{position: 'absolute', left: 340 * S, top: 360 * S}} />
        {/* 추 */}
        {[130, 310].map((x, i) => (
          <div key={i} style={{position: 'absolute', left: x * S, top: 480 * S, width: 6 * S, height: (60 + Math.sin(t * 3 + i) * 10) * S, background: C.ink3, borderRadius: 3 * S}}>
            <div style={{position: 'absolute', left: -17 * S, bottom: -40 * S, width: 40 * S, height: 46 * S, borderRadius: 14 * S, background: i ? VEH_COLORS[2] : VEH_COLORS[3]}} />
          </div>
        ))}
        {/* 마스코트 튀어나옴 */}
        <div style={{position: 'absolute', left: 230 * S - 96, top: 175 * S - 50 + (1 - out * (1 - back)) * 70, opacity: out > 0.02 ? 1 : 0, transform: `scale(${0.6 + 0.4 * out})`}}>
          <Sprite mood={t > 0.9 && t < 5.0 ? 'talk' : 'base'} scale={3} />
        </div>
        {/* 문짝 */}
        <div style={{position: 'absolute', left: 150 * S, top: 175 * S, width: 80 * S, height: 130 * S, background: wood, borderRadius: `${22 * S}px 0 0 ${22 * S}px`, transformOrigin: 'left center', transform: `perspective(600px) rotateY(${-100 * door * (1 - back)}deg)`}} />
        <div style={{position: 'absolute', left: 230 * S, top: 175 * S, width: 80 * S, height: 130 * S, background: '#ff9447', borderRadius: `0 ${22 * S}px ${22 * S}px 0`, transformOrigin: 'right center', transform: `perspective(600px) rotateY(${100 * door * (1 - back)}deg)`}} />
        {/* 말풍선 */}
        {[1.05, 1.95].map((at, i) => (
          <div key={i} style={{position: 'absolute', left: (i ? 360 : -150) * S, top: (i ? 40 : 60) * S, opacity: bubble(at), transform: `scale(${0.7 + 0.3 * bubble(at)}) rotate(${i ? 4 : -4}deg)`}}>
            <Chip size={44 * S} color={C.paper} ink={C.ink} style={{fontFamily: SERIF, border: `2px solid ${C.line}`}}>
              뻐꾹!
            </Chip>
          </div>
        ))}
      </div>
      {/* 이름 뜻 */}
      <div style={tall ? {position: 'absolute', left: 64, right: 64, top: 1340, textAlign: 'center'} : {position: 'absolute', left: 940, right: 80, top: 320}}>
        <Pop at={0.1} style={{transformOrigin: tall ? 'center' : 'left center'}}>
          <Chip size={tall ? 32 : 26}>그래서, 뻐꾸기</Chip>
        </Pop>
        <Pop at={1.9 * k} blip={false}>
          <div style={{fontFamily: SERIF, fontSize: tall ? 60 : 60, color: C.ink, lineHeight: 1.3, marginTop: 30, wordBreak: 'keep-all'}}>
            뻐꾸기시계가 때맞춰
            <br />
            <span style={{color: C.orange}}>"뻐꾹"</span> 하고 알리듯
          </div>
        </Pop>
        <Pop at={2.8 * k} blip={false}>
          <div style={{fontFamily: FONT, fontSize: tall ? 40 : 38, color: C.ink2, lineHeight: 1.5, marginTop: 28, wordBreak: 'keep-all'}}>
            필요한 순간에
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
      <div style={{position: 'absolute', left: 0, right: 0, top: tall ? 440 : 110, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{position: 'relative', transform: `scale(${p}) translateY(${Math.sin(t * 4) * 6}px)`}}>
          <div style={{position: 'absolute', left: '50%', top: '55%'}}>
            <Waves at={0.4} color={C.orange} size={tall ? 700 : 600} />
          </div>
          <Sprite mood={outro ? 'talk' : 'tx'} scale={tall ? 5 : 4} />
        </div>
        <Pop at={0.35} blip={false} style={{transformOrigin: 'center'}}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 28, marginTop: tall ? 20 : 4}}>
            <div style={{fontFamily: SERIF, fontSize: tall ? 180 : 160, color: C.ink, lineHeight: 1.05, letterSpacing: '-0.03em'}}>뻐꾸기</div>
            <div style={{fontFamily: SERIF, fontSize: tall ? 52 : 46, color: C.ink3}}>Cuckoo</div>
          </div>
        </Pop>
        <Pop at={0.9} style={{transformOrigin: 'center'}}>
          <div
            style={{
              marginTop: tall ? 60 : 36,
              background: C.lcd,
              color: C.lcdInk,
              fontFamily: FONT_B,
              fontSize: tall ? 46 : 50,
              letterSpacing: '0.02em',
              padding: tall ? '24px 36px' : '20px 44px',
              borderRadius: 26,
              boxShadow: '0 14px 30px rgba(42,34,48,.22)',
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{fontSize: '0.5em', color: C.lcdDim, letterSpacing: '0.14em'}}>CH</span>
            {ONE_LINER}
            <WaveBars on={t > 1.0} color={C.lcdInk} h={tall ? 34 : 34} n={5} />
          </div>
        </Pop>
        <Pop at={1.4} blip={false} style={{transformOrigin: 'center'}}>
          <div style={{fontFamily: SERIF, fontSize: tall ? 48 : 42, color: C.ink, marginTop: tall ? 56 : 36}}>{SUBTITLE}</div>
        </Pop>
        <Pop at={1.8} blip={false} style={{transformOrigin: 'center'}}>
          <div style={{display: 'flex', gap: 14, marginTop: 20}}>
            {[
              ['급제동', C.tx],
              ['처짐', C.orange],
              ['도착', C.rx],
            ].map(([w, col]) => (
              <Chip key={w} size={tall ? 30 : 26} color={col} ink={C.paper}>
                {w}
              </Chip>
            ))}
            <span style={{fontFamily: FONT, fontSize: tall ? 32 : 28, color: C.ink2, alignSelf: 'center', marginLeft: 6}}>자동 무전</span>
          </div>
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
          <Chip size={tall ? 32 : 26}>뻐꾸기의 무전</Chip>
        </Pop>
        <div style={{position: 'relative', height: tall ? 200 : 100}}>
          <div style={{position: 'absolute', opacity: p1, fontFamily: SERIF, fontSize: tall ? 68 : 64, color: C.ink, marginTop: 24, lineHeight: 1.2}}>
            사람 무전 <span style={{color: C.orange}}>· 버튼 한 번</span>
          </div>
          <div style={{position: 'absolute', opacity: p2, fontFamily: SERIF, fontSize: tall ? 68 : 64, color: C.ink, marginTop: 24, lineHeight: 1.2, wordBreak: 'keep-all'}}>
            말이 없을 땐 <span style={{color: C.orange}}>차가 대신 무전</span>
          </div>
        </div>
      </div>
      <Road y={roadY} h={tall ? 200 : 220} speed={arrive > 0 ? 300 * (1 - arrive) : 300} />
      {/* 휴게소 표지 */}
      <div style={{position: 'absolute', left: width - (tall ? 170 : 250) + (1 - arrive) * 300, top: roadY - (tall ? 150 : 170), opacity: arrive}}>
        <Chip size={tall ? 28 : 32} color={C.rx} ink={C.paper}>
          휴게소
        </Chip>
      </div>
      {kinds.map((kd, i) => {
        const tg = tag(i);
        return (
          <div key={i} style={{position: 'absolute', left: xs[i] - (i === 3 ? lag : 0), top: vy, width: widths[i]}}>
            <div style={{fontFamily: FONT_B, fontSize: tall ? 26 : 28, color: C.ink, textAlign: 'center', marginBottom: 8}}>{kd === 'bus' ? '버스' : `${i + 1}호차`}</div>
            <Vehicle kind={kd} color={kd === 'bus' ? BUS : VEH_COLORS[i]} px={px} brake={i === 1 && brakeOn} />
            {tg ? (
              <div style={{position: 'absolute', left: '50%', top: -(tall ? 86 : 96), transform: 'translateX(-50%)'}}>
                <Chip size={tall ? 24 : 26} color={tg.color} ink={C.paper}>
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
      <div style={{position: 'absolute', left: 0, right: 0, top: tall ? 1020 : 780, display: 'flex', justifyContent: 'center', opacity: p1}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 40, flexDirection: tall ? 'column' : 'row', background: C.lcd, borderRadius: 40, padding: tall ? '30px 40px' : '22px 26px 22px 40px', boxShadow: '0 18px 40px rgba(42,34,48,.22)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONT_B, fontSize: tall ? 40 : 36, color: C.lcdInk, whiteSpace: 'nowrap'}}>
            <Led color={pressed ? C.tx : C.rx} size={16} />
            <span>{pressed ? 'TX 송신 중' : '누르고 말하기'}</span>
            <WaveBars on={pressed} color={C.lcdInk} h={34} n={6} />
          </div>
          <div
            style={{
              width: tall ? 380 : 330,
              height: tall ? 140 : 110,
              borderRadius: 999,
              background: pressed ? `linear-gradient(180deg, #ff5a6e, ${C.tx})` : `linear-gradient(180deg, #ff9a4a, ${C.orange})`,
              boxShadow: pressed ? `0 0 0 10px ${C.tx}44, 0 2px 0 #b8281c` : '0 10px 0 #c4520c, 0 20px 30px rgba(255,122,26,.35)',
              transform: `translateY(${pressed ? 8 : 0}px) scale(${0.9 + 0.1 * btn})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: SERIF,
              fontSize: tall ? 64 : 56,
              letterSpacing: '0.12em',
              color: C.paper,
            }}
          >
            무전
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: tall ? 1240 : 960, textAlign: 'center', fontFamily: FONT_B, fontSize: tall ? 40 : 36, color: C.ink, opacity: p1 * ramp(t, press + 0.4, press + 0.7)}}>
        누르고 말하면 <span style={{color: C.rx}}>전 차량 동시 수신</span>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: tall ? 1020 : 800, display: 'flex', justifyContent: 'center', gap: tall ? 20 : 30, opacity: p2, flexDirection: tall ? 'column' : 'row', alignItems: 'center'}}>
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
                padding: tall ? '22px 30px' : '24px 28px',
                borderRadius: 28,
                background: C.paper,
                border: `${on ? 3 : 1.5}px solid ${on ? col : C.line}`,
                boxShadow: on ? C.shadow : 'none',
                opacity: on ? 1 : 0.5,
                transform: `scale(${on ? 1 : 0.96}) rotate(${on ? 0 : (i - 1) * 1.5}deg)`,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <Chip size={tall ? 32 : 30} color={col as string} ink={C.paper}>
                {a}
              </Chip>
              <span style={{fontFamily: FONT_B, fontSize: tall ? 34 : 30, color: C.ink}}>{b}</span>
            </div>
          );
        })}
      </div>
      {tall ? (
        <div style={{position: 'absolute', left: 540 - 128, top: 1580}}>
          <Sprite mood={t < phase2 ? 'tx' : t < ev[2] ? 'brake' : 'arrive'} scale={4} />
        </div>
      ) : null}
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
    ['차량 신호', 'Vehicle', '급제동·도착 자동 무전', C.tx],
    ['순정 내비', 'NaviHelper', '투표 결과 경유지 등록', C.rx],
    ['스피커·마이크', 'TextToSpeech · SpeechToText', '손 안 쓰는 음성 무전', VEH_COLORS[3]],
    ['차량 위치', 'FusedLocation', '차량 간 거리·처짐 안내', VEH_COLORS[5]],
  ];
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: '55%'}} />
      <Brand tall={tall} />
      <div style={{position: 'absolute', left: tall ? 48 : 80, top: tall ? 140 : 70, right: 48}}>
        <Pop at={0.05}>
          <Chip size={tall ? 32 : 26}>Pleos SDK</Chip>
        </Pop>
        <Pop at={0.15} blip={false}>
          <div style={{fontFamily: SERIF, fontSize: 76, color: C.ink, marginTop: 22}}>
            차라서 <span style={{color: C.orange}}>가능한 것</span>
          </div>
        </Pop>
      </div>
      <div style={{position: 'absolute', left: tall ? 48 : 80, right: tall ? 48 : 80, top: tall ? 470 : 330, display: 'grid', gridTemplateColumns: tall ? '1fr' : 'repeat(4, 1fr)', gap: 30}}>
        {items.map(([res, sdk, fn, col], i) => (
          <PinCard key={i} at={0.4 + i * 0.22} tilt={i % 2 ? 2 : -2} pin={col as string} style={{overflow: 'visible'}}>
            <Sfx name="blip" at={0.4 + i * 0.22} volume={0.25} />
            <div style={{height: 14, background: col as string, borderRadius: '28px 28px 0 0'}} />
            <div style={{padding: tall ? '22px 30px 28px' : '34px 30px', height: tall ? 'auto' : 420, display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center'}}>
              <div style={{fontFamily: SERIF, fontSize: tall ? 50 : 48, color: C.ink}}>{res}</div>
              <div style={{fontFamily: FONT, fontSize: tall ? 24 : 22, color: C.ink2, alignSelf: 'flex-start', background: C.bg, border: `1.5px solid ${C.line}`, borderRadius: 999, padding: '6px 14px'}}>{sdk}</div>
              {!tall ? <div style={{fontFamily: FONT_B, fontSize: 48, color: col as string, margin: '4px 0'}}>↓</div> : null}
              <div style={{fontFamily: FONT_B, fontSize: tall ? 38 : 36, color: col as string, lineHeight: 1.35, wordBreak: 'keep-all'}}>{fn}</div>
            </div>
          </PinCard>
        ))}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: tall ? 120 : 70, textAlign: 'center'}}>
        <Pop at={1.6} blip={false} style={{transformOrigin: 'center'}}>
          <div style={{fontFamily: FONT_B, fontSize: tall ? 40 : 36, color: C.ink}}>화면을 보지 않아도 들리는 무전</div>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 8. 쓰임새 ---------- */
export const UseCase: React.FC = () => {
  const tall = useTall();
  const t = useT();
  const Panel: React.FC<{at: number; badge: string; badgeColor: string; title: string; lines: string[]; kind: 'car' | 'bus'; foot?: string; tilt: number}> = ({
    at,
    badge,
    badgeColor,
    title,
    lines,
    kind,
    foot,
    tilt,
  }) => (
    <PinCard at={at} tilt={tilt} pin={badgeColor} style={{padding: 44, height: tall ? 640 : 700, overflow: 'hidden'}}>
      <Sfx name="blip" at={at} volume={0.28} />
      <Chip size={26} color={badgeColor} ink={C.paper}>
        {badge}
      </Chip>
      <div style={{fontFamily: SERIF, fontSize: 66, color: C.ink, marginTop: 26}}>{title}</div>
      <div style={{display: 'flex', gap: 18, margin: '44px -44px', padding: '0 44px', height: 130, alignItems: 'flex-end', background: '#f7ece4', transform: `translateX(${((t * 40) % 40) - 20}px)`}}>
        {[0, 1, 2, 3].map((i) => (
          <Vehicle key={i} kind={kind} color={kind === 'bus' ? BUS : VEH_COLORS[i]} px={kind === 'bus' ? 6 : 8} />
        ))}
      </div>
      {lines.map((l, i) => (
        <div key={i} style={{fontFamily: FONT, fontSize: 36, color: C.ink, lineHeight: 1.7, display: 'flex', alignItems: 'center', gap: 16}}>
          <span style={{width: 12, height: 12, borderRadius: 6, background: badgeColor, flexShrink: 0}} />
          {l}
        </div>
      ))}
      {foot ? <div style={{fontFamily: FONT, fontSize: 26, color: C.ink2, marginTop: 22}}>{foot}</div> : null}
    </PinCard>
  );
  return (
    <AbsoluteFill>
      <Backdrop glow={{x: '50%', y: '55%'}} />
      <Brand />
      <div style={{position: 'absolute', left: 80, top: 70}}>
        <Pop at={0.1}>
          <Chip size={26}>쓰임새</Chip>
        </Pop>
      </div>
      <div style={{position: 'absolute', left: 80, right: 80, top: 170, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 44}}>
        <Panel at={0.4} tilt={-2} badge="구현 · 시연 완료" badgeColor={C.rx} title="가족 귀성길" kind="car" lines={['친척 차 4대 동시 무전', '급제동·처짐·도착 자동 무전', '키즈 채널 · 휴게소 투표']} />
        <Panel
          at={1.2}
          tilt={2}
          badge="적용 예시"
          badgeColor={C.orange}
          title="수학여행 단체 버스"
          kind="bus"
          lines={['인솔 교사가 전 버스에 동시 무전', '앞 버스 급제동 · 뒤 버스 처짐 안내', '같은 휴게소 경유지 등록']}
          foot="버스의 Pleos 탑재 여부는 확인 전입니다."
        />
      </div>
    </AbsoluteFill>
  );
};

export const Outro: React.FC = () => <Logo outro />;
