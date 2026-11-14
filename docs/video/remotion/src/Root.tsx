import React from 'react';
import {AbsoluteFill, Audio, Composition, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Feature} from './Feature';
import {BrakeCam, Concept, Convoy, Fleet, Outro, Pain, UseCase} from './Broll';
import {Clock, Logo, Sdk} from './Scenes';
import {Changes, Purpose, Report} from './Story';
import cfg from './scenes.json';
import tl from './timeline.json';
import {C, Sfx} from './theme';

/** 장면 시간표는 scripts/prep.py 가 나레이션 길이에 맞춰 계산한다(src/timeline.json, 프레임 단위) */
type Item = {id: string; from: number; dur: number; vo: string | null; hold: number; index: number};
const FPS = cfg.fps;
const T = Math.round(cfg.transition * FPS);
const VO_DELAY = Math.round(cfg.voDelay * FPS);
const BGM = 'audio/bgm_flow_1.wav';
const BGM_BASE = 0.12; // 처음부터 끝까지 같은 크기로 깐다(목소리에 맞춰 줄였다 키우면 출렁여 들린다)

const items = (kind: 'wide' | 'short'): Item[] => {
  let fi = 0;
  return tl[kind].scenes.map((s) => ({...s, index: s.id.startsWith('f:') ? ++fi : 0}));
};

const Scene: React.FC<{item: Item}> = ({item}) => {
  const d = item.dur / FPS;
  if (item.id.startsWith('f:')) return <Feature id={item.id.slice(2)} dur={d} index={item.index} hold={item.hold / FPS} />;
  switch (item.id) {
    case 'convoy':
      return <Convoy dur={d} />;
    case 'pain':
      return <Pain dur={d} />;
    case 'purpose':
      return <Purpose dur={d} />;
    case 'clock':
      return <Clock dur={d} />;
    case 'logo':
      return <Logo />;
    case 'concept':
      return <Concept dur={d} />;
    case 'brakecam':
      return <BrakeCam dur={d} />;
    case 'sdk':
      return <Sdk />;
    case 'usecase':
      return <UseCase dur={d} />;
    case 'fleet':
      return <Fleet dur={d} />;
    case 'report':
      return <Report dur={d} />;
    case 'changes':
      return <Changes dur={d} />;
    case 'outro':
      return <Outro dur={d} />;
  }
  return null;
};

/** 장면 진입: 겹치는 T 프레임 동안 천천히 겹쳐 나타난다 */
const Enter: React.FC<{children: React.ReactNode; first: boolean}> = ({children, first}) => {
  const f = useCurrentFrame();
  if (first) return <>{children}</>;
  const e = interpolate(f, [0, T], [0, 1], {extrapolateRight: 'clamp', easing: (x) => x * x * (3 - 2 * x)});
  return <AbsoluteFill style={{opacity: e, transform: `scale(${1.015 - 0.015 * e})`}}>{children}</AbsoluteFill>;
};

const Main: React.FC<{kind: 'wide' | 'short'}> = ({kind}) => {
  const list = items(kind);
  const {durationInFrames} = useVideoConfig();
  // BGM은 일정한 크기로 깔고, 처음 1초 페이드 인·끝 2.5초 페이드 아웃만 한다
  const bgmVol = (f: number) =>
    BGM_BASE * interpolate(f, [0, FPS, durationInFrames - 2.5 * FPS, durationInFrames - 1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {list.map((it, i) => (
        <Sequence key={i} from={it.from} durationInFrames={it.dur}>
          <Enter first={i === 0}>
            <Scene item={it} />
          </Enter>
          {i > 0 ? <Sfx name="whoosh" at={0} volume={0.12} /> : null}
        </Sequence>
      ))}
      {/* 나레이션은 장면 밖에 둔다: 다음 장면으로 넘어가는 줄(급제동)도 잘리지 않게 */}
      {list.map((it, i) =>
        it.vo ? (
          <Sequence key={`vo${i}`} from={it.from + VO_DELAY} layout="none">
            <Audio src={staticFile(`audio/vo/${it.vo}.mp3`)} />
          </Sequence>
        ) : null,
      )}
      <Audio src={staticFile(BGM)} volume={bgmVol} />
    </AbsoluteFill>
  );
};

export const Promo: React.FC = () => <Main kind="wide" />;
export const Short: React.FC = () => <Main kind="short" />;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={tl.wide.total} fps={FPS} width={1920} height={1080} />
    <Composition id="Short" component={Short} durationInFrames={tl.short.total} fps={FPS} width={1080} height={1920} />
  </>
);
