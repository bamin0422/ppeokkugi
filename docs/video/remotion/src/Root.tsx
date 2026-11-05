import React from 'react';
import {AbsoluteFill, Audio, Composition, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Feature, featureLead} from './Feature';
import {Clock, Concept, Convoy, Logo, Outro, Sdk, UseCase} from './Scenes';
import {Changes, Fleet, Pain, Purpose, Report} from './Story';
import cfg from './scenes.json';
import speech from './speech.json';
import {Sfx} from './theme';

export type Props = {
  /**
   * AI b-roll 자리. public/ 아래 경로(예: "broll/convoy.mp4")를 넣으면 첫 장면(convoy)이 그 영상으로 바뀐다.
   * 의도한 장면: "highway convoy at dusk" — 해 질 녘 고속도로를 줄지어 달리는 승용차 3~4대, 3~4초, 무음.
   * null 이면 픽셀 그림 도로 장면을 쓴다.
   */
  introBroll: string | null;
};

const FPS = cfg.fps;
const T = Math.round(cfg.transition * FPS);
type Item = {id: string; from: number; dur: number; index: number};

const layout = (list: (string | number)[][]): {items: Item[]; total: number} => {
  let from = 0;
  let fi = 0;
  const items = list.map(([id, d], i) => {
    const dur = Math.round((d as number) * FPS);
    const it = {id: id as string, from, dur, index: (id as string).startsWith('f:') ? ++fi : 0};
    from += dur - (i < list.length - 1 ? T : 0);
    return it;
  });
  return {items, total: from};
};

const Scene: React.FC<{item: Item; broll: string | null}> = ({item, broll}) => {
  const d = item.dur / FPS;
  if (item.id.startsWith('f:')) return <Feature id={item.id.slice(2)} dur={d} index={item.index} />;
  switch (item.id) {
    case 'convoy':
      return <Convoy broll={broll} />;
    case 'pain':
      return <Pain dur={d} />;
    case 'purpose':
      return <Purpose dur={d} />;
    case 'changes':
      return <Changes dur={d} />;
    case 'fleet':
      return <Fleet dur={d} />;
    case 'report':
      return <Report dur={d} />;
    case 'clock':
      return <Clock dur={d} />;
    case 'logo':
      return <Logo />;
    case 'concept':
      return <Concept dur={d} />;
    case 'sdk':
      return <Sdk />;
    case 'usecase':
      return <UseCase />;
    case 'outro':
      return <Outro />;
  }
  return null;
};

/** 장면 진입: 겹치는 T 프레임 동안 밀려 들어오며 나타남 */
const Enter: React.FC<{children: React.ReactNode; first: boolean}> = ({children, first}) => {
  const f = useCurrentFrame();
  const {width} = useVideoConfig();
  if (first) return <>{children}</>;
  const p = interpolate(f, [0, T], [0, 1], {extrapolateRight: 'clamp'});
  const e = 1 - Math.pow(1 - p, 3);
  return (
    <AbsoluteFill style={{opacity: e, transform: `translateX(${(1 - e) * width * 0.06}px) scale(${1.03 - 0.03 * e})`, filter: p < 1 ? `blur(${(1 - e) * 6}px)` : undefined}}>
      {children}
    </AbsoluteFill>
  );
};

const Main: React.FC<Props & {kind: 'wide' | 'short'}> = ({kind, introBroll}) => {
  const {items} = layout(cfg[kind]);
  // 앱 TTS 가 나오는 구간(전역 프레임) → 배경음 낮춤
  const windows: [number, number][] = [];
  for (const it of items) {
    if (!it.id.startsWith('f:')) continue;
    const id = it.id.slice(2);
    const mute = id === 'rx' ? 4.8 : 0;
    const off = it.from + featureLead(id) * FPS;
    for (const [a, b] of (speech as Record<string, number[][]>)[id] ?? []) {
      if (b <= mute || off + a * FPS >= it.from + it.dur) continue;
      windows.push([off + Math.max(a, mute) * FPS, Math.min(off + b * FPS, it.from + it.dur)]);
    }
  }
  const ramp = 0.3 * FPS;
  const bgmVol = (f: number) => {
    let duck = 0;
    for (const [a, b] of windows) {
      duck = Math.max(duck, interpolate(f, [a - ramp, a, b, b + ramp], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
    }
    // 시연 장면 전체는 조금 낮게, 말소리 구간은 크게 낮춤
    const inFeature = items.some((it) => it.id.startsWith('f:') && f >= it.from && f < it.from + it.dur);
    const base = inFeature ? 0.26 : 0.6;
    return base * (1 - 0.6 * duck);
  };
  return (
    <AbsoluteFill style={{background: '#121417'}}>
      {items.map((it, i) => (
        <Sequence key={i} from={it.from} durationInFrames={it.dur}>
          <Enter first={i === 0}>
            <Scene item={it} broll={introBroll} />
          </Enter>
          {i > 0 ? <Sfx name="whoosh" at={0} volume={0.32} /> : null}
        </Sequence>
      ))}
      <Audio src={staticFile(`audio/bgm_${kind}.wav`)} volume={bgmVol} />
    </AbsoluteFill>
  );
};

export const Promo: React.FC<Props> = (p) => <Main {...p} kind="wide" />;
export const Short: React.FC<Props> = (p) => <Main {...p} kind="short" />;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={layout(cfg.wide).total} fps={FPS} width={1920} height={1080} defaultProps={{introBroll: null} as Props} />
    <Composition id="Short" component={Short} durationInFrames={layout(cfg.short).total} fps={FPS} width={1080} height={1920} defaultProps={{introBroll: null} as Props} />
  </>
);
