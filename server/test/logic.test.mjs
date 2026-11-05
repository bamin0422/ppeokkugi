import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversine, minDistToPath,
  validateMessage,
  tallyVotes,
  shouldOpenVote,
  isDetached,
  tailDistance,
  flagColorFor,
  allArrived,
  formationOrder, isAhead, distText, tailInfo, tailText,
  formationNotices, noticeText, LONG_STOP_MS, NOTICE_COOLDOWN_MS, SUMMARY_MS, WARMUP_MS,
  newTrip, tripUpdate, tripReport,
} from '../src/logic.js';

// --- 투표 집계 ---

test('tallyVotes: 과반 승자', () => {
  const result = tallyVotes({ 1: 0, 2: 0, 3: 1 }, 3, 0);
  assert.equal(result.winner, 0);
  assert.deepEqual(result.counts, [2, 1, 0]);
});

test('tallyVotes: 동점 → 선두(leaderChoice) 선택', () => {
  const result = tallyVotes({ 1: 1, 2: 0 }, 2, 1);
  assert.equal(result.winner, 1); // leaderChoice = 1
});

test('tallyVotes: 동점 선두가 미투표 → 첫 번째 항목', () => {
  const result = tallyVotes({ 2: 0, 3: 1 }, 2, undefined);
  // counts = [1, 1], winners = [0, 1], leaderChoice = undefined → winners[0] = 0
  assert.equal(result.winner, 0);
});

test('tallyVotes: 전원 같은 선택', () => {
  const result = tallyVotes({ 1: 2, 2: 2, 3: 2 }, 3, 2);
  assert.equal(result.winner, 2);
  assert.deepEqual(result.counts, [0, 0, 3]);
});

// --- 쉬어 가 조건 ---

test('shouldOpenVote: 화장실 텍스트 → text 반환', () => {
  assert.equal(shouldOpenVote({ text: '화장실 가고 싶다', lastRestAt: null, now: 0 }), 'text');
});

test('shouldOpenVote: 쉬었다 가자 텍스트 → text 반환', () => {
  assert.equal(shouldOpenVote({ text: '우리 쉬었다 가자', lastRestAt: null, now: 0 }), 'text');
});

test('shouldOpenVote: 2시간 경과 → time 반환', () => {
  const now = Date.now();
  const lastRestAt = now - 2 * 60 * 60_000 - 1;
  assert.equal(shouldOpenVote({ text: '', lastRestAt, now }), 'time');
});

test('shouldOpenVote: 2시간 미만 → null', () => {
  const now = Date.now();
  const lastRestAt = now - 60 * 60_000;
  assert.equal(shouldOpenVote({ text: '', lastRestAt, now }), null);
});

test('shouldOpenVote: 주행가능거리 부족 → range 반환', () => {
  const reason = shouldOpenVote({
    minRange: 50_000, remainingDist: 30_000, // 50km < 30km + 30km
    lastRestAt: null, now: Date.now(), text: '',
  });
  assert.equal(reason, 'range');
});

test('shouldOpenVote: 조건 없음 → null', () => {
  const reason = shouldOpenVote({
    minRange: 200_000, remainingDist: 50_000,
    lastRestAt: null, now: Date.now(), text: '',
  });
  assert.equal(reason, null);
});

// --- 이탈 판정 ---

test('isDetached: 선두와 5km 초과 → 즉시 이탈', () => {
  const leader = { lat: 37.0, lng: 127.0 };
  const car    = { lat: 37.1, lng: 127.0 }; // ~11km
  assert.equal(isDetached(car, leader, [leader], null, Date.now()), true);
});

test('isDetached: 경로 이탈 30초 미만 → 아직 이탈 아님', () => {
  const leader = { lat: 37.0, lng: 127.0 };
  const offPos = { lat: 37.003, lng: 127.003 }; // ~400m 이탈
  const now = Date.now();
  const since = now - 20_000; // 20초 전
  assert.equal(isDetached(offPos, leader, [leader], since, now), false);
});

test('isDetached: 경로 이탈 30초 이상 → 이탈 확정', () => {
  const leader = { lat: 37.0, lng: 127.0 };
  const offPos = { lat: 37.003, lng: 127.003 };
  const now = Date.now();
  const since = now - 31_000; // 31초 전
  assert.equal(isDetached(offPos, leader, [leader], since, now), true);
});

test('isDetached: 경로 근처 (300m 이내) → 이탈 아님', () => {
  const leader = { lat: 37.0, lng: 127.0 };
  const nearPos = { lat: 37.001, lng: 127.001 }; // ~130m
  assert.equal(isDetached(nearPos, leader, [leader], Date.now() - 60_000, Date.now()), false);
});

// --- 꼬리 거리 ---

test('tailDistance: 선두-후미 거리 계산', () => {
  const positions = {
    1: { lat: 37.0, lng: 127.0 },
    3: { lat: 37.02, lng: 127.0 }, // ~2.2km
  };
  const d = tailDistance(positions);
  assert.ok(d > 2_000 && d < 2_500, `expected ~2.2km, got ${d}`);
});

test('tailDistance: 차량 1대 → 0', () => {
  assert.equal(tailDistance({ 1: { lat: 37.0, lng: 127.0 } }), 0);
});

test('tailDistance: 꼬리 2km 미만 → 알림 없음 경계', () => {
  const positions = {
    1: { lat: 37.0, lng: 127.0 },
    2: { lat: 37.009, lng: 127.0 }, // ~1km
  };
  assert.ok(tailDistance(positions) < 2_000);
});

// --- 메시지 검증 ---

test('validateMessage: 올바른 pos 메시지', () => {
  const r = validateMessage(JSON.stringify({ type: 'pos', lat: 37.0, lng: 127.0, speed: 100 }));
  assert.equal(r.ok, true);
});

test('validateMessage: 8KB 초과 거부', () => {
  const r = validateMessage('x'.repeat(8 * 1024 + 1));
  assert.equal(r.ok, false);
  assert.match(r.error, /too large/);
});

test('validateMessage: unknown type 거부', () => {
  const r = validateMessage(JSON.stringify({ type: 'speed_camera', lat: 37.0 }));
  assert.equal(r.ok, false);
  assert.match(r.error, /unknown type/);
});

test('validateMessage: signal 유효 kind', () => {
  const r = validateMessage(JSON.stringify({ type: 'signal', kind: 'brake_hard', lat: 37.0, lng: 127.0 }));
  assert.equal(r.ok, true);
});

test('validateMessage: signal 무효 kind (speed_camera 포함)', () => {
  const r = validateMessage(JSON.stringify({ type: 'signal', kind: 'speed_camera' }));
  assert.equal(r.ok, false);
});

test('validateMessage: JSON 파싱 실패', () => {
  const r = validateMessage('{bad json');
  assert.equal(r.ok, false);
});

// --- 대장 콜 ---

test('validateMessage: route 는 dest 좌표가 있어야 함', () => {
  assert.equal(validateMessage(JSON.stringify({ type: 'route', dest: { lat: 37.0, lng: 127.0, name: '안성' }, waypoints: [] })).ok, true);
  assert.equal(validateMessage(JSON.stringify({ type: 'route', waypoints: [] })).ok, false);
});

// --- 깃발 색 ---

test('flagColorFor: 호차 번호로 돌아가며 고름', () => {
  assert.equal(flagColorFor(1), '#E88E7D');
  assert.equal(flagColorFor(2), '#7FB3D5');
  assert.equal(flagColorFor(6), '#E88E7D');
});

// --- 도착 ---

test('allArrived: 모두 P 이고 150m 안 → true', () => {
  assert.equal(allArrived({
    1: { lat: 37.014, lng: 127.28, park: true },
    2: { lat: 37.0143, lng: 127.28, park: true },   // ~33m
    3: { lat: 37.014, lng: 127.2805, speed: 0 },    // 휴대폰: park 없음, 정지
  }), true);
});

test('allArrived: 한 대라도 주행 중 → false', () => {
  assert.equal(allArrived({
    1: { lat: 37.014, lng: 127.28, park: true },
    2: { lat: 37.014, lng: 127.28, park: false, speed: 0 },
  }), false);
  assert.equal(allArrived({
    1: { lat: 37.014, lng: 127.28, park: true },
    2: { lat: 37.014, lng: 127.28, speed: 40 },
  }), false);
});

test('allArrived: 150m 밖 차가 있으면 false, 1대면 false', () => {
  assert.equal(allArrived({
    1: { lat: 37.014, lng: 127.28, park: true },
    2: { lat: 37.016, lng: 127.28, park: true },    // ~220m
  }), false);
  assert.equal(allArrived({ 1: { lat: 37.0, lng: 127.0, park: true } }), false);
});

// --- 대열 순서·꼬리 콜 문장 ---

const ANSEONG = { lat: 37.014, lng: 127.28, name: '안성 휴게소' };

test('formationOrder: 목적지가 있으면 남은 거리로, 없으면 번호로', () => {
  const pos = { 1: { lat: 37.40, lng: 127.10 }, 2: { lat: 37.20, lng: 127.10 }, 3: { lat: 37.30, lng: 127.10 } };
  assert.deepEqual(formationOrder(pos, ANSEONG), [2, 3, 1]);
  assert.deepEqual(formationOrder(pos), [1, 2, 3]);
  assert.equal(isAhead(2, pos[2], 1, pos[1], ANSEONG), true);
  assert.equal(isAhead(1, pos[1], 2, pos[2], ANSEONG), false);
});

test('distText: 100m 단위, 10km 미만 소수 한 자리', () => {
  assert.equal(distText(850), '800m');
  assert.equal(distText(1234), '1.2km');
  assert.equal(distText(2000), '2km');
  assert.equal(distText(15400), '15km');
});

test('tailText: 실제 거리와 실제 앞뒤로 말한다', () => {
  const pos = { 1: { lat: 37.20, lng: 127.10 }, 2: { lat: 37.23, lng: 127.10 } }; // ~3.3km
  const front = tailInfo(pos, ANSEONG);
  assert.equal(front.front, 1);
  assert.equal(tailText(front), '후미 2호차 3.3km 뒤, 천천히');
  // 1호차가 뒤에 처진 경우: 번호와 상관없이 1호차가 후미
  const behind = tailInfo({ 1: pos[2], 2: pos[1] }, ANSEONG);
  assert.equal(behind.tail, 1);
  assert.equal(tailText(behind), '일행이 3.3km 앞서 있습니다, 맨 앞 2호차');
});

// --- 각자 위치 알림 ---

const W = WARMUP_MS;

test('formationNotices: 막 들어온 차는 20초 동안 말하지 않고, 출발지는 도착으로 치지 않는다', () => {
  const mem = {};
  const far = { 1: { lat: 37.20, lng: 127.10, speed: 90 }, 2: { lat: 37.23, lng: 127.10, speed: 90 } };
  assert.deepEqual(formationNotices(far, mem, { now: 0 }), []);
  assert.equal(mem.cars[2].behind, true); // 상태는 잡아 둔다
  const places = [{ name: '기흥 휴게소', lat: 37.20, lng: 127.10 }];
  formationNotices(far, mem, { places, now: 1000 });
  assert.deepEqual(formationNotices(far, mem, { places, now: W + 1000 }).filter(n => n.kind === 'place'), []);
});

test('formationNotices: 2km 넘게 처지면 한 번, 1km 안으로 오면 다시 붙음', () => {
  const mem = {};
  const near = { 1: { lat: 37.20, lng: 127.10, speed: 90 }, 2: { lat: 37.205, lng: 127.10, speed: 90 } };
  assert.deepEqual(formationNotices(near, mem, { dest: ANSEONG, now: 0 }), []);
  const far = { 1: near[1], 2: { lat: 37.23, lng: 127.10, speed: 90 } };
  const n1 = formationNotices(far, mem, { dest: ANSEONG, now: W + 1000 });
  assert.equal(n1.length, 1);
  assert.equal(n1[0].kind, 'fall_behind');
  assert.equal(n1[0].car, 2);
  // 계속 처져 있어도 다시 말하지 않는다
  assert.deepEqual(formationNotices(far, mem, { dest: ANSEONG, now: W + 2000 }), []);
  const back = formationNotices(near, mem, { dest: ANSEONG, now: W + 3000 });
  assert.equal(back[0].kind, 'catch_up');
});

// 요약은 따로 본다
const kinds = list => list.filter(x => x.kind !== 'summary');

test('formationNotices: 휴게소 도착은 곳마다 한 번, 휴게소 밖 정차는 3분 뒤', () => {
  const mem = {};
  const places = [{ name: '기흥 휴게소', lat: 37.272, lng: 127.114 }];
  const at = { 1: { lat: 37.272, lng: 127.114, speed: 0 }, 2: { lat: 37.2725, lng: 127.114, speed: 0 } };
  formationNotices({ 1: { lat: 37.10, lng: 127.08, speed: 90 }, 2: { lat: 37.1005, lng: 127.08, speed: 90 } }, mem, { places, now: -W }); // 길 위에서 입장
  const n = kinds(formationNotices(at, mem, { places, now: 0 }));
  assert.deepEqual(n.map(x => x.kind), ['place', 'place']);
  // 달리며 지나가면 도착이 아니다
  const mem2 = {};
  const pass = { 1: { lat: 37.272, lng: 127.114, speed: 90 }, 2: { lat: 37.2725, lng: 127.114, speed: 90 } };
  formationNotices(pass, mem2, { places, now: -W });
  assert.deepEqual(kinds(formationNotices(pass, mem2, { places, now: 0 })), []);
  assert.deepEqual(kinds(formationNotices(at, mem, { places, now: LONG_STOP_MS + 1 })), []); // 휴게소 안 정차는 알리지 않는다
  const road = { 1: { lat: 37.10, lng: 127.08, speed: 0 }, 2: { lat: 37.1005, lng: 127.08, speed: 0 } };
  assert.deepEqual(kinds(formationNotices(road, mem, { places, now: 10 * 60_000 })), []);
  const stop = kinds(formationNotices(road, mem, { places, now: 10 * 60_000 + LONG_STOP_MS }));
  assert.deepEqual(stop.map(x => x.kind), ['long_stop', 'long_stop']);
  assert.equal(stop[0].stopMin, 3);
});

test('formationNotices: 같은 차 같은 종류는 쿨다운, 요약은 5분마다', () => {
  const mem = {};
  const near = { 1: { lat: 37.20, lng: 127.10, speed: 90 }, 2: { lat: 37.205, lng: 127.10, speed: 90 } };
  const far = { 1: near[1], 2: { lat: 37.23, lng: 127.10, speed: 90 } };
  formationNotices(near, mem, { now: -W }); // 입장
  formationNotices(far, mem, { now: 0 });
  formationNotices(near, mem, { now: 1000 });
  // 쿨다운 안에 다시 처지면 상태만 바뀌고 말하지 않는다
  assert.deepEqual(formationNotices(far, mem, { now: 2000 }).filter(n => n.kind === 'fall_behind'), []);
  assert.equal(formationNotices(near, mem, { now: NOTICE_COOLDOWN_MS + 3000 }).filter(n => n.kind === 'catch_up').length, 1);
  assert.equal(formationNotices(near, mem, { now: SUMMARY_MS }).filter(n => n.kind === 'summary').length, 1);
  assert.equal(formationNotices(near, mem, { now: SUMMARY_MS + 1000 }).filter(n => n.kind === 'summary').length, 0);
});

test('noticeText: 받는 차 기준 거리와 앞뒤', () => {
  const pos = { 1: { lat: 37.20, lng: 127.10 }, 2: { lat: 37.23, lng: 127.10 }, 3: { lat: 37.19, lng: 127.10 } };
  const fall = { kind: 'fall_behind', car: 2, gapM: 3300 };
  assert.equal(noticeText(fall, 1, pos, ANSEONG), '2호차, 3.3km 뒤, 대열에서 처졌습니다');
  assert.equal(noticeText(fall, 2, pos, ANSEONG), '우리 차가 대열에서 3.3km 처졌습니다');
  assert.equal(noticeText({ kind: 'place', car: 3, place: '안성 휴게소' }, 3, pos, ANSEONG), null);
  assert.equal(noticeText({ kind: 'summary' }, 1, pos, ANSEONG), '일행 위치, 3호차 1.1km 앞, 2호차 3.3km 뒤');
});

test('운행 보고서: 차량별 거리·신호·도착을 모으고 GPS 튐은 거리에서 뺀다', () => {
  const t = newTrip(0);
  tripUpdate(t, { kind: 'join', car: 2, nickname: '삼촌차', at: 0 });
  tripUpdate(t, { kind: 'join', car: 1, at: 0 });
  tripUpdate(t, { kind: 'pos', car: 1, lat: 37.0, lng: 127.0, speed: 80, at: 1 });
  tripUpdate(t, { kind: 'pos', car: 1, lat: 37.01, lng: 127.0, speed: 95, at: 2 });   // 약 1.1km
  tripUpdate(t, { kind: 'pos', car: 1, lat: 38.0, lng: 127.0, speed: 10, at: 3 });    // 110km 튐 → 제외
  tripUpdate(t, { kind: 'signal', car: 1, signal: 'brake_hard', at: 4 });
  tripUpdate(t, { kind: 'signal', car: 1, signal: 'turn_left', at: 4 });              // 방향지시등은 기록 안 함
  tripUpdate(t, { kind: 'say', car: 2, at: 5 });
  tripUpdate(t, { kind: 'control_say', at: 500 });                                  // 관제 공지는 차에 붙지 않는다
  tripUpdate(t, { kind: 'arrive', cars: [1], at: 600_000 });
  tripUpdate(t, { kind: 'leave', car: 2, at: 1_200_000 });
  const r = tripReport(t);
  assert.deepEqual(r.rows.map(x => x.car), [1, 2]);
  const [a, b] = r.rows;
  assert.equal(a.km, 1.1); assert.equal(a.maxSpeed, 95); assert.equal(a.brake, 1); assert.equal(a.minutes, 10);
  assert.equal(b.nickname, '삼촌차'); assert.equal(b.says, 1); assert.equal(b.arrivedAt, null); assert.equal(b.minutes, 20);
  assert.deepEqual(r.events.map(e => e.text), ['입장', '입장', '급제동', '관제 공지', '전원 도착', '퇴장']);
  assert.equal(r.rows.length, 2);
});
