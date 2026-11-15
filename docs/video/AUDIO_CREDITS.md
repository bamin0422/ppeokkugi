# 소리·영상 소재 출처

뻐꾸기 소개 영상(`뻐꾸기_소개영상.mp4`)과 숏폼(`뻐꾸기_숏폼.mp4`)에 들어간 소리와 영상 소재는 아래가 전부입니다. 두 영상 모두 화면 소재는 Google Flow로 만든 2D 삽화, 앱 정지 화면, 마스코트, 코드로 그린 로고입니다. 이 밖의 외부 음원·샘플·효과음 라이브러리·스톡 영상은 쓰지 않았습니다.

## 소리

| 소리 | 출처 | 만든 방법 |
|---|---|---|
| 나레이션 | ElevenLabs 생성 | 모델 Eleven v4, 음성 "Jisoo - Inviting, Clear and Measured". 감정 태그 없이 대본 문장을 그대로 넣어 생성(안정성 50%, 유사성 75%). 대본은 `remotion/narration.md`, 파일은 `remotion/public/audio/vo/n01.mp3`~`n17.mp3`(음높이를 유지한 채 10% 빠르게, 음량 -8dB). 소개 영상은 이 가운데 n05, n07~n12, n16, n17 아홉 줄을 씀. 장면이 시작하고 0.4초 뒤에 나오며, 장면 길이를 나레이션 길이에 맞춤 |
| 배경음악 | Google Flow Music 생성 | `remotion/public/audio/bgm_flow_v6.wav`. 110BPM, 뮤트 주법 전기 기타·가벼운 킥과 박수·베이스·패드로 이루어진 단순한 연주곡. 생성한 곡 앞머리의 무음 7.8초를 잘라 씀. 처음부터 끝까지 같은 크기로 깔고, 처음 1초 페이드 인·끝 2.5초 페이드 아웃 |
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
| 앱 화면 | 뻐꾸기 앱 정지 화면 | Pleos Connect Emulator에서 캡처한 정지 화면(`design/screens-v2/`). 차량 화면은 앱 영역만 잘라 둥근 카드에 띄우고 천천히 다가가며, 휴대폰 웹 화면도 같은 폴더의 캡처 |
| 2D 삽화 | Google Flow 생성 이미지 | 마스코트가 함께 그려진 플랫 2D 삽화(`design/illust/`, 영상용은 `remotion/public/broll/`)로, 두 영상 모든 장면의 배경에 깔았음. 실사풍 이미지와 영상 클립은 쓰지 않음. 출발, 운전석, 무전 버튼, 고속도로 대열, 급제동, 벌어진 대열, 뒷좌석 아이들, 휴게소, 관광버스 대열, 버스 기사, 관제 직원, 해 질 녘 도로 등. 천천히 밀고 당기는 움직임만 넣고 화면에 "AI 생성 삽화"라고 표시함. 오른쪽 아래 생성 표시는 확대·위치 조정으로 화면 밖에 둠 |
| 운행 보고서 화면 | 뻐꾸기 관제 웹 실제 화면 | 소개 영상: 가상 차량 3대(`server/scripts/bots.mjs --real-pace`)가 경로를 끝까지 달려 전원 도착한 방의 보고서를 `src/report.mjs`로 캡처(`src/raw/report.png`). 숏폼: `design/screens/control-report.png` |
| 마스코트·글꼴 | Google Flow 생성 이미지 / OFL 글꼴 | 마스코트 `design/character/cuckoo_*.png`(Google Flow 이미지 생성으로 만든 2D 그림의 흰 바탕을 걷은 것, 원본 `design/character/source/`. 호차 색은 몸통 색만 코드로 바꿔 칠함), 글꼴 Pretendard(OFL) |
