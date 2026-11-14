import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useVideoConfig} from 'remotion';
import {Logo} from './Scenes';
import {C, Chip, FONT, FONT_B, Pop, ramp, SERIF, Sfx, useT, useTall} from './theme';

/**
 * 실사 컷은 Google Flow 로 만든 정지 이미지(public/broll/*.jpg, 1376×768)다. 한국 도로·한국인·현대차로 맞췄고,
 * 영상 대신 정지 이미지를 천천히 밀고 당겨(켄 번스) 차가 앞뒤로 어색하게 움직이는 일이 없다.
 *
 * 오른쪽 아래 생성 표시(가로 약 93%, 세로 약 87%)는 화면 밖으로 민다.
 * 가로: 1.16배, 기준점 (0, 30%) → 보이는 가로 범위 0~86%. 세로(9:16)는 가운데만 잘라 써서 들어오지 않는다.
 */
const WIDE_ZOOM = 1.16;
const PUSH = 0.09;
const DARK = '25,31,40';

export type Shot = {src: string; out?: boolean};

/** 실사 한 컷: 천천히 다가가거나(out 이면 물러나며) 세로 화면에서는 옆으로도 조금 흐른다 */
const Take: React.FC<{shot: Shot; len: number}> = ({shot, len}) => {
  const tall = useTall();
  const t = useT();
  const p = Math.min(1, t / len);
  const k = shot.out ? 1 - p : p;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: C.ink}}>
      <Img
        src={staticFile(`broll/${shot.src}.jpg`)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: tall ? `${44 + 12 * k}% 50%` : '50% 50%',
          transformOrigin: tall ? '50% 40%' : '0% 30%',
          transform: `scale(${(tall ? 1.02 : WIDE_ZOOM) + PUSH * k})`,
        }}
      />
    </AbsoluteFill>
  );
};

/** 여러 컷을 장면 길이에 고르게 나눠 잇는다. dim: 화면 전체 어둡게(0~1), 아래쪽은 늘 그라데이션. mark: AI 생성 표시 */
export const Footage: React.FC<{shots: Shot[]; dur: number; dim?: number; mark?: boolean; children?: React.ReactNode}> = ({shots, dur, dim = 0, mark = true, children}) => {
  const {fps} = useVideoConfig();
  const tall = useTall();
  const seg = Math.ceil((dur * fps) / shots.length);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      {shots.map((s, i) => (
        <Sequence key={i} from={i * seg} durationInFrames={i === shots.length - 1 ? undefined : seg}>
          <Take shot={s} len={seg / fps} />
        </Sequence>
      ))}
      {dim ? <AbsoluteFill style={{background: `rgba(${DARK},${dim})`}} /> : null}
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(${DARK},0) ${tall ? 35 : 38}%, rgba(${DARK},.55) ${tall ? 60 : 68}%, rgba(${DARK},.88) 100%)`}} />
      {mark ? (
        <div style={{position: 'absolute', right: tall ? 28 : 36, top: tall ? 200 : 28, fontFamily: FONT, fontSize: tall ? 22 : 18, color: 'rgba(255,255,255,.62)', textShadow: '0 1px 6px rgba(0,0,0,.5)'}}>AI 생성 연출 이미지</div>
      ) : null}
      {children}
    </AbsoluteFill>
  );
};

/** 실사 위 자막: 꼬리표 + 명조 제목 + 설명. 아래쪽 그라데이션 위에 얹는다 */
export const Caption: React.FC<{chip?: React.ReactNode; chipColor?: string; title: React.ReactNode; sub?: React.ReactNode; at?: number; foot?: string}> = ({
  chip,
  chipColor = C.lcd,
  title,
  sub,
  at = 0.3,
  foot,
}) => {
  const tall = useTall();
  return (
    <div style={{position: 'absolute', left: tall ? 56 : 96, right: tall ? 56 : 96, bottom: tall ? 300 : 84, textAlign: tall ? 'center' : 'left'}}>
      {chip ? (
        <Pop at={at} style={{transformOrigin: tall ? 'center' : 'left center'}}>
          <Chip size={tall ? 30 : 26} color={chipColor} ink={chipColor === C.lcd ? C.lcdInk : C.paper}>
            {chip}
          </Chip>
        </Pop>
      ) : null}
      <Pop at={at + 0.15} blip={false} style={{transformOrigin: tall ? 'center' : 'left center'}}>
        <div style={{fontFamily: SERIF, fontSize: tall ? 74 : 80, color: C.paper, lineHeight: 1.22, marginTop: chip ? 22 : 0, wordBreak: 'keep-all', textShadow: '0 2px 18px rgba(0,0,0,.35)'}}>{title}</div>
      </Pop>
      {sub ? (
        <Pop at={at + 0.6} blip={false} style={{transformOrigin: tall ? 'center' : 'left center'}}>
          <div style={{fontFamily: FONT, fontSize: tall ? 36 : 34, color: '#E5E8EB', marginTop: 18, lineHeight: 1.5, wordBreak: 'keep-all'}}>{sub}</div>
        </Pop>
      ) : null}
      {foot ? <div style={{fontFamily: FONT, fontSize: tall ? 24 : 21, color: '#B0B8C1', marginTop: 20, lineHeight: 1.45, wordBreak: 'keep-all'}}>{foot}</div> : null}
    </div>
  );
};

const orange = (s: string) => <span style={{color: '#FF8A3D'}}>{s}</span>;

/* ---------- 여는 장면: 함께 달리는 차 네 대 ---------- */
export const Convoy: React.FC<{dur: number}> = ({dur}) => (
  <Footage shots={[{src: 'depart'}, {src: 'convoy_dusk'}]} dur={dur}>
    <Caption chip="현대자동차그룹 Pleos Connect 차량용 앱" at={0.8} title="여러 대가 함께 가는 길" sub="명절 귀성길 · 수학여행 버스" />
  </Footage>
);

/* ---------- 아픈 곳: 흩어지는 대열 ---------- */
export const Pain: React.FC<{dur: number}> = ({dur}) => (
  <Footage shots={[{src: 'traffic_gap'}]} dur={dur}>
    <Caption
      chip="운전 중 일행 연락"
      chipColor={C.tx}
      at={0.5}
      title={<>운전 중 {orange('끊기는')} 일행 연락</>}
      sub="전화는 한 번에 한 대 · 운전 중 단톡 확인 불가 · 앞차 급제동 늦은 인지"
    />
  </Footage>
);

/* ---------- 서비스 개념: 사람 무전 → 차가 대신 하는 무전 ---------- */
export const Concept: React.FC<{dur: number}> = ({dur}) => {
  const t = useT();
  const tall = useTall();
  const half = dur / 2;
  const p1 = 1 - ramp(t, half - 0.3, half);
  const p2 = ramp(t, half, half + 0.4);
  const autos: [string, string, string][] = [
    ['급제동', '앞차 급제동 거리 안내', C.tx],
    ['처짐', '대열 2km 이상 처짐', C.orange],
    ['도착', '휴게소 도착 보고', C.rx],
  ];
  return (
    <Footage shots={[{src: 'ptt_press'}, {src: 'cockpit'}]} dur={dur}>
      <div style={{position: 'absolute', inset: 0, opacity: p1}}>
        <Caption chip="뻐꾸기의 무전" at={0.3} title={<>사람 무전 {orange('· 버튼 한 번')}</>} sub="누르고 말하면 전 차량 동시 수신" />
      </div>
      <div style={{position: 'absolute', left: tall ? 56 : 96, right: tall ? 56 : 96, bottom: tall ? 300 : 84, opacity: p2, textAlign: tall ? 'center' : 'left'}}>
        <Chip size={tall ? 30 : 26}>Pleos Connect 화면 위 뻐꾸기</Chip>
        <div style={{fontFamily: SERIF, fontSize: tall ? 74 : 80, color: C.paper, lineHeight: 1.22, marginTop: 22, wordBreak: 'keep-all'}}>
          말이 없을 땐 {orange('차가 대신 무전')}
        </div>
        <div style={{display: 'flex', flexDirection: tall ? 'column' : 'row', gap: tall ? 14 : 22, marginTop: 26, alignItems: tall ? 'center' : 'flex-start'}}>
          {autos.map(([a, b, col], i) => (
            <div key={a} style={{display: 'flex', alignItems: 'center', gap: 14, opacity: ramp(t, half + 0.3 + i * 0.35, half + 0.6 + i * 0.35)}}>
              <Chip size={tall ? 28 : 26} color={col} ink={C.paper}>
                {a}
              </Chip>
              <span style={{fontFamily: FONT_B, fontSize: tall ? 32 : 28, color: C.paper, whiteSpace: 'nowrap'}}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      <Sfx name="ptt" at={0.9} volume={0.45} />
      <Sfx name="roger" at={half - 0.6} volume={0.3} />
    </Footage>
  );
};

/* ---------- 급제동 시연 앞: 앞차 브레이크등 ---------- */
export const BrakeCam: React.FC<{dur: number}> = ({dur}) => (
  <Footage shots={[{src: 'brake_chain'}]} dur={dur}>
    <Caption chip="자동 무전" chipColor={C.tx} at={0.3} title="앞차 급제동" />
    <Sfx name="alert" at={0.9} volume={0.3} />
  </Footage>
);

/* ---------- 쓰임새: 가족 귀성길 | 수학여행 버스 ---------- */
export const UseCase: React.FC<{dur: number}> = ({dur}) => {
  const tall = useTall();
  const half = (src: string, at: number, badge: string, col: string, title: string, lines: string[], foot?: string) => (
    <div style={{position: 'relative', flex: 1, overflow: 'hidden'}}>
      <Footage shots={[{src}]} dur={dur}>
        <div style={{position: 'absolute', left: 64, right: 48, bottom: 64}}>
          <Pop at={at} style={{transformOrigin: 'left center'}}>
            <Chip size={24} color={col} ink={C.paper}>
              {badge}
            </Chip>
          </Pop>
          <Pop at={at + 0.15} blip={false}>
            <div style={{fontFamily: SERIF, fontSize: 64, color: C.paper, marginTop: 18}}>{title}</div>
          </Pop>
          <Pop at={at + 0.4} blip={false}>
            <div style={{marginTop: 12}}>
              {lines.map((l) => (
                <div key={l} style={{fontFamily: FONT, fontSize: 30, color: '#E5E8EB', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 14}}>
                  <span style={{width: 10, height: 10, borderRadius: 5, background: col, flexShrink: 0}} />
                  {l}
                </div>
              ))}
            </div>
            {foot ? <div style={{fontFamily: FONT, fontSize: 21, color: '#B0B8C1', marginTop: 12}}>{foot}</div> : null}
          </Pop>
        </div>
      </Footage>
    </div>
  );
  return (
    <AbsoluteFill style={{display: 'flex', flexDirection: tall ? 'column' : 'row', gap: 6, background: C.ink}}>
      {half('kids_backseat', 0.3, '구현 · 시연 완료', C.rx, '가족 귀성길', ['친척 차 4대 동시 무전', '급제동·처짐·도착 자동 무전', '키즈 채널 · 휴게소 투표'])}
      {half('bus_convoy', 1.0, '적용 예시', C.orange, '수학여행 단체 버스', ['인솔 교사가 전 버스에 동시 무전', '앞 버스 급제동 · 뒤 버스 처짐 안내', '같은 휴게소 경유지 등록'], '버스의 Pleos 탑재 여부는 확인 전입니다.')}
    </AbsoluteFill>
  );
};

/* ---------- 운수사 관제 (적용 예시) ---------- */
export const Fleet: React.FC<{dur: number}> = ({dur}) => {
  const tall = useTall();
  const t = useT();
  return (
    <Footage shots={[{src: 'dispatcher'}, {src: 'bus_driver', out: true}]} dur={dur}>
      <Caption
        chip="운수사 구독 전용 · 적용 예시"
        chipColor={C.orange}
        at={0.3}
        title={<>운수사 관제 {orange('→')} 운행 중 기사 전원 동시 공지</>}
        sub={'"어디쯤이에요?" 전화 대신 출발·도착 자동 보고'}
        foot="버스의 Pleos 탑재는 확인 전입니다. 관제석은 휴대폰·PC 웹으로 참여합니다."
      />
      {!tall ? (
        <div style={{position: 'absolute', right: 80, top: 70, display: 'flex', alignItems: 'flex-end', gap: 16, opacity: ramp(t, 1.0, 1.4)}}>
          <div style={{fontFamily: FONT, fontSize: 21, color: C.paper, lineHeight: 1.45, textAlign: 'right', textShadow: '0 1px 8px rgba(0,0,0,.6)'}}>
            실제 화면
            <br />
            휴대폰 웹으로
            <br />
            같은 무전방 참여
          </div>
          <div style={{width: 136, height: 276, borderRadius: 24, background: C.paper, padding: 8, boxShadow: '0 16px 40px rgba(0,0,0,.35)'}}>
            <OffthreadVideo src={staticFile('clips/rx_phone.mp4')} muted style={{width: 120, height: 260, borderRadius: 16, display: 'block'}} />
          </div>
        </div>
      ) : null}
      <Sfx name="ptt" at={1.0} volume={0.45} />
      <Sfx name="roger" at={3.2} volume={0.3} />
    </Footage>
  );
};

/* ---------- 끝: 어둡게 깐 노을 길 위 로고 ---------- */
export const Outro: React.FC<{dur: number}> = ({dur}) => (
  <Footage shots={[{src: 'sunset_road', out: true}]} dur={dur} dim={0.62}>
    <Logo outro dark />
  </Footage>
);
