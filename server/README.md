# 뻐꾸기 서버

Cloudflare Worker + Durable Object 기반 실시간 차량 릴레이 서버입니다.

## 실행

```bash
npm install
npm run dev          # localhost:8792
```

## 테스트

```bash
npm test             # node --test 단위 테스트
```

## 봇 시연

서버를 먼저 띄운 뒤:

```bash
# 방 만들기
CODE=$(curl -s -X POST http://localhost:8792/api/rooms | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).code))")

# 봇 3대 주행 (10배속). --airbag 은 투표 뒤 긴급 콜, --wait 는 도착 대기 최대 초(기본 180)
node scripts/bots.mjs $CODE --speed 10 --airbag
```

봇은 경로 끝(안성 휴게소)에서 P로 서서 위치를 계속 보내고, 일행 도착(`arrive`)을 받으면 15초 뒤 나갑니다. 봇이 1호차일 때만(앱이 나중에 들어온 경우) 대장 콜을 보냅니다.

## 운수사 통합 관제

운수사 구독 전용입니다. 일반 방(차량 앱이 만드는 방)에는 관제석과 보고서가 없습니다.

- 운수사 방 만들기: `POST /api/rooms` 본문 `{"fleet": true}` → `{ code, controlKey }`. 관제 키는 방에 한 번만 심깁니다.
- 관제석: 브라우저로 `/control`을 열어 "운수사 방 새로 만들기" 또는 `/control?code=XXXXXX#key=...`. WebSocket `hello`에 `role: "control", key`를 보냅니다. 관제석은 호차 번호를 받지 않고 위치를 보내지 않으며, 투표·도착·꼬리 콜 판정의 차량 수에서 빠집니다. 보낼 수 있는 것은 `say`(전 기사 공지, 보낸 이 "관제")뿐입니다.
- 차량별 운행 보고서: `GET /api/rooms/{code}/report?key=...` HTML, `&format=json`은 JSON. 차량마다 입장·도착 시각, 운행 시간, 거리, 최고 속도, 급제동·에어백·이탈 횟수, 무전 횟수, 점호 인원과 운행 타임라인(관제 공지 포함)이 들어갑니다. 키가 없거나 틀리면 403입니다.
- 무전은 횟수만 세고 내용은 저장하지 않습니다. 기록은 방과 함께 마지막 활동 24시간 후 지워집니다.
- 한계: 관제 키가 주소에 실립니다. 운수사 계정 로그인이 생기면 세션으로 바꿉니다.

## 휴대폰 참여

`GET /`이 휴대폰 웹 한 장(`src/phone.html`)을 줍니다. `/?code=ABC234`로 열면 코드가 미리 들어갑니다. 위치 공유에 동의하면 방에 들어가 2초마다 `pos`를 보내고, "누르고 말하기"(브라우저 `SpeechRecognition`)나 글 입력으로 `say`를 보냅니다. 위치와 마이크는 HTTPS나 localhost에서만 열립니다.

## 메시지 프로토콜

모든 메시지는 UTF-8 JSON이며 `type` 필드로 구분합니다. 최대 8KB.

| type | 방향 | 설명 |
|---|---|---|
| `hello` | 클→서버 | 입장. 서버가 `welcome`으로 carNum, flagColor(보낸 색이 없으면 호차 번호로 정함), 먼저 들어온 차 목록 `cars`(from, nickname, flagColor, 마지막 lat/lng)를 응답 |
| `pos` | 클→서버 | 위치(lat, lng, heading, speed, park). 2초마다. park 는 기어 P 여부(모르면 생략) |
| `signal` | 클→서버 | brake_hard·rain·turn_left·turn_right·speed_limit·caution·airbag. 서버는 받는 차마다 `gapM`(보낸 차와의 실제 거리, 미터)과 `ahead`(보낸 차가 앞인지)를 붙여 보낸다. 받는 차 위치를 모르면 붙이지 않는다 |
| `say` | 클→서버 | text, channel(all·adult·kids), seat, speaker |
| `roll` | 클→서버 | 좌석별 occupied/buckled |
| `route` | 선두→서버 | 대장 콜. dest {lat, lng, name}, waypoints(최대 2곳). 1호차가 아니면 `error`로 거부 |
| `vote` | 클→서버 | 쉬어 가 투표. choice: 후보 인덱스 |
| `vote_open` | 서버→전체 | 투표 시작. candidates, timeoutMs |
| `vote_result` | 서버→전체 | winner, totalPeople |
| `rejoin` | 서버→해당차 | 이탈 차량에 waypoint 전달 |
| `say`(system) | 서버→1호차 | 꼬리 콜. 맨 앞·맨 뒤 차가 2km 넘게 벌어지면 5분에 한 번, 실제 거리로 "후미 3호차 3.3km 뒤, 천천히" |
| `notice` | 서버→차마다 | 각자 위치 알림. kind: fall_behind·catch_up·place·long_stop·summary, target(그 차), lat/lng, text(받는 차 기준 문장). 같은 차·같은 종류 2분 쿨다운, 들어온 뒤 20초는 보내지 않음 |
| `arrive` | 서버→전체 | 2대 이상이 모두 서 있고(park, 또는 park 없이 5km/h 미만) 서로 150m 안. 한 번 보내고 누가 움직이면 다시 판정 |

서버는 `from`(호차 레이블)과 `at`(서버 타임스탬프)을 모든 릴레이 메시지에 덧씌웁니다.  
앞뒤는 선두가 `route`로 보낸 목적지까지 남은 직선 거리로 정합니다. 목적지가 없으면 호차 번호가 작은 차가 앞입니다.  
`public/`은 Worker 정적 자산(`[assets]`)입니다. 휴대폰 화면 마스코트 `/cuckoo/*.webp`를 줍니다.  
단속 카메라 공유는 지원하지 않습니다.

## 검증 결과

- `npm test`: logic.js 단위 테스트 36개 통과(2026-11-01 대열 순서·거리 문장·꼬리 콜 문장·위치 알림 8개 추가). 이전: 28개 (투표 집계·쉬어가 조건·이탈 판정·꼬리 거리·메시지 검증·route 검증·깃발 색·도착 판정)
- 로컬 연기 테스트(2026-11-01): `welcome`에 flagColor와 `cars`, 2호차의 `route` 거부, 1호차 `route` 전달, 두 차가 P로 33m 안에 서면 `arrive` 한 번, `GET /` 200 `text/html`
- 로컬 연기 테스트: `POST /api/rooms` 방 생성 → WebSocket 2개 연결 → pos/signal 릴레이, "화장실" say → vote_open, 8KB 초과 거부, 미지 타입 거부 모두 확인
