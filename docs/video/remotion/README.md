# 뻐꾸기 소개 영상 (Remotion)

가로 소개 영상(1920×1080)과 세로 숏폼(1080×1920)을 코드로 만든다. 시연 장면은 모두 실제 녹화(`../src/raw`)에서 잘라 쓴다.

## 다시 만들기

```sh
cd docs/video/remotion
npm install
python3 scripts/prep.py          # 클립 자르기·TTS 구간 찾기·마스코트·글꼴 복사·BGM/효과음 합성 → public/, src/speech.json
npx remotion render Promo out/wide.mp4
npx remotion render Short out/short.mp4
scripts/finish.sh                # 음량 -16 LUFS 맞춤·메타데이터 정리 → ../뻐꾸기_소개영상.mp4, ../뻐꾸기_숏폼.mp4
```

- 미리보기: `npx remotion studio`
- 장면 길이·클립 구간: `src/scenes.json` (BGM 길이도 여기서 계산)
- 장면 확인용 접촉 시트: `scripts/sheet.sh <영상> <wide|short> <출력.png>`
- 필요: Node 18+, Python 3 + numpy·scipy, ffmpeg
- 화면 스타일: 앱 시안(밝은 종이 바탕, 둥근 핀 카드, 무전기 LCD·PTT·RX/TX 표시등)과 같은 색을 `src/theme.tsx`의 `C`, `CARS`에 둔다. 초록은 쓰지 않는다.
- 글꼴: `fonts/`(Gowun Batang Bold, Pretendard SemiBold·ExtraBold, OFL). 마스코트: `../../../design/character/cuckoo_*.svg`. prep.py가 둘 다 `public/`으로 복사한다.

## 다시 녹화한 뒤 다시 자르기

앱 화면 클립(`public/clips`)만 녹화에 기대고, 나머지 장면(제목·카드·도로·관제·로고)은 코드로 그려서 녹화와 상관없다.
녹화를 새로 하면 아래 순서로 다시 만든다.

1. `server`에서 `npx wrangler dev --port 8792`를 띄우고, 저장소 루트에서 `node docs/video/src/shoot.mjs docs/video/src/raw/take1`(시연 모드, 2대째 토막까지 약 4분)과 `node docs/video/src/shoot2.mjs docs/video/src/raw/take2`(코드 참여·투표·경유지, 약 1분)를 돌린다.
   두 스크립트는 글자 대신 좌표로 누른다(`XY`). 새 앱은 마스코트 애니메이션 때문에 `uiautomator dump`가 실패하기 때문이다. 앱 배치가 바뀌면 `XY`만 고친다.
   take2 전에 내비에 남은 안내가 있으면 끈다(take1의 투표 결과가 경유지로 들어가 있다).
   봇은 2배속으로 둔다(1배속은 봇의 도착 대기 180초가 먼저 끝나 도착 장면이 안 나온다). 앱 음성 안내는 한 줄씩 차례로 읽히므로, take1은 PTT·승객 탭을 급제동·휴대폰 무전 뒤로 미뤄 두 안내가 운전석 화면에서 바로 읽히게 했다.
2. `rm -rf public/clips` (prep.py는 이미 있는 클립을 건너뛴다).
3. 녹화 창 위치가 바뀌었으면 `scripts/prep.py`의 `CROP`(2560×1440 녹화 안에서 앱 화면 1682×1210)을 맞춘다.
4. `src/scenes.json`의 `clips.<id>.segs`에 녹화 안 구간(초)을 새로 적는다. 장면 길이(`wide`·`short`의 `f:<id>`)는 대략 `구간 길이 + 1.35초`(앞머리 전·후 자막)로 맞춘다.
5. `python3 scripts/prep.py` → 클립을 자르고 `src/speech.json`(앱 TTS 구간)을 다시 만든다. BGM 길이도 여기서 다시 맞춘다.
6. `src/Feature.tsx`의 `FEATURES`에서 클립 내용에 기대는 값을 확인한다. 모두 클립 기준 초, 앱 화면 1682×1210 좌표다.
   - `cam`·`camTall`: 카메라가 다가가는 시각과 사각형
   - `ring`: 주황 강조 테두리 시각과 사각형(카드·PTT 위치)
   - `radio`: 딸깍·로저 효과음 시각, `alert`: 경보음 시각, `muteUntil`: 클립 소리를 켜는 시각(BGM 낮춤도 이 값을 따른다)
7. 렌더 → `scripts/finish.sh` → `scripts/sheet.sh`로 장면을 훑어본다.

클립 구간을 고를 때는 `timeline.json`의 녹화 시작 시각과 `logcat.txt`의 TTS·카드 시각을 맞춰 보면 빠르다. 다만 앱 음성은 차례로 읽혀서 로그보다 늦게, 때로는 빠지기도 하니 실제 소리는 `speech.json`으로 확인한다.

`speech.json`이 바뀌면 BGM 낮춤, 로저 비프 시각, 화면의 RX 파형이 저절로 따라온다. 운수사 장면의 휴대폰 화면은 `clips/rx_phone.mp4`, 보고서 장면은 `design/screens/control-report.png`를 쓴다.

## AI b-roll 넣는 자리

첫 장면(convoy)은 기본으로 벡터 그림 도로다(지금 `scenes.json` 목록에는 빠져 있다). 생성한 클립(의도: "highway convoy at dusk", 3~4초, 무음)을
`public/broll/convoy.mp4`에 두고 다음처럼 렌더하면 그 영상으로 바뀐다.

```sh
npx remotion render Promo out/wide.mp4 --props='{"introBroll":"broll/convoy.mp4"}'
```

숏폼에는 convoy 장면이 없다. 넣으려면 `src/scenes.json`의 `short` 맨 앞에 `["convoy", 3.0]`을 추가한다.
