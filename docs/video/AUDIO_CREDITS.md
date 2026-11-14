# 소리·영상 소재 출처

뻐꾸기 소개 영상(`뻐꾸기_소개영상.mp4`)과 숏폼(`뻐꾸기_숏폼.mp4`)에 들어간 소리와 영상 소재는 아래가 전부입니다. 이 밖의 외부 음원·샘플·효과음 라이브러리·스톡 영상은 쓰지 않았습니다.

## 소리

| 소리 | 출처 | 만든 방법 |
|---|---|---|
| 나레이션 | ElevenLabs 생성 | 모델 Eleven v4, 음성 "Annie - Friendly, Soft and Clear". 대본은 `remotion/narration.md`, 파일은 `remotion/public/audio/vo/n01.mp3`~`n17.mp3`. 생성한 음성을 1.2배속으로 맞춰 씀. 장면이 시작하고 0.4초 뒤에 나오며, 장면 길이를 나레이션 길이에 맞춤 |
| 배경음악 | Google Flow Music 생성 | `remotion/public/audio/bgm_flow_1.wav`. 처음부터 끝까지 같은 크기로 깔고, 처음 1초 페이드 인·끝 2.5초 페이드 아웃 |
| 앱 음성 안내 | 뻐꾸기 앱 실제 출력 | Pleos Connect Emulator 녹화(`src/raw`)에 함께 담긴 앱의 Pleos TextToSpeech 출력. 녹화 소리의 타임스탬프 빈틈을 무음으로 채워 말이 끊기지 않게 하고, 늦게 나온 안내는 해당 카드가 보이는 구간에 맞춰 붙임. 고정 증폭 대신 클립마다 피크 -7dBFS로 정규화하고 리미터를 안전장치로만 둠. 나레이션과 겹치지 않게 시연 장면 앞머리에서 클립 첫 프레임을 멈춰 둠 |
| 무전 딸깍·스켈치 (`ptt`) | 직접 합성 | 사인파 딸깍과 짧게 감쇠하는 대역 통과 잡음 |
| 로저 비프 (`roger`) | 직접 합성 | 1175Hz·1568Hz 사인 두 음과 짧은 스켈치 꼬리 |
| 휙 (`whoosh`) | 직접 합성 | 대역이 올라가는 잡음, 고역을 깎아 부드럽게 |
| 톡 (`blip`, 자막 등장) | 직접 합성 | 음높이가 내려가는 짧은 사인파 |
| 급제동 경보 (`alert`) | 직접 합성 | 1046Hz·1397Hz 사인 두 음 번갈아 3회 |
| 뻐꾹 (`cuckoo`) | 직접 합성 | 784Hz → 622Hz로 내려가는 두 음(장3도), 사인파와 배음 |

효과음은 모두 `remotion/scripts/prep.py`의 `sfx()`가 numpy로 만듭니다. 최종 음량은 `remotion/scripts/finish.sh`가 -16 LUFS(true peak -1.5dB)로 맞춥니다.

## 영상 소재

| 소재 | 출처 | 비고 |
|---|---|---|
| 앱 시연 화면 | 뻐꾸기 앱 실제 녹화 | Pleos Connect Emulator 화면 녹화(`src/raw`). 휴대폰 웹 화면은 같은 시연 중 CDP 스크린캐스트 |
| 연출 이미지 | Google Flow 생성 이미지 | `remotion/public/broll/`의 정지 이미지 11장(출발, 고속도로 대열, 벌어진 대열, 무전 버튼, 운전석, 급제동, 뒷좌석 아이들, 관광버스 대열, 관제 직원, 버스 기사, 해 질 녘 도로). 영상에서는 천천히 밀고 당기는 움직임만 넣고, 화면에 "AI 생성 연출 이미지"라고 표시함. 운전석 이미지의 가운데 화면에는 실제 앱 화면을 합성함. 오른쪽 아래 생성 표시는 확대·위치 조정으로 화면 밖에 둠 |
| 관제 보고서 화면 | 뻐꾸기 관제 웹 실제 화면 | `design/screens/control-report.png` |
| 마스코트·글꼴 | PixelLab 생성 1비트 그림을 바탕으로 직접 편집 / OFL 글꼴 | 마스코트 `design/character/frames/cuckoo_*.svg`(32×32 픽셀 그림. 새 모양은 PixelLab 후보에서 고르고 표정·소품은 `design/character/tools/gen.py`가 칸 단위로 그림), 글꼴 Pretendard(OFL) |
