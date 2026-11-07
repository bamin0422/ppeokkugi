# 뻐꾸기 (Ppeokkugi)

버튼 한 번으로 일행 차·버스 전부에 동시에 말하고, 급제동·처짐·도착은 차가 대신 알리는 Pleos 차량용 단체 무전 앱입니다.

목표는 **운전 중에도 일행 전체와 끊기지 않는 연락**입니다. 현대자동차그룹 차량용 앱 개발 공모전 출품작입니다.

## 바뀌는 연락 방식

| 지금 | 뻐꾸기 |
|---|---|
| 전화 3통 | 버튼 1번 |
| 단톡 확인 불가 | 스피커 음성 전달 |
| 앞차 급제동 늦은 인지 | 자동 무전 |
| "어디야?" 반복 확인 | 위치·도착 자동 보고 |
| 휴게소 제각각 결정 | 투표 후 전 차량 경유지 |

## 구성

```
app/      Pleos 차량 앱 (Kotlin, Jetpack Compose, Android Automotive)
server/   무전 채널 서버 (Cloudflare Worker + Durable Object, 방 1개 = 채널 1개)
          src/phone.html  Pleos가 없는 일행용 휴대폰 웹
          scripts/bots.mjs  시연용 가상 차량 3대
docs/     서비스 소개서, 시연 영상, 개발 문서(docs/개발_README.md)
```

사용하는 Pleos SDK는 Vehicle 2.3.2, NaviHelper 3.0.5, FusedLocation 1.1.3, TextToSpeech 3.3.1, SpeechToText 3.3.1입니다.

## 바로 설치하기 (APK)

제출용 APK는 [Releases](https://github.com/bamin0422/ppeokkugi/releases/tag/v1.0)의 `ppeokkugi_release.apk`입니다. 별도 키스토어가 없어 release 빌드도 Android debug 키로 서명했습니다.

```bash
adb install -r ppeokkugi_release.apk
adb shell am start -n com.ppeokkugi/.MainActivity
```

앱을 켜고 약 20초 뒤 SDK가 모두 연결됩니다. "상태" 탭에서 플랫폼·내비·TTS·STT 연결을 확인할 수 있습니다.

## 빌드

JDK 17과 Android SDK 35가 필요합니다. Pleos SDK는 `settings.gradle.kts`에 등록한 Maven 저장소에서 받습니다.

```bash
./gradlew :app:assembleDebug     # 디버그 APK
./gradlew :app:assembleRelease   # 제출용 APK
```

## 시연 실행 (에뮬레이터 + 서버 + 가상 차량)

```bash
# 1) 서버
cd server && npm install && npx wrangler dev --port 8792

# 2) 앱 설치와 권한 (에뮬레이터 사용자 10)
adb install -r --user 10 ppeokkugi_release.apk
for p in android.permission.ACCESS_FINE_LOCATION android.permission.RECORD_AUDIO pleos.car.permission.FUSED_LOCATION; do
  adb shell pm grant --user 10 com.ppeokkugi $p
done
adb shell am start --user 10 -n com.ppeokkugi/.MainActivity

# 3) 앱 입장 화면에서 "시연 모드 · 봇과 함께 달리기"를 누르고, 화면에 뜬 명령으로 가상 차량을 띄웁니다
cd server && node scripts/bots.mjs <방코드> --speed 10 --airbag
```

약 2분 동안 점호, 대장 콜, 급제동·비 자동 콜, 키즈 채널, 휴게소 투표와 경유지 등록, 꼬리 콜, 긴급 콜, 전원 도착이 차례로 이어집니다. 앱은 에뮬레이터에서 `10.0.2.2:8792`로 서버에 접속합니다. 다른 주소를 쓰려면 `local.properties`에 `SYNC_URL=`을 넣습니다.

휴대폰 참여는 서버의 `/`를 브라우저로 열어 방 코드를 넣습니다. 위치와 마이크는 HTTPS나 localhost에서만 열립니다.

## 차량 신호 주입 (Virtual Console)

```bash
adb forward tcp:8088 tcp:8088
B=http://127.0.0.1:8088/vehicle
curl -X POST "$B/body?front_wiper=Low"   # 와이퍼 켜기 → 비 콜
curl -X POST "$B/gear?gear=Drive"        # 기어 D → 점호
curl -X POST "$B/gear?gear=Park"         # 기어 P → 도착 판정
```

에뮬레이터가 지원하지 않는 에어백은 "상태" 탭의 디버그 버튼으로 주입합니다.

## 테스트

```bash
./gradlew :app:testDebugUnitTest   # 차량 앱 단위 테스트 12건
cd server && npm test              # 서버 테스트 36건
```

## 확인 환경

- Pleos Connect Emulator 2.1.0, 에뮬레이터 사용자 10
- 서버: wrangler 4.40.0 로컬 실행
- 확인한 것: 브레이크·와이퍼·방향지시등·기어·착석 신호, 경유지 추가와 경로 재탐색, 오디오 존 0~3 호출, 앰비언트 조명 설정
- 실차에서 확인할 것: 실제 마이크 입력, 좌석별 소리 분리, 실제 조명 색, 안전벨트·에어백 신호

## 알려진 한계

- 말하기는 화면 버튼을 누르는 방식입니다. 핸들 버튼과 호출어는 지원하지 않습니다.
- 버스의 Pleos 탑재 여부는 확인하지 못했습니다. 버스 적용은 Pleos 탑재 버스를 전제로 한 계획입니다.
- 운수사 관제석(`/control`)과 차량별 운행 보고서는 관제 키로 보호합니다. 키가 주소에 실리므로 운수사 계정 로그인은 확대 계획입니다.
- 다시 접속하면 호차 번호가 바뀝니다. 앞뒤 순서는 목적지까지의 직선 거리로 판정합니다.

## 안전·개인정보 원칙

음성 원본은 차 밖으로 보내지 않고 받아 적은 글만 보냅니다. 단속 카메라 위치는 공유하지 않습니다. 위치는 방에 있는 동안만 공유하며 방은 마지막 활동 후 24시간이 지나면 기록과 함께 지웁니다. 자동 콜은 안전장치가 아니라 미리 알리는 안내입니다.
