import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {Backdrop, Brand, C, Chip, FONT, FONT_B, Grille, PinCard, Pop, ramp, SERIF, Sfx, Sprite, useSpring, useT, useTall, VEH_COLORS, WaveBars, Waves} from './theme';

const ONE_LINER = '버튼 한 번, 일행 차·버스 동시 무전';
const SUBTITLE = 'Pleos 차량용 단체 무전 앱';

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
      <Sfx name="cuckoo" at={1.05 * k} volume={0.5} />
      <Sfx name="cuckoo" at={1.95 * k} volume={0.4} />
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
/** dark: 어둡게 깐 실사 위(끝 장면). 글자를 밝게 바꾼다 */
export const Logo: React.FC<{outro?: boolean; dark?: boolean}> = ({outro, dark}) => {
  const tall = useTall();
  const ink = dark ? C.paper : C.ink;
  const ink2 = dark ? '#e6d9df' : C.ink2;
  const p = useSpring(0.1, 11, 130);
  const t = useT();
  return (
    <AbsoluteFill>
      {dark ? null : <Backdrop glow={{x: '50%', y: tall ? '42%' : '45%'}} />}
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
            <div style={{fontFamily: SERIF, fontSize: tall ? 180 : 160, color: ink, lineHeight: 1.05, letterSpacing: '-0.03em'}}>뻐꾸기</div>
            <div style={{fontFamily: SERIF, fontSize: tall ? 52 : 46, color: dark ? '#cdbfc6' : C.ink3}}>Cuckoo</div>
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
          <div style={{fontFamily: SERIF, fontSize: tall ? 48 : 42, color: ink, marginTop: tall ? 56 : 36}}>{SUBTITLE}</div>
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
            <span style={{fontFamily: FONT, fontSize: tall ? 32 : 28, color: ink2, alignSelf: 'center', marginLeft: 6}}>자동 무전</span>
          </div>
        </Pop>
      </div>
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
