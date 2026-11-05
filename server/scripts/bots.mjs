#!/usr/bin/env node
// 가상 차량 봇 — 시연용
// 사용법: node scripts/bots.mjs <방코드> [--speed <배속>] [--url <서버URL>]
// 예: node scripts/bots.mjs ABCDEF --speed 10
//     --real-pace : 위치 간격을 실제 100km/h 에 맞춘다(1배속이면 약 37분)
//     --airbag  : 투표 뒤 3번째 봇이 에어백 전개(긴급 콜)를 보낸다
//     --wait <초>: 도착 뒤 일행 도착(arrive)을 기다리는 최대 시간. 기본 180초

import { DEMO_ROUTE } from '../src/data.js';
import { haversine } from '../src/logic.js';

// --- 인수 파싱 ---
const args = process.argv.slice(2);
const roomCode = args.find(a => !a.startsWith('--'));
if (!roomCode) {
  console.error('사용법: node scripts/bots.mjs <방코드> [--speed <배속>] [--url <URL>]');
  process.exit(1);
}
const speedIdx = args.indexOf('--speed');
const SPEED = speedIdx >= 0 ? Number(args[speedIdx + 1]) : 10; // 기본 10배속
const urlIdx = args.indexOf('--url');
const BASE_URL = urlIdx >= 0 ? args[urlIdx + 1] : 'ws://localhost:8792';
const WS_URL = `${BASE_URL}/api/rooms/${roomCode}/ws`;
const AIRBAG = args.includes('--airbag');
const waitIdx = args.indexOf('--wait');
const WAIT_S = waitIdx >= 0 ? Number(args[waitIdx + 1]) : 180;
let arrived = null; // arrive 를 받으면 풀리는 약속
const arrivedP = new Promise(r => { arrived = r; });


// --- 경로 보간 ---
// waypoints 배열에서 totalPoints 개로 균등 보간
function interpolateRoute(waypoints, totalPoints) {
  const points = [];
  const segments = waypoints.length - 1;
  const perSeg = Math.ceil(totalPoints / segments);
  for (let i = 0; i < segments; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    for (let j = 0; j < perSeg; j++) {
      const t = j / perSeg;
      points.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
    }
  }
  points.push(waypoints[waypoints.length - 1]);
  return points;
}

// 기본 200포인트는 2초 한 칸에 약 310m를 가서 보내는 속도(100km/h)보다 빠르다. 촬영 타이밍을 위해 남겨 둔다
// --real-pace 는 2초에 100km/h 만큼(약 56m)씩 가도록 점을 늘린다. 운행 보고서의 시간·거리·속도가 서로 맞는다
const REAL_PACE = args.includes('--real-pace');
const routeM = DEMO_ROUTE.slice(1).reduce((m, p, i) => m + haversine(DEMO_ROUTE[i].lat, DEMO_ROUTE[i].lng, p.lat, p.lng), 0);
const ROUTE = interpolateRoute(DEMO_ROUTE, REAL_PACE ? Math.round(routeM / (100 / 3.6 * 2)) : 200);

// --- 봇 정의 ---
const BOTS = [
  { nickname: '선두차(봇)', flagColor: '#E53E3E', seats: [{ id: 'driver', occupied: true }, { id: 'passenger', occupied: true }, { id: 'rear-l', occupied: true }, { id: 'rear-r', occupied: false }] },
  { nickname: '2호차(봇)', flagColor: '#2B6CB0', seats: [{ id: 'driver', occupied: true }, { id: 'passenger', occupied: true }, { id: 'rear-l', occupied: true }] },
  { nickname: '3호차(봇)', flagColor: '#276749', seats: [{ id: 'driver', occupied: true }, { id: 'passenger', occupied: true }, { id: 'rear-l', occupied: true }, { id: 'rear-r', occupied: true }] },
];

// 시뮬레이션 시간 → 실제 ms
const sim = ms => ms / SPEED;

// --- 봇 클래스 ---
class Bot {
  constructor(idx, config) {
    this.idx      = idx;
    this.config   = config;
    this.ws       = null;
    this.carNum   = null;
    this.routeIdx = 0;
    this.posTimer = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      // 약간 지연 (봇마다 순서대로 입장)
      setTimeout(() => {
        this.ws = new WebSocket(WS_URL);
        this.ws.addEventListener('open', () => {
          // hello
          this._send({ type: 'hello', nickname: this.config.nickname, flagColor: this.config.flagColor, seats: this.config.seats });
        });
        this.ws.addEventListener('message', ev => {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'welcome') {
            this.carNum = msg.carNum;
            console.log(`[봇${this.idx + 1}] 입장 완료: ${msg.carLabel}`);
            resolve();
          }
          if (msg.type === 'vote_open') {
            console.log(`[봇${this.idx + 1}] 투표 시작 — 후보: ${msg.candidates.map(c => c.name).join(', ')}`);
            // 안성 휴게소(마지막 후보)에 투표
            const anseongIdx = msg.candidates.findIndex(c => c.id === 'anseong');
            const choice = anseongIdx >= 0 ? anseongIdx : msg.candidates.length - 1;
            setTimeout(() => this._send({ type: 'vote', choice }), sim(3_000));
          }
          if (msg.type === 'vote_result') {
            console.log(`[봇${this.idx + 1}] 투표 결과: ${msg.winner.name}, 총 ${msg.totalPeople}명`);
          }
          if (msg.type === 'rejoin') {
            console.log(`[봇${this.idx + 1}] 합류 경로 수신: ${JSON.stringify(msg.waypoint)}`);
          }
          if (msg.type === 'route') {
            console.log(`[봇${this.idx + 1}] 대장 콜 수신: ${msg.from} → ${msg.dest?.name} (${msg.dest?.lat}, ${msg.dest?.lng})`);
          }
          if (msg.type === 'arrive') {
            console.log(`[봇${this.idx + 1}] 일행 도착 알림 (${msg.cars}대)`);
            arrived();
          }
          if (msg.type === 'signal' && msg.kind === 'airbag') {
            console.log(`[봇${this.idx + 1}] 긴급 콜 수신: ${msg.from} 에어백 (${msg.lat}, ${msg.lng})`);
          }
          if (msg.type === 'say' && msg.system) {
            console.log(`[봇${this.idx + 1}] 시스템 알림: ${msg.text}`);
          }
        });
        this.ws.addEventListener('error', e => {
          console.error(`[봇${this.idx + 1}] 오류:`, e.message ?? e);
          reject(e);
        });
        this.ws.addEventListener('close', () => {
          console.log(`[봇${this.idx + 1}] 연결 종료`);
          clearInterval(this.posTimer);
        });
      }, this.idx * 200); // 200ms 간격 입장
    });
  }

  startDriving() {
    // pos 2초마다 (배속 적용)
    this.posTimer = setInterval(() => {
      if (this.routeIdx >= ROUTE.length) {
        // 도착: 기어 P 로 서서 계속 위치를 보낸다(일행 도착 판정용)
        const end = ROUTE[ROUTE.length - 1];
        if (!this.parked) console.log(`[봇${this.idx + 1}] 목적지 도착, 주차`);
        this.parked = true;
        this._send({ type: 'pos', lat: end.lat - this.idx * 0.0003, lng: end.lng, heading: 180, speed: 0, park: true });
        return;
      }
      const pt = ROUTE[this.routeIdx++];
      // 오프셋: 봇마다 약간 다른 위치
      const offset = this.idx * 0.0003;
      this._send({ type: 'pos', lat: pt.lat - offset, lng: pt.lng, heading: 180, speed: 100, park: false });
    }, sim(2_000));
  }

  sendRoll() {
    this._send({ type: 'roll', seats: this.config.seats.map(s => ({ ...s, buckled: s.occupied })) });
    console.log(`[봇${this.idx + 1}] 점호 전송`);
  }

  sendSignal(kind) {
    const pt = ROUTE[Math.min(this.routeIdx, ROUTE.length - 1)];
    this._send({ type: 'signal', kind, lat: pt.lat, lng: pt.lng });
    console.log(`[봇${this.idx + 1}] 신호: ${kind}`);
  }

  /** 선두 봇이면 대장 콜(route)을 보낸다 */
  sendRoute() {
    if (this.carNum !== 1) return;
    const dest = DEMO_ROUTE[DEMO_ROUTE.length - 1];
    this._send({ type: 'route', dest: { lat: dest.lat, lng: dest.lng, name: '안성 휴게소' }, waypoints: [] });
    console.log(`[봇${this.idx + 1}] 대장 콜: 안성 휴게소로 경로 공유`);
  }

  sendSay(text, channel = 'all', seat = null) {
    this._send({ type: 'say', text, channel, seat, speaker: this.config.nickname });
    console.log(`[봇${this.idx + 1}] say(${channel}): ${text}`);
  }

  _send(obj) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  close() {
    clearInterval(this.posTimer);
    this.ws?.close();
  }
}

// --- 시연 시나리오 실행 ---
async function main() {
  console.log(`방 코드: ${roomCode} | 배속: ${SPEED}x | 서버: ${BASE_URL}`);
  const bots = BOTS.map((cfg, i) => new Bot(i, cfg));

  // 순서대로 입장
  for (const bot of bots) await bot.connect();
  console.log('\n--- 시나리오 시작 ---');

  // T+0: 점호
  await sleep(sim(1_000));
  for (const bot of bots) bot.sendRoll();

  // T+3s(시뮬): 주행 시작
  await sleep(sim(3_000));
  for (const bot of bots) bot.startDriving();
  console.log('[전체] 주행 시작');
  // 봇이 1호차일 때만(앱이 나중에 들어온 경우) 대장 콜
  bots[0].sendRoute();

  // T+30s: 1호차 급제동
  await sleep(sim(30_000));
  bots[0].sendSignal('brake_hard');

  // T+60s: 2호차 와이퍼 켬(비)
  await sleep(sim(30_000));
  bots[1].sendSignal('rain');

  // T+90s: 3호차 키즈 채널 무전
  await sleep(sim(30_000));
  bots[2].sendSay('끝말잇기 하자! 내가 먼저: 사과', 'kids', 'rear-l');

  // T+120s: 3호차 할머니 "화장실 가고 싶다" → vote_open 트리거
  await sleep(sim(30_000));
  bots[2].sendSay('할머니가 화장실 가고 싶다고 하셔', 'all');

  // T+150s: 투표가 끝난 뒤(30초 실시간) 긴급 콜
  await sleep(Math.max(sim(30_000), 31_000));
  if (AIRBAG) bots[2].sendSignal('airbag');

  // 일행이 모두 도착(arrive)할 때까지 기다린다. 봇은 경로 끝에서 P 로 선다
  console.log(`[전체] 일행 도착 대기 (최대 ${WAIT_S}초)`);
  await Promise.race([arrivedP, sleep(WAIT_S * 1000)]);
  // 도착 화면을 볼 수 있게 잠시 더 머문다
  await sleep(15_000);
  console.log('\n--- 시나리오 완료, 연결 종료 ---');
  for (const bot of bots) bot.close();
  await sleep(500);
  process.exit(0);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main().catch(e => { console.error(e); process.exit(1); });
