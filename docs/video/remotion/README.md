# 뻐꾸기 소개 영상 (Remotion)

가로 소개 영상(1920×1080)과 세로 숏폼(1080×1920)을 코드로 만든다. 시연 장면은 모두 실제 녹화(`../src/raw`)에서 잘라 쓰고, 도로·차·버스·관제 장면은 Google Flow로 만든 연출 이미지(한국 도로, 현대차, 한국인)에 카메라 움직임을 넣어 쓴다. 나레이션(ElevenLabs)이 영상 전체에 깔리고 BGM은 Google Flow Music 곡이다(출처는 `../AUDIO_CREDITS.md`).

## 다시 만들기

```sh
cd docs/video/remotion
npm install
python3 scripts/prep.py          # 클립 자르기·앱 음성 정규화·TTS 구간 찾기·효과음 합성·장면 시간표 계산 → public/, src/speech.json, src/timeline.json
npx remotion render Promo out/wide.mp4
npx remotion render Short out/short.mp4
scripts/finish.sh                # 음량 -16 LUFS 맞춤·메타데이터 정리 → ../뻐꾸기_소개영상.mp4, ../뻐꾸기_숏폼.mp4
scripts/sheet.sh ../뻐꾸기_소개영상.mp4 wide out/sheet_wide.png   # 장면마다 두 장씩 훑어보기
```

- 미리보기: `npx remotion studio`
- 사람이 손대는 곳은 `src/scenes.json` 하나다. `wide`·`short`는 `[장면, 기본 길이(초), 나레이션 id]` 목록이고, `clips`는 녹화 안 구간과 클립 소리 설정(`lead`, `mute`, `muteAfter`)이다.
- `src/timeline.json`은 prep.py가 계산한다. 장면 길이 = max(기본 길이, 0.4초 + 나레이션 + `voPad`)이고, 다음 장면에 나레이션이 없으면 이번 나레이션이 다음 장면으로 넘어가도 된다(급제동 실사 → 급제동 시연). 시연 장면은 앱 음성이 나레이션과 겹치지 않도록 클립 첫 프레임을 멈춰 두는 시간(`hold`)을 넣는다. 겹치면 prep.py가 멈춘다. 나레이션만 바꿨을 때는 `python3 scripts/prep.py --audio-only`로 충분하다.
- 소재: 나레이션 `public/audio/vo/n01~n17.mp3`(대본 `narration.md`), BGM `public/audio/bgm_flow_1.wav`, 연출 이미지 `public/broll/*.jpg`(1376×768). `public/`은 git에 올리지 않으므로 이 소재는 따로 보관한다.
- 앱 음성: 녹화 속 TTS는 -28dB 안팎으로 작다. 고정 증폭 대신 클립마다 피크 -7dBFS로 정규화한다(`PEAK`).
- BGM: 처음부터 끝까지 같은 크기로 깐다(`src/Root.tsx`의 `BGM_BASE`). 말이 나올 때만 낮추면 음악이 출렁여 들려서 낮추지 않는다. 처음 1초 페이드 인, 끝 2.5초 페이드 아웃.
- 연출 이미지: 정지 이미지를 장면 길이 동안 천천히 밀거나 당긴다(`src/Broll.tsx`의 `PUSH`, 샷의 `out`). 가로는 1.16배 확대해 오른쪽 아래 생성 표시를 화면 밖으로 밀고, 세로는 가운데만 잘라 쓴다. 화면 오른쪽 위에 "AI 생성 연출 이미지"라고 적는다. 운전석 장면(`cockpit.jpg`)은 생성 이미지의 가운데 화면에 실제 앱 화면을 합성한 것이다.
- 필요: Node 18+, Python 3 + numpy·scipy, ffmpeg
- 화면 스타일: 앱 시안(밝은 종이 바탕, 둥근 핀 카드, 무전기 LCD·PTT·RX/TX 표시등)과 같은 색을 `src/theme.tsx`의 `C`, `CARS`에 둔다. 실사 위 자막은 아래쪽만 어둡게 깔고 같은 글꼴을 쓴다. 초록은 쓰지 않는다.
- 글꼴: `fonts/`(Gowun Batang Bold, Pretendard SemiBold·ExtraBold, OFL). 마스코트: `../../../design/character/cuckoo_*.svg`. prep.py가 둘 다 `public/`으로 복사한다.

## 다시 녹화한 뒤 다시 자르기

앱 화면 클립(`public/clips`)만 녹화에 기대고, 나머지 장면(제목·카드·로고)은 코드로 그리거나 실사 b-roll을 써서 녹화와 상관없다.
녹화를 새로 하면 아래 순서로 다시 만든다.

1. `server`에서 `npx wrangler dev --port 8792`를 띄우고, 저장소 루트에서 `node docs/video/src/shoot.mjs docs/video/src/raw/take3`(시연 모드, 2대째 토막까지 약 4분)과 `node docs/video/src/shoot2.mjs docs/video/src/raw/take4`(코드 참여·투표·경유지, 약 1분)를 돌린다. 지금 영상은 take3(무전·급제동), take4(투표·경유지), take5(도착, take3의 도착 장면을 못 써서 시연 모드를 한 번 더 찍음)를 쓴다(`scripts/prep.py`의 `SRCS`).
   두 스크립트는 글자 대신 좌표로 누른다(`XY`). 새 앱은 마스코트 애니메이션 때문에 `uiautomator dump`가 실패하기 때문이다. 앱 배치가 바뀌면 `XY`만 고친다.
   투표 녹화 전에 내비에 남은 안내가 있으면 끈다(앞 녹화의 투표 결과가 경유지로 들어가 있다).
   봇은 2배속으로 둔다(1배속은 봇의 도착 대기 180초가 먼저 끝나 도착 장면이 안 나온다). 앱 음성 안내는 한 줄씩 차례로 읽히므로, 시연 모드 녹화는 PTT·승객 탭을 급제동·휴대폰 무전 뒤로 미뤄 두 안내가 운전석 화면에서 바로 읽히게 했다.
2. `rm -rf public/clips` (prep.py는 이미 있는 클립을 건너뛴다).
3. 녹화 창 위치가 바뀌었으면 `scripts/prep.py`의 `CROP`(2560×1440 녹화 안에서 앱 화면 1682×1210)을 맞춘다.
4. `src/scenes.json`의 `clips.<id>.segs`에 녹화 안 구간(초)을 새로 적는다. 기본 장면 길이(`wide`·`short`의 `f:<id>`)는 대략 `구간 길이 + 1.35초`(앞머리 전·후 자막)로 맞춘다. 녹화 앞뒤에 걸린 다른 안내 음성은 `mute`(이 초 전까지 끔)·`muteAfter`(이 초 뒤 끔)로 막는다. 에뮬레이터의 음성 안내는 카드가 뜬 뒤 몇 초 늦게 나오므로, 말이 화면 구간 밖에 있으면 `aseg`에 소리 구간을 따로 적는다(길이 합은 `segs`와 같게). 소리는 녹화 전체의 타임스탬프 빈틈을 무음으로 채운 뒤 자르므로 말이 중간에 끊기지 않는다.
5. `python3 scripts/prep.py` → 클립을 자르고 `src/speech.json`(앱 TTS 구간)과 `src/timeline.json`(장면 시간표)을 다시 만든다.
6. `src/Feature.tsx`의 `FEATURES`에서 클립 내용에 기대는 값을 확인한다. 모두 클립 기준 초, 앱 화면 1682×1210 좌표다.
   - `cam`·`camTall`: 카메라가 다가가는 시각과 사각형
   - `ring`: 주황 강조 테두리 시각과 사각형(카드·PTT 위치)
   - `radio`: 딸깍·로저 효과음 시각, `alert`: 경보음 시각
7. 렌더 → `scripts/finish.sh` → `scripts/sheet.sh`로 장면을 훑어본다.

클립 구간을 고를 때는 `timeline.json`의 녹화 시작 시각과 `logcat.txt`의 TTS·카드 시각을 맞춰 보면 빠르다. 다만 앱 음성은 차례로 읽혀서 로그보다 늦게, 때로는 빠지기도 하니 실제 소리는 `speech.json`으로 확인한다.

`speech.json`이 바뀌면 첫 프레임 정지 시간, 로저 비프 시각, 화면의 RX 파형이 저절로 따라온다. 운수사 장면의 휴대폰 화면은 `clips/rx_phone.mp4`, 보고서 장면은 `design/screens/control-report.png`를 쓴다.
