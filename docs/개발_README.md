# 뻐꾸기

차가 먼저 말하는 단체 무전 앱. Pleos Connect Automotive 앱 대회 출품작입니다.

## 빌드

JDK 17, Android SDK 35가 필요합니다. Pleos SDK는 `settings.gradle.kts`에 등록한 Maven 저장소에서 받습니다.

```bash
./gradlew :app:assembleDebug     # 디버그 APK
./gradlew :app:assembleRelease   # 대회 제출용 APK (debug 키 서명)
```

제출용 APK는 `apk/팀명_뻐꾸기_release.apk`에 복사해 두었습니다. 별도 키스토어가 없어 release 빌드도 Android debug 키로 서명합니다(`app/build.gradle.kts`). 바로 설치할 수 있지만, 스토어 배포용 서명은 아닙니다.

## 에뮬레이터 실행

Pleos Connect Emulator 2.1.0에서 확인하였습니다.

```bash
# APK 설치
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 앱 실행
adb shell am start -n com.ppeokkugi/.MainActivity
```

앱을 켜고 약 20초 후 SDK가 모두 연결됩니다. "상태" 화면에서 플랫폼·내비·TTS·STT 연결 상태를 확인할 수 있습니다.

## 데모 주행

"상태" 탭의 "데모 주행" 버튼을 누르면 경부고속도로 서울 요금소 → 기흥 → 오산 → 안성 휴게소 구간을 가상으로 주행하며 방향지시등·브레이크·와이퍼·기어 신호를 냅니다. 끝점은 봇 경로(`server/src/data.js`)와 같고, 도착하면 기어를 P로 둡니다. 모든 이벤트는 로그에 `Ppeokkugi` 태그로 찍힙니다.

같은 탭의 디버그 메뉴에는 에뮬레이터가 지원하지 않는 신호를 흉내 내는 버튼이 있습니다.

- **에어백 전개 주입 (긴급 콜)**: `CarEvent.AirbagDeployed`를 넣어 실제 신호와 같은 경로로 `signal: airbag`을 보냅니다.
- **깃발 조명 깜빡임 시험**: 우리 차 깃발 색으로 앰비언트 조명과 화면 위쪽 깃발 띠를 세 번 깜빡입니다.

```bash
adb logcat -s Ppeokkugi
```

## Virtual Console 신호 주입

```bash
adb forward tcp:8088 tcp:8088
# 브라우저로 한 번 열어 활성화
open http://127.0.0.1:8088/

B=http://127.0.0.1:8088/vehicle
curl -X POST "$B/turn-signal?mode=BlinkRight"   # 우회전 신호
curl -X POST "$B/turn-signal?mode=BlinkLeft"    # 좌회전 신호
curl -X POST "$B/body?front_wiper=Low"          # 와이퍼 켜기
curl -X POST "$B/gear?gear=Drive"               # 기어 D
curl -X POST "$B/gear?gear=Park"                # 기어 P
```

## 에뮬레이터 검증 결과 (2026-10-31)

| API | 결과 | 세부 내용 |
|---|---|---|
| 브레이크 페달 `registerBrakePedalStatus` | ✅ 확인 | 데모 주행에서 `Brake(pressed=true/false)` 수신 |
| 와이퍼 `registerWiperState` | ✅ 확인 | Virtual Console + 데모 주행 `Wiper(on=true/false)` |
| 방향지시등 `registerTurnSignalState` | ✅ 확인 | `TurnSignal(state=RIGHT/LEFT/OFF)` 모두 확인 |
| 기어 `GEAR_SELECTION` | ✅ 확인 | `Gear(park=false)`, `Gear(park=true)` 확인 |
| 좌석 착석 `registerSeatOccupancy` | ✅ 확인 | `Passengers(count=1~4)` 수신 |
| TTS 오디오존 `setAudioZoneId` | ✅ 확인 | 존 0~3 모두 예외 없이 지원 |
| 안전벨트 `registerSeatBeltNotBuckledWarning` | ❌ 에뮬레이터 미지원 | `property ID 0x25200709 불지원`, `checkSeatBuckledCapabilities`는 5개 좌석 반환 |
| 에어백 전개 `registerSeatAirbagDeployed` | ❌ 에뮬레이터 미지원 | capability 조회 자체가 `ERROR_NOT_SUPPORTED_PROPERTY` |
| 앰비언트 색 `checkAmbientLightBrightnessColorCapabilities` | ✅ capability 확인 | 1개 `SeatArea` 지원 |
| 앰비언트 색 설정 `setAmbientLightBrightnessColor` | ✅ 확인 (2026-11-01) | `pleos.car.permission.CONTROL_CAR_LIGHTS`가 있어야 합니다. 없으면 `need Permission`으로 실패합니다. 추가한 뒤에는 로그에 `앰비언트 색 설정 성공: … #E88E7D`가 찍힙니다. 에뮬레이터 화면에서 조명 색은 보이지 않습니다 |
| STT 화자 식별 `Speaker.getSpeakerId` | ⚠ 표준 경로 없음 | 표준 `ResultListener`에는 없음, `AmbientAiApi`의 `RecognitionFinalResult.speaker`로 획득 가능 |
| FusedLocation | ✅ 확인 | 런타임 권한 `pleos.car.permission.FUSED_LOCATION`을 요청한 뒤 `Location`·`Speed` 수신. 권한 없이 시작하면 `need Permission` 오류 |

## 서버 연결

`local.properties`에 `SYNC_URL=`을 설정하지 않으면 `http://10.0.2.2:8792`(에뮬레이터 기준 개발 PC 8792 포트)를 씁니다. 길품이 8791을 쓰므로 포트가 겹치지 않습니다. 메시지 형식은 `server/README.md`와 `server/src/room.js`를 그대로 따릅니다.

## P0 기능 (2026-10-31 구현)

| 기능 | 상태 | 하는 일 |
|---|---|---|
| 방 접속 `net/RoomClient.kt` | ✅ | 방 만들기(`POST /api/rooms`)·코드 입장, `hello`, 끊기면 1·2·4…30초 간격 재접속, 2초마다 `pos`. 서버가 `welcome`에 준 재입장 토큰을 다시 붙을 때 `hello`에 실어 같은 호차 번호(1호차면 선두 자격까지)를 돌려받습니다. 받은 메시지는 `RoomMsg` sealed 타입으로 바꿔 메인 스레드에서 넘깁니다 |
| 자동 콜 `domain/AutoCall.kt` | ✅ | 급제동(브레이크를 밟은 채 2초 안 15km/h 이상 감속, 20초 재전송 금지), 비(와이퍼 꺼짐→켜짐, 10분), 회전(1호차이고 내비 안내 500m 안 같은 방향일 때만), 제한속도 변경·주의 구간(선두만), 에어백. 단속 카메라는 보내지 않습니다 |
| 받은 콜 읽기 | ✅ | "2호차, 5km 앞부터 비"처럼 보낸 차와 거리를 붙여 TTS로 읽고 카드로 띄웁니다 |
| 받아 적기 | ✅(부분) | 큰 무전 버튼 → STT → `say`(채널·좌석). 40자를 넘으면 줄여 보냅니다(아래 "긴 무전 줄이기"). 승객 화면에는 글로 보내는 입력창도 있습니다 |
| 좌석 채널 | ✅(부분) | 채널마다 오디오 존을 정하고 `setAudioZoneId` 후 읽습니다(기본: 운전석 안내 존 0, 어른 존 1, 키즈 존 2, 승객 화면에서 변경). 좌석별 출력 분리를 확인하지 못해 기본으로 "키즈 채널, …"처럼 채널 이름을 앞에 붙입니다(§6.3 대안) |
| 쉬어 가 | ✅ | `vote_open`을 큰 후보 카드로 띄우고 누르거나 "1번/2번"이라고 말해 투표합니다. `vote_result`가 오면 목적지와 경유지를 묶어 `requestRouteWithWaypoints`로 다시 찾고(당선지가 곧 목적지면 그대로 둡니다) "안성 휴게소, 총 N명"이라고 읽습니다 |
| 점호 | ✅ | 기어가 처음 D가 되면 좌석별 착석과 벨트를 `roll`로 보냅니다. 벨트 신호가 없으면 `buckled: null`, 화면에는 "벨트 확인 불가"로 보입니다. 선두는 받은 점호를 읽습니다 |
| 다시 붙기 | ✅ | `rejoin`을 받으면 경유지를 넣고 "선두를 따라가는 경로로 바꿨습니다"라고 읽습니다. 서버가 이탈 동안 계속 보내므로 1분에 한 번만 따릅니다 |
| 화면 | ✅ | 입장, 운전석(일행 목록·깃발 색·최근 무전 3개·무전 버튼, 주행 중에는 입력과 스크롤 없음), 승객(채널·좌석·오디오 존·무전 기록·투표 카드), 상태(기존 디버그 로그) |
| 마스코트 | ✅ | 3D 뻐꾸기 9종(`design/character/cuckoo_*.png`, 앱은 512px `drawable-nodpi/cuckoo_<표정>_0.png`). `ui/Cuckoo.kt`의 `CuckooView(mood)` 한 곳에서만 그리며, 없는 표정은 `Mood.fallback`의 그림을 씁니다. 승객·입장 화면은 천천히 들썩이고(LOOP), 운전석 카드는 새로 온 때 한 번 튀어나온 뒤 멈춥니다(ONCE). 런처 아이콘은 `ic_launcher_foreground`·`ic_launcher_background`입니다 |

## P1 기능 (2026-11-01 구현)

| 기능 | 상태 | 하는 일 |
|---|---|---|
| 대장 콜 | ✅ | 선두(1호차)는 운전석 화면의 "경로 공유 · 대장 콜" 버튼으로 내비 목적지와 경유지(최대 2곳)를 `route`로 보냅니다. 내비 경로가 바뀌면(`onDestinationInfo`·`onWayPointInfo`) 자동으로 다시 보내고, 내비에 경로가 없으면 시연 목적지(안성 휴게소)를 보냅니다. 서버는 1호차가 보낸 `route`만 전달하고, 다른 차는 거부합니다. 받는 차는 `requestRouteWithWaypoints`로 다시 탐색하고, 카드와 TTS로 "선두가 경로를 바꿨습니다"라고 알립니다. 대장 콜 뒤에 들어오거나 다시 붙은 차에게는 서버가 마지막 대장 콜을 한 번 더 보내고, 앱은 이미 따른 것과 같으면 다시 찾지 않습니다 |
| 꼬리 콜 | ✅ | 서버가 선두와 후미가 2km 넘게 떨어지면 5분에 한 번 선두에게 `say`(`system: true`)를 보냅니다. 앱은 "꼬리 콜" 경고 카드로 띄우고 TTS로 읽습니다 |
| 긴급 콜 | ✅(주입) | 네 좌석에 `registerSeatAirbagDeployed`를 등록하고, 실패하면 좌석별로 로그를 남깁니다. 에뮬레이터는 속성을 지원하지 않으므로 상태 탭 디버그 버튼으로 주입합니다. 받는 차는 화면 전체를 덮는 빨간 알림(보낸 차, 거리, 좌표, 시각, 확인 버튼)을 띄우고 위치를 붙여 TTS로 읽습니다 |
| 깃발 색 | ✅ | 서버가 입장할 때 호차 번호로 색을 정해 `welcome`·`hello`에 담습니다. 먼저 들어온 차의 별칭과 색도 `welcome.cars`로 함께 받습니다. 앱은 그 색으로 앰비언트 조명을 바꾸고, 화면 맨 위 깃발 띠와 일행 목록 점으로도 보입니다 |
| 도착 깜빡임 | ✅ | 앱은 `pos`에 기어 P 여부(`park`)를 함께 보냅니다. 서버가 2대 이상이 모두 서 있고 서로 150m 안에 들어오면 `arrive`를 한 번 보냅니다. `park`를 모르는 휴대폰은 5km/h 미만이면 선 것으로 봅니다. 앱은 앰비언트 조명과 깃발 띠를 세 번 깜빡이고 "일행이 모두 도착했습니다"라고 읽습니다 |
| 휴대폰 참여 | ✅ | Worker가 `/`에서 휴대폰 웹 한 장(`server/src/phone.html`)을 줍니다. 방 코드를 넣고 위치 공유에 동의하면 들어가 2초마다 GPS를 `pos`로 보냅니다. 무전·자동 콜·대장 콜·점호·도착 카드를 받아 `speechSynthesis`로 읽고, 쉬어 가 투표를 누르거나 "1번"이라고 말해 투표합니다. "누르고 말하기"는 브라우저 `SpeechRecognition`(ko-KR)으로 받아 적어 `say`로 보내며, 글로 보내는 입력창도 있습니다. 에어백 알림은 빨간 전체 화면으로 띄웁니다 |
| 시연 모드 | ✅ | 입장 화면의 "시연 모드 · 봇과 함께 달리기"를 한 번 누르면 방을 만들고, PC에서 칠 봇 명령을 운전석 화면에 띄웁니다. 봇이 들어오면 데모 주행을 시작하고 대장 콜을 한 번 보냅니다. 시연 모드에서는 에뮬레이터 실제 위치를 무시하고 데모 좌표만 씁니다 |

## P2 기능 (2026-11-01 구현): 일행 지도·각자 위치 알림·이슈 알림

| 기능 | 상태 | 하는 일 |
|---|---|---|
| 일행 지도 `ui/GroupMap.kt` | ✅ | 길품 `GilpumMap`(osmdroid 6.1.20)을 복사해 고쳤습니다. 흑연색 밤 타일 위에 차마다 깃발 색 원과 "N호차" 이름표를 그리고, 우리 차는 굵은 흰 테와 "우리 차" 이름표로 구분합니다. 손으로 움직이지 않으며 맨 앞 차부터 맨 뒤 차, 살아 있는 이슈 핀까지 들어오게 스스로 맞춥니다(bounding box). 그래서 주행 중에도 운전석에 그대로 둡니다. 운전석은 왼쪽 열(지도·일행 목록·대장 콜), 오른쪽 열(최근 무전 3개·큰 무전 버튼)으로 배치를 바꿨고, 승객 화면은 오른쪽 위에 지도를 넣었습니다 |
| 이슈 핀 | ✅ | 급제동(급)·비(비)·좌/우회전(좌/우)·제한속도(속)·주의 구간(주)·에어백(!)·대열 이탈(이)을 그 일이 생긴 자리에 5분 동안 꽂습니다(`PIN_TTL_MS`). 우리 차가 보낸 콜도 꽂고, 지도 왼쪽 위에 지금 있는 핀 종류만 범례로 보입니다 |
| 각자 위치 알림 `notice` | ✅ | 서버(`logic.js` `formationNotices`)가 `pos`마다 판정하고, 받는 차마다 자기 기준 문장을 만들어 보냅니다. 바로 앞차와 2km 넘게 벌어지면 "3호차, 2.5km 뒤, 대열에서 처졌습니다"(본인에게는 "우리 차가 대열에서 2.5km 처졌습니다"), 1km 안으로 오면 "다시 붙음", 휴게소·목적지 400m 안에서 서면 "4호차 안성 휴게소 도착, 27km 앞", 휴게소 밖에서 3분 넘게 서 있으면 "2호차 3분째 정차 중", 5분마다 "일행 위치, 3호차 1.2km 앞, 2호차 3.3km 뒤". 같은 차·같은 종류는 2분 쿨다운, 막 들어온 차는 20초 동안 상태만 잡고 말하지 않습니다. 앱·휴대폰 모두 카드와 TTS로 받습니다 |
| 앞·뒤와 실제 거리 | ✅ | 앞뒤는 선두가 대장 콜로 보낸 목적지까지 남은 거리로 봅니다(목적지가 없을 때만 호차 번호). 일행 목적지로 안내 중인 차는 내비 `onDrivingInfo`의 경로상 남은 거리를 `pos.remainM`으로 함께 보내고, 견주는 차가 모두 이 값을 보냈으면 서버는 직선 거리 대신 이 값을 씁니다. 서버가 `signal`을 받는 차마다 `gapM`(보낸 차와의 실제 거리)과 `ahead`를 붙여 보내므로 "6호차, 26km 뒤 급제동, 감속하세요"처럼 읽습니다. 거리는 1km 미만 100m 단위, 10km 미만 소수 한 자리("1.2km")입니다 |
| 꼬리 콜 고침 | ✅ | 늘 "후미 2km 뒤"라고 하던 것을 실제 맨 앞·맨 뒤 차와 실제 거리로 바꿨습니다. 1호차가 맨 앞이면 "후미 3호차 3.3km 뒤, 천천히", 1호차가 처졌으면 "일행이 11km 앞서 있습니다, 맨 앞 2호차" |
| 휴대폰 일행 지도 | ✅ | `phone.html`에 Leaflet 1.9.4(cdnjs)와 OSM 타일로 같은 지도(깃발 색 원, "나 · 2호차", 이슈 핀 5분)를 넣었습니다. `welcome.cars`에 먼저 들어온 차의 마지막 위치도 실었습니다 |
| 마스코트 애니메이션 | ✅ | `CuckooView(mood, play)`: 입장·대기(시연 모드 봇 안내)·승객 화면은 계속 반복(LOOP), 운전석 최근 무전 카드는 새로 올 때 한 번(8초) 돌고 첫 프레임으로 멈춥니다(ONCE, 주행 중에도). 맨 위 카드 캐릭터는 150dp. 긴급 콜 전체 화면은 계속 반복합니다. 휴대폰 웹은 Worker 정적 자산(`server/public/cuckoo/<표정>.png`)으로 헤더·카드·긴급 화면에 같은 그림을 띄웁니다 |
| 앱 아이콘으로 돌아오기 | ✅ | 경유지가 들어가 내비가 앞으로 나온 뒤 아이콘을 누르면 액티비티가 새로 쌓여 방이 빈 화면이 뜨던 것을 `launchMode="singleTask"`로 막았습니다 |
| 내비 뒤에서도 살아 있기 | ✅ | 경유지·대장 콜로 Pleos 내비가 앞으로 나오면 앱이 캐시 상태가 되어 시스템이 얼렸다가 바인더 호출이 오자 죽였습니다(`Sync transaction while in frozen state`). 방에 있는 동안 `RoomService`(포그라운드 서비스, 위치 유형)를 띄워 내비 뒤에서도 무전을 받고 위치를 보냅니다. 에뮬레이터에서 내비가 앞에 있는 채 70초 넘게 살아 있고 그동안 재접속까지 마치는 것을 확인했습니다 |
| 긴 무전 줄이기 | ✅ | 40자를 넘으면 말버릇(음·어·저기·그러니까·좀 등 따로 떨어진 낱말)을 지우고, 그래도 길면 곳·숫자·길 상황·요청이 들어간 문장만 40자 안에서 골라 원래 순서로 잇습니다. 핵심이 없으면 첫 문장만, 한 문장뿐이면 말버릇만 지워 보냅니다(`Phrase.shorten`, LLM 없음) |
| 선두차 경유지 오류 | ✅ | 투표 당선지가 목적지와 같으면 내비가 "경로 탐색 오류 – Invalid Parameter"를 띄우고 빈 목적지 (0, 0)을 돌려줬습니다. 선두차는 그걸 대장 콜로 일행에 뿌려 모든 차가 같은 오류를 냈습니다. 목적지와 300m 안이면 경유지를 넣지 않고, (0, 0) 목적지는 보내지도 따르지도 않습니다 |

## 시연 방법

```bash
# 1) 서버 (터미널 1)
cd server && npx wrangler dev --port 8792

# 2) 앱 설치와 권한 (사용자 10)
./gradlew :app:assembleDebug
adb install -r --user 10 app/build/outputs/apk/debug/app-debug.apk
for p in android.permission.ACCESS_FINE_LOCATION android.permission.RECORD_AUDIO pleos.car.permission.FUSED_LOCATION; do
  adb shell pm grant --user 10 com.ppeokkugi $p
done
adb shell am start --user 10 -n com.ppeokkugi/.MainActivity

# 3) 앱 입장 화면에서 "시연 모드 · 봇과 함께 달리기"를 누릅니다.
#    운전석 화면에 뜬 명령 그대로 봇을 띄웁니다(--airbag 은 긴급 콜까지)
cd server && node scripts/bots.mjs <방코드> --speed 10 --airbag
```

봇을 띄운 뒤 약 2분 동안 계획서 §10 시나리오가 이어집니다.

1. 봇이 들어오면 앱이 데모 주행을 시작하고 대장 콜(안성 휴게소)을 보냅니다. 봇 로그에 `대장 콜 수신`이 찍힙니다.
2. 점호: "1호차 4명, 벨트 확인 불가", "2호차 3명 벨트 완료" 등을 선두가 읽습니다.
3. 봇 급제동, 비, 키즈 채널 끝말잇기, "화장실" 발화가 차례로 옵니다. 앱은 카드와 TTS로 받고, 쉬어 가 투표 카드를 띄웁니다.
4. 투표 결과(안성 휴게소)가 경유지로 들어갑니다. 이때 Pleos 내비가 앞으로 나오므로 앱 아이콘을 눌러 돌아옵니다.
5. 꼬리 콜과 위치 알림: 봇이 앞서가 2km 넘게 벌어지면 선두(앱)에 "일행이 11km 앞서 있습니다, 맨 앞 2호차"처럼 실제 거리로 오고, "우리 차가 대열에서 … 처졌습니다", "4호차 안성 휴게소 도착, 27km 앞" 같은 위치 알림이 카드·TTS·지도로 옵니다.
6. 긴급 콜: 4호차 봇이 에어백 전개를 보내면 빨간 전체 화면 알림이 뜹니다. "확인"으로 닫습니다.
7. 앱과 봇이 모두 안성 휴게소에서 P로 서면 서버가 `arrive`를 보내고 앱이 깃발 색으로 세 번 깜빡입니다. 봇은 15초 더 머문 뒤 나갑니다.

휴대폰 참여는 같은 서버의 `/`를 휴대폰 브라우저로 엽니다(`http://<PC IP>:8792/?code=<방코드>`). 위치와 마이크는 HTTPS나 localhost에서만 열리므로, 실기 휴대폰에서는 배포한 workers.dev 주소를 씁니다.

앱이 먼저 들어가면 1호차(선두)가 되어 회전·제한속도 콜과 점호 읽기를 맡습니다. 봇을 먼저 띄우고 앱이 나중에 들어가면 앱 위치가 선두와 5km 넘게 떨어져 있어 서버가 `rejoin`을 보냅니다.

## 에뮬레이터 확인 결과 (2026-10-31)

Pleos Connect Emulator 2.1.0, 사용자 10에서 확인하였습니다. 서버 쪽 확인은 `hello` 없이 방에 붙어 모든 메시지를 찍는 작은 WebSocket 청취 스크립트로 했습니다.

| 항목 | 결과 | 근거 |
|---|---|---|
| 방 만들기·입장 | ✅ | 로그 `입장: 1호차 (선두)`, 화면 `design/screens/driver.png` 위쪽 막대 |
| `pos` 2초 주기 | ✅ | 청취 스크립트에 1호차 `pos`가 2초마다 도착 |
| 봇 급제동·비 → 카드와 TTS | ✅ | `driver.png`의 "2호차, 8km 뒤 급제동, 감속하세요"(경고 카드), "3호차, 16km 뒤부터 비". 로그 `TTS(존 0) …` |
| 키즈 채널 무전 | ✅ | 로그 `TTS(존 2) 키즈 채널, 4호차, 끝말잇기 하자! …`, 승객 화면 카드에 "키즈 채널" 표시 |
| 앱 와이퍼 → `rain` | ✅ | Virtual Console `front_wiper=Low` 후 서버에 `{"type":"signal","kind":"rain","lat":37.3947…}` 도착 |
| 앱 방향지시등 → `turn_right` | ✅(조건부) | Virtual Console 우측 신호만으로는 내비 안내가 없어 "회전 콜 보류"로 걸러집니다(의도한 동작). 데모 주행(같은 방향 TBT를 함께 냄)에서는 서버에 `{"kind":"turn_right","distanceM":250,"from":"1호차"}` 도착 |
| 점호 | ✅ | 기어 D 후 서버에 `roll`(벨트 `null`) 도착, 승객 화면 점호 카드 "1호차 4명, 벨트 확인 불가 / 2호차 3명 벨트 완료 …" (`passenger.png`) |
| 쉬어 가 투표 | ✅ | `vote.png`(운전석 후보 카드와 남은 초), 카드를 눌러 로그 `투표: 안성 휴게소` (`passenger-vote.png`) |
| 투표 결과 → 경유지 | ✅ | 로그 `경유지 추가 요청: 안성 휴게소 (37.014, 127.28)`, 내비 쪽 로그 `OnAddWaypointRequest(… poiName=안성 휴게소 …)`, TTS "안성 휴게소, 총 14명" |
| 다시 붙기 | ✅ | 앱을 4호차로 넣었을 때 로그 `경유지 추가 요청: 선두 합류 지점 (37.4465, 127.04925)`, TTS "선두를 따라가는 경로로 바꿨습니다" |
| 주행 중 입력 막기 | ✅ | 기어 D(CarUxRestrictions 주행 중)에서 입장 화면 코드 입력과 버튼이 꺼지고 안내 문구가 바뀜 |
| STT 시작 | ✅ | 무전 버튼으로 Pleos 온디바이스 STT가 녹음을 시작(상태 표시줄 마이크, `OnDeviceSttManagerImpl recognize(com.ppeokkugi)`). 에뮬레이터에 들어오는 말이 없어 인식 결과 → `say` 경로는 승객 화면 입력창으로만 확인했습니다 |
| 단위 테스트 | ✅ | `./gradlew :app:testDebugUnitTest` 10개 통과(급제동 2초 창·감속 없음·브레이크 없음·20초 재전송 금지, 비 상승 에지·10분, 회전 선두 전용·500m·방향, 제한속도, 문장) |

이 표의 화면 이름은 당시 캡처를 가리킵니다. 2026-11-01에 새 마스코트로 모두 다시 찍었습니다(아래 표).

## 에뮬레이터 확인 결과 (2026-11-01, P1·시연 모드)

Pleos Connect Emulator 2.1.0, 사용자 10, 로컬 서버(`wrangler dev --port 8792`)에서 시연 모드와 `bots.mjs --speed 10 --airbag`으로 §10 시나리오를 끝까지 돌렸습니다. 마지막 확인(대장 콜 따르기, 에어백 주입)은 `apk/팀명_뻐꾸기_release.apk`를 설치해 했습니다.

| 항목 | 결과 | 근거 |
|---|---|---|
| 시연 모드 한 번 누르기 | ✅ | 방 생성 → `입장: 1호차 (선두), 깃발 색 #E88E7D`, 봇 명령 안내 카드(`demo-wait.png`). 봇이 들어오자 데모 주행이 시작됨 |
| 대장 콜 보내기 | ✅ | 로그 `대장 콜 보냄: {"type":"route","dest":{"lat":37.014,"lng":127.28,"name":"안성 휴게소"},…}`, 봇 3대 로그 `대장 콜 수신: 1호차 → 안성 휴게소`, 버튼으로 다시 보낸 카드(`route-share.png`) |
| 대장 콜 따르기 | ✅ | 스크립트를 1호차로 넣고 앱을 2호차로 넣은 뒤 `route`(경유 기흥 1곳)를 보냄. 로그 `대장 콜 재탐색 요청: 안성 휴게소 (37.014, 127.28) 경유 1곳`, Pleos 내비에 "안성 휴게소 · 경유지 1개 포함" 경로 미리보기(`route-follow-navi.png`), 앱 카드와 TTS(`route-follow.png`) |
| 선두만 대장 콜 | ✅ | 2호차가 `route`를 보내면 서버가 `{"type":"error","error":"route는 선두만 보낼 수 있습니다"}`로 거부(로컬 연기 테스트) |
| 꼬리 콜 | ✅ | 봇이 앞서 2km 넘게 벌어지자 로그 `TTS(존 0) 후미 2km 뒤, 천천히`, 경고 카드(`route-share.png` 아래쪽) |
| 긴급 콜 받기 | ✅ | 4호차 봇 `airbag` → 빨간 전체 화면(`emergency.png`), TTS "긴급, 4호차 에어백 전개, 22km 뒤, 위치 북위 37.014, 동경 127.280. …" |
| 긴급 콜 보내기(디버그 주입) | ✅ | 상태 탭 "에어백 전개 주입" → 로그 `자동 콜 airbag 보냄`, 청취 스크립트에 `{"type":"signal","kind":"airbag","lat":37.3947…,"from":"2호차"}` 도착 |
| 에어백 등록 | ⚠ 에뮬레이터 미지원 | 네 좌석 모두 등록하며, 로그 `에어백 ROW_1_RIGHT: … property ID … not supported: 0x2520071f`, `에어백 capability 조회 실패: ERROR_NOT_SUPPORTED_PROPERTY` |
| 깃발 색 → 앰비언트 | ✅ | `CONTROL_CAR_LIGHTS`를 추가하기 전에는 `앰비언트 색 설정 실패: setAmbientLightBrightnessColor need Permission`이었고, 추가한 뒤에는 `앰비언트 색 설정 성공: … #E88E7D`. 화면 맨 위 깃발 띠와 일행 목록 점 |
| 도착 깜빡임 | ✅ | 앱과 봇 3대가 안성 휴게소에서 P → 봇 로그 `일행 도착 알림 (4대)`, 앱 로그 `TTS(존 0) 일행이 모두 도착했습니다`, `앰비언트 깜빡임 3회 요청 (#E88E7D)`(`arrive.png`) |
| 쉬어 가·점호·경유지(회귀) | ✅ | `vote.png`, `passenger-vote.png`(점호 4대), 로그 `경유지 추가 요청: 안성 휴게소 (37.014, 127.28)`, `navi-after-waypoint.png` |
| 휴대폰 참여 | ✅(데스크톱 브라우저) | 헤드리스 Chrome(390×844, 위치 37.272, 127.114로 고정)으로 `/` 접속 → 코드 입력·동의 → `welcome` 2호차, 다른 차에 휴대폰 `pos`가 2초마다 도착. 급제동·대장 콜·무전·투표 카드(`phone-join.png`, `phone-room.png`). 음성 인식 버튼은 실기 휴대폰에서 확인하지 못했습니다 |
| 주행 중 화면 | ✅ | 데모 주행(`Driving(restricted=true)`) 동안 위쪽 막대에 "주행 중"이 뜨고, 운전석 화면은 큰 카드 3개와 큰 버튼만 보입니다(`vote.png`, `route-share.png`). 마스코트는 주행 중 `still`로 그리지만, 멈춘 것을 화면으로 따로 확인하지는 않았습니다 |
| release APK | ✅ | `apksigner verify`: `CN=Android Debug`, 에뮬레이터 사용자 10에 `adb install -r` 성공 후 실행 |
| 단위 테스트 | ✅ | 앱 `./gradlew :app:testDebugUnitTest` 10개 통과, 서버 `npm test` 28개 통과(깃발 색·도착 판정 3개·route 검증 추가) |

새 디자인(핀 카드 무전기) 화면 캡처는 `design/screens-v2/`에 있습니다. 아래 표의 `design/screens/`는 2026-11-01 픽셀 디자인 때 찍은 이전 화면입니다(`navi-after-waypoint.png`는 그보다 이전 화면).

| 파일 | 장면 |
|---|---|
| `join.png` | 입장 화면: 무전기 앞면(네모 안테나·채널 손잡이·스피커 홈), 채널 LCD에 코드 입력 |
| `demo-wait.png` | 시연 모드 대기(WAIT 표정), 봇 명령 안내 |
| `ptt-tx.png` | 무전 버튼을 누른 상태: 송신 빨강 테·네모 LED, "TX", 마이크 크기 미터, TX 표정 |
| `driver.png` | 운전석: 급제동(BRAKE)·꼬리 콜 붉은 카드, 점호 카드, 일행 목록 거리 |
| `brake-alert.png` | 비(RAIN 표정, 우산)·꼬리 콜·급제동 카드, 지도의 "급"·"비" 네모 핀 |
| `vote.png` | 운전석 쉬어 가 투표(VOTE 표정, LCD 남은 초) |
| `map-driver.png` | 운전석 일행 지도(네모 차·핀·범례), 투표 중 |
| `passenger-vote.png` | 승객 화면 투표·지도·점호·무전 기록 |
| `map-passenger.png` | 승객 화면 일행 지도·점호(ROLLCALL 표정)·무전 기록 |
| `passenger.png` | 승객 화면(2호차, 받은 대장 콜·다시 붙기 기록) |
| `route-share.png` | 선두가 보낸 대장 콜 카드("TX ▶ 대장 콜", TX 표정) |
| `route-follow.png`, `route-follow-navi.png` | 대장 콜을 받은 2호차의 카드(RX 표정)와 Pleos 내비 안내(기흥 휴게소 경유, 새 런처 아이콘) |
| `emergency.png` | 긴급 콜 전체 화면: 빨간 LCD "EMERGENCY · 2호차 에어백", 깜빡이는 송신 LED, EMERGENCY 표정 |
| `arrive.png` | 일행 도착(ARRIVE 표정), 위쪽 깃발 색 띠 깜빡임 |
| `status.png` | 상태 탭과 디버그 메뉴 |
| `phone-join.png`, `phone-room.png`, `phone-map.png` | 휴대폰 참여 웹(헤드리스 Chrome 390×844): 입장, 투표·지도, 지도·무전 버튼·도착 카드 |
| `navi-after-waypoint.png` | 경유지를 넣은 직후 앞으로 나온 Pleos 내비(이전 화면) |
| `mascot-anim.mp4`, `mascot-join.mp4`, `mascot-passenger.mp4`, `mascot-driver-once.mp4` | 화면 캡처를 이어 만든 짧은 영상: 긴급 콜·입장·승객 화면 반복 재생, 운전석 새 카드 한 번 재생 뒤 멈춤 |

## 디자인 (회색 바탕 · 흰 카드 · 주황 하나)

옅은 회색 바탕(#F2F4F6) 위에 테도 그림자도 없는 흰 카드(모서리 24dp, 안쪽 여백 20~24dp)를 놓고, 글자는 회색 단계(#191F28 본문, #4E5968 보조, #8B95A1 덧붙임)로 위계를 나눕니다. 주 색은 주황(#FF6F0F, 누르면 #E85F00, 옅은 바탕 #FFF1E6 위 글자 #B04000) 하나뿐이고, 위험은 빨강(#F04452, 옅은 바탕 #FFEEEE), 수신·안내는 파랑(#3182F6, 옅은 바탕 #E8F3FF)입니다. 성공이나 연결도 초록 대신 주황으로 보이며, 초록은 어디에도 쓰지 않습니다. 호차 색은 #F04452·#3182F6·#FFB331·#7B55FF·#FF3D8B·#14B8D4 여섯 가지로, 노란 3호차 위에는 짙은 글자를 씁니다.

예전 무전기 흉내(스피커 그릴 점, 짙은 LCD 창, 빛나는 LED, 굵은 테와 그림자)는 모두 걷어 냈습니다. 채널 코드는 옅은 주황 칩("CH 7Y2NBX · 5대")으로, 연결 상태는 작은 점과 회색 글자로 보입니다. 무전 카드 머리의 RX·TX·경고 표시는 옅은 바탕에 진한 글자를 얹은 작은 태그이고, 급제동·긴급 카드는 옅은 빨강 바탕에 빨간 글자로 띄웁니다. 무전 버튼은 폭을 다 쓰는 주황 버튼(모서리 16dp, 짙은 굵은 글자 "무전")이며, 듣는 동안에는 옅은 빨강 바탕에 빨간 "송신 중"과 주황 음량 막대로 바뀝니다.

- **색 토큰**은 앱 `ui/Theme.kt`의 `object C`와 휴대폰 `server/src/phone.html`의 `:root` 두 곳에만 둡니다. 바탕·카드 위 본문은 WCAG AA(4.5:1) 이상이고, 옅은 바탕 위 색 글자는 20sp 이상 굵은 글자(큰 글자 기준 3:1)로만 씁니다. 주황 버튼 위 글자는 흰색(2.8:1) 대신 짙은 #191F28(5.9:1)을 씁니다. 무전 카드의 보낸 쪽 칩은 호차 색을 옅게 깐 바탕에 짙은 글자와 호차 색 점을 얹어, 청록·분홍 호차에서도 글자가 읽히게 합니다.
- **글꼴**: 모두 Pretendard(Regular·SemiBold·Bold·ExtraBold)입니다. 화면 제목은 Bold 36~40sp, 구역 이름은 SemiBold 회색(#4E5968), 본문은 SemiBold입니다. 운전석 본문은 24sp, 무전 카드 글은 36sp 아래로 내리지 않습니다. 라이선스는 `app/src/main/assets/licenses/OFL-Pretendard.txt`. 휴대폰은 jsDelivr Pretendard를 씁니다.
- **모양**(`ui/Radio.kt`): 흰 카드(`card`), 작은 태그(`Tag`), 상태 점(`Dot`, 깜빡임 가능), 둥근 회색·파랑 막대 파형(`Waveform`), 표정 색으로 옅게 칠한 마스코트 칸(`SpeakerBox`), 누르면 짙어지고 살짝 작아지는 버튼(`SoftButton`, 모서리 16dp). 칩·태그 모서리는 10dp입니다.
- **무전 버튼**: 듣는 동안 STT `onUpdatedRms` 값으로 미터를 채웁니다(`Voice.level`, 범위 0~10 가정).
- **표정**(`Mood`): 그림은 기본·무전·경고·휴게·점호·키즈 6종이고, TX·RX·BRAKE·RAIN·CAMERA·LOST·VOTE·ARRIVE·EMERGENCY·WAIT는 `Mood.fallback`으로 이 중 하나를 씁니다. 휴대폰은 `server/public/cuckoo/<이름>.svg`를 씁니다. 표정 그림이 한 장(`cuckoo_<표정>_0.png`)뿐이면 `CuckooView`가 움직임을 대신 붙입니다. 계속 재생(LOOP)은 높이의 4%만큼 900ms 간격으로 천천히 들썩이고, 한 번 재생(ONCE)은 톡 튀어나온 뒤 멈추며, 정지(STILL)는 움직이지 않습니다. 프레임이 여러 장이면 예전처럼 프레임을 바꿔 가며 돌립니다.
- **검증**: 이전 픽셀 디자인(2026-11-01) 때 앱 단위 테스트 12개·서버 `npm test` 36개 통과를 확인했습니다. 새 디자인으로 바꾼 뒤의 테스트·APK 결과는 이 문서에 아직 적지 않았습니다.

## 에뮬레이터 확인 결과 (2026-11-01, 일행 지도·위치 알림)

로컬 서버, 시연 모드, `bots.mjs --speed 10`, 헤드리스 Chrome 휴대폰(390×844, 위치 37.30, 127.115 고정)을 같은 방에 넣어 확인했습니다.

| 항목 | 결과 | 근거 |
|---|---|---|
| 운전석·승객 지도 | ✅ | 차 5대 마커·이름표·우리 차 흰 테, 이슈 핀(급·비·이·좌/우)과 범례(`map-driver.png`, `map-passenger.png`). 타일은 OSM에서 받아 옵니다 |
| 급제동 end-to-end | ✅ | 시험 차를 넣어 `brake_hard`를 보냄 → 앱 로그 `TTS(존 0) 6호차, 26km 뒤 급제동, 감속하세요`, 빨간 카드와 지도 "급" 핀(`brake-alert.png`). 봇 급제동은 휴대폰에서 "3호차, 16km 뒤 급제동, 감속하세요" |
| 위치 알림 | ✅ | `우리 차가 대열에서 11km 처졌습니다`, `2호차, 6.4km 앞, 대열에서 처졌습니다`, `5호차 안성 휴게소 도착, 27km 앞`, 꼬리 콜 `일행이 11km 앞서 있습니다, 맨 앞 2호차` |
| 입장 때 알림 몰림 | ✅ 고침 | 처음에는 봇 3대가 들어오자마자 처짐·도착·다시 붙음이 한꺼번에 9줄 나왔습니다. 들어온 뒤 20초는 말하지 않게 한 뒤 다시 돌려 사라진 것을 확인했습니다 |
| 마스코트 | ✅ | `mascot-anim.mp4`(긴급 콜) 프레임 22개 모두 캐릭터 영역이 바뀜, `mascot-passenger.mp4` 카드·점호 캐릭터가 11프레임 중 7·9번 바뀜, `mascot-driver-once.mp4` 새 급제동 카드 캐릭터가 처음에는 바뀌다가 끝난 뒤로는 그대로. 입장 화면은 1.5초 간격 화면 캡처 4장에서 두 캐릭터 자세가 모두 달랐습니다 |
| 단위 테스트 | ✅ | 앱 12개(문장 거리 형식·서버 `gapM`/`notice` 해석 추가), 서버 36개(대열 순서·거리 문장·꼬리 콜 문장·처짐/다시 붙음·도착·정차·쿨다운·요약·입장 20초 추가) |

## 알려진 한계

- **에뮬레이터 과부하(2026-11-01)**: 512px 움직이는 WebP를 카드마다 디코드하던 때 시연 중 에뮬레이터 부하가 28까지 올라 `pm install`이 멈췄고(`adb reboot`으로 풀림), 경유지로 Pleos 내비가 앞으로 나올 때 앱이 두 번 ANR(입력 5초 무응답, 메인 스레드는 `activityTopResumedStateLost` 바인더 호출에서 대기)을 냈습니다. 같은 때 내비 앱도 ANR을 여러 번 냈습니다. 이후 마스코트를 64px 스프라이트 시트 한 장 그리기로 바꿨고, 재부팅한 에뮬레이터의 마지막 시연(투표·경유지 포함)에서는 ANR이 다시 나지 않았지만 부하 원인을 앱으로 좁히지는 못했습니다.
- **마이크 미터**: 에뮬레이터에는 실제 마이크 입력이 없어 미터가 움직이는 것은 확인하지 못했습니다. RMS 범위(`Voice.RMS_MAX`)는 실차에서 맞춥니다. 휴대폰 미터도 헤드리스 Chrome에서는 마이크를 열 수 없어 확인하지 못했습니다.
- **APK 크기**: 픽셀 디자인 때 제출용 APK는 67.5MB였습니다. 새 디자인은 Galmuri를 빼고 Pretendard 4개를 넣었으며, 새 APK 크기는 아직 재지 않았습니다.
- **화자 식별**: `AmbientAiApi.setRecognitionResultListener`가 "privileged 앱만 사용 가능" 오류를 냅니다. 일반 앱은 화자 id를 받을 수 없으므로 승객 화면에서 고른 좌석을 화자로 보냅니다.
- **호출어 "무전"**: STT의 호출어 설정(`WakeUpWordConfig`)은 음성 모델 데이터가 필요하고 같은 privileged API에 있어 넣지 않았습니다. 지금은 무전 버튼만 씁니다.
- **좌석별 스피커**: `setAudioZoneId`는 예외 없이 호출되지만(`audioInfo={"zoneId":2}`) 에뮬레이터 스피커가 하나라 실제로 좌석별로 나뉘는지는 확인하지 못했습니다. 그래서 채널 이름을 붙여 읽는 대안을 기본으로 켜 두었습니다.
- **경유지 추가 시 화면 전환**: `addWaypoint`를 부르면 Pleos 내비가 앞으로 나와 뻐꾸기 화면을 가립니다(`navi-after-waypoint.png`). 경로가 걸려 있지 않은 상태에서는 경유지가 지도에 그려지는지도 확인하지 못했습니다.
- **TTS 겹침**: Pleos TTS는 새 `speak`가 앞 발화를 끊으므로 앱 안에서 한 줄씩 차례로 읽습니다(`onDone` 또는 글 길이로 잡은 시간 뒤 다음 줄).
- **재접속 후 호차 번호**: 재입장 토큰은 앱이 켜져 있는 동안만 메모리에 들고 있습니다. 앱을 껐다 켜서 같은 코드로 들어오면 새 번호를 받습니다(휴대폰 웹은 탭을 닫기 전까지 `sessionStorage`에 둡니다). `wrangler dev`는 `server/src` 파일이 바뀌면 다시 시작하면서 연결을 모두 끊으므로, 시연 중에는 서버 파일을 고치지 마십시오.
- **앞·뒤 판정**: 견주는 차 중 하나라도 경로상 남은 거리를 보내지 않으면(휴대폰, 내비 미연결, 합류 지점처럼 다른 곳으로 안내 중) 직선 거리로 돌아가므로 굽은 길에서 틀릴 수 있습니다. 대장 콜(목적지)이 없으면 호차 번호 규칙으로 돌아갑니다. 에뮬레이터에서 `onDrivingInfo`가 남은 거리(61000m 등)를 주는 것은 확인했지만, 실제로 달리며 값이 줄어드는 것은 보지 못했습니다.
- **위치 알림 상태**: 처짐·도착한 곳·쿨다운·목적지·최근 위치(30초 안)를 위치를 받을 때마다 저장소 `mem`에 적고, Durable Object가 쉬었다 깨면 첫 메시지에서 되살립니다. 대열 이탈 판정 중인 시각(30초 기준)은 저장하지 않아 깨어난 뒤 다시 잽니다. 로컬에서는 연결을 연 채 `wrangler dev`를 죽였다 다시 띄워 목적지·위치·호차 번호가 돌아오는 것을 확인했고, 실제 히베르네이션으로는 확인하지 못했습니다.
- **지도 타일**: OSM 공개 타일 서버를 씁니다. 오프라인에서는 회색 바탕에 마커만 보이고, 실서비스라면 타일 사용 정책에 맞는 타일 공급자가 필요합니다. 차가 수십 m 안에 겹치면 이름표가 겹칩니다.
- **휴대폰 지도**: Leaflet을 cdnjs에서 받으므로 그 주소가 막히면 지도 칸을 숨기고 나머지만 씁니다. 휴대폰 마스코트 WebP가 실제로 움직이는지는 헤드리스 캡처로만 봐서 눈으로 확인하지 못했습니다.
- **screenrecord**: 에뮬레이터 `screenrecord`는 화면이 바뀔 때만 프레임을 내고 시간축이 줄어 녹화가 실제보다 짧고 끊겨 보입니다. 움직임 여부는 프레임 비교로 확인했습니다.
- **급제동 실측**: 속도는 연속 위치로 계산하므로 에뮬레이터에서 급제동 콜이 나가는 것은 확인하지 못했고 단위 테스트로만 확인했습니다.
- **에어백**: 에뮬레이터가 속성을 지원하지 않아 실제 전개 신호는 받아 보지 못했습니다. 등록 코드는 그대로 두었고, 시연은 상태 탭 디버그 주입으로 합니다.
- **대장 콜의 경로 출처**: 선두 내비에 경로가 없으면 시연 목적지(안성 휴게소)를 보냅니다. 에뮬레이터에서 선두 내비 경로가 바뀔 때 `onDestinationInfo`로 자동 공유되는 것은 확인하지 못했습니다(버튼 공유만 확인). 받는 차의 `requestRouteWithWaypoints`도 내비에 경로 미리보기를 띄우는 데까지만 확인했습니다.
- **앰비언트 조명**: 에뮬레이터는 색 설정에 성공 콜백을 주지만 화면에 조명이 없어 실제 색과 깜빡임은 눈으로 확인하지 못했습니다. 깜빡임은 색을 검정(0)과 깃발 색으로 번갈아 바꾸는 방식이며, 색 값 형식(0xRRGGBB)은 실차에서 확인해야 합니다.
- **도착 판정**: 시연 모드 밖에서 에뮬레이터 실제 위치를 쓰면 봇과 150m 안에 들 수 없어 도착 알림이 나오지 않습니다.
- **휴대폰 참여**: 위치와 음성 인식은 HTTPS나 localhost에서만 열립니다. 실기 휴대폰 확인은 workers.dev 배포 뒤에 해야 합니다. 브라우저 `SpeechRecognition`은 Chrome·Safari에서만 동작하며, 없으면 버튼을 끄고 글 입력만 남깁니다.
- **봇 시연 중 이탈 판정**: 봇이 앱보다 빨리 달려 서버가 봇에게 `rejoin`을 계속 보냅니다(봇은 로그만 남깁니다).
- **애니메이션 마스코트**: 카드마다 `AnimatedImageDrawable`을 따로 디코드합니다. 승객 화면 무전 기록이 길어지면 화면에 보이는 카드 수만큼 애니메이션이 돕니다.
- **긴 글 줄이기**: 규칙 요약이라 STT가 문장 부호 없이 길게 받아 적으면 말버릇만 지우고 그대로 보냅니다. 온디바이스 LLM 요약은 아직 붙이지 않았습니다.
- **에뮬레이터 부하**: 개발 PC 메모리가 부족할 때 APK 설치 중 system_server가 watchdog으로 재시작되어 부팅이 반복된 적이 있습니다. Gradle 데몬을 내리고(`./gradlew --stop`) 에뮬레이터를 재부팅한 뒤 정상 설치되었습니다. 2026-11-01 시연 중에도 경유지 추가로 내비가 앞으로 나온 뒤 system_server가 한 번 죽었고(`DeadSystemException`), 다시 시작한 뒤에는 사용자 0에 머물러 앱 액티비티를 찾지 못했습니다. `./gradlew --stop`, `adb reboot` 뒤 사용자 10으로 돌아와 같은 시나리오가 끝까지 통과했습니다.

## 구조

```
app/src/main/java/com/ppeokkugi/
  car/        CarEvent, CarBridge, Navi, Locator, Demo (길품에서 이식)
  domain/     AutoCall(자동 콜 규칙), Phrase(읽을 문장·거리 형식·긴 무전 줄이기·"1번" 인식)
  net/        RoomClient(OkHttp WebSocket), RoomMsg
  voice/      Voice (TTS 차례 읽기·setAudioZoneId, STT)
  ui/         AppScreen(탭·채널 LCD·깃발 띠·긴급 콜 전체 화면), RoomScreens(입장·운전석·승객),
              StatusScreen(디버그 메뉴), Cuckoo(마스코트 CuckooView·Play), GroupMap(일행 지도),
              Radio(무전기 부품: LCD·LED·그릴·파형), Theme(색 토큰·글꼴)
  StatusViewModel.kt   차량 신호·방 메시지·음성을 잇는 화면 상태
  RoomService.kt       방에 있는 동안 내비 뒤에서도 앱을 살려 두는 포그라운드 서비스
  MainActivity.kt
app/src/test/java/com/ppeokkugi/domain/AutoCallTest.kt
server/src/   index.js(Worker, / 휴대폰 화면), room.js(Durable Object), logic.js(판정·위치 알림), phone.html, data.js
server/public/cuckoo/   휴대폰 화면 마스코트(design/character 의 3D PNG 512px 사본, Worker 정적 자산)
server/scripts/bots.mjs   시연용 가상 차량 3대
apk/팀명_뻐꾸기_release.apk   제출용 APK(debug 키 서명)
```
