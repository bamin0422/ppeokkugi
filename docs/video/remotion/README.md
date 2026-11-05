# 뻐꾸기 소개 영상 (Remotion)

가로 소개 영상(1920×1080)과 세로 숏폼(1080×1920)을 코드로 만든다. 시연 장면은 모두 실제 녹화(`../src/raw`)에서 잘라 쓴다.

## 다시 만들기

```sh
cd docs/video/remotion
npm install
python3 scripts/prep.py          # 클립 자르기·TTS 구간 찾기·스프라이트·글꼴 복사·BGM/효과음 합성 → public/, src/speech.json
npx remotion render Promo out/wide.mp4
npx remotion render Short out/short.mp4
scripts/finish.sh                # 음량 -16 LUFS 맞춤·메타데이터 정리 → ../뻐꾸기_소개영상.mp4, ../뻐꾸기_숏폼.mp4
```

- 미리보기: `npx remotion studio`
- 장면 길이·클립 구간: `src/scenes.json` (BGM 길이도 여기서 계산)
- 장면 확인용 접촉 시트: `scripts/sheet.sh <영상> <wide|short> <출력.png>`
- 필요: Node 18+, Python 3 + numpy·scipy, ffmpeg

## AI b-roll 넣는 자리

첫 장면(convoy)은 기본으로 픽셀 그림 도로다. 생성한 클립(의도: "highway convoy at dusk", 3~4초, 무음)을
`public/broll/convoy.mp4`에 두고 다음처럼 렌더하면 그 영상으로 바뀐다.

```sh
npx remotion render Promo out/wide.mp4 --props='{"introBroll":"broll/convoy.mp4"}'
```

숏폼에는 convoy 장면이 없다. 넣으려면 `src/scenes.json`의 `short` 맨 앞에 `["convoy", 3.0]`을 추가한다.
