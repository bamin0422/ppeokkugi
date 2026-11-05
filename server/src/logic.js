// 순수 판정 로직 — Cloudflare API 없음, node --test 로 단독 검증 가능

const MAX_MSG = 8 * 1024; // 8KB

const VALID_TYPES = new Set([
  'hello', 'pos', 'signal', 'say', 'roll', 'route',
  'vote', 'vote_open', 'vote_result', 'rejoin',
]);
// 단속 카메라 공유 제외 (계획서 §6.1 참고)
const VALID_SIGNALS = new Set([
  'brake_hard', 'rain', 'turn_left', 'turn_right',
  'speed_limit', 'caution', 'airbag',
]);

// --- 거리 ---

// Haversine 거리 (미터)
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6_371_000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// 경로(배열 [{lat,lng}]) 에서 점까지 최소 거리 (미터)
export function minDistToPath(lat, lng, path) {
  if (!path || path.length === 0) return Infinity;
  let min = Infinity;
  for (const p of path) {
    const d = haversine(lat, lng, p.lat, p.lng);
    if (d < min) min = d;
  }
  return min;
}

// --- 이탈 판정 ---

// carPos, leaderPos: {lat, lng}
// leaderPath: [{lat, lng, at}]
// detachedSince: timestamp | null
// now: timestamp
// 반환: true = 이탈 확정
export function isDetached(carPos, leaderPos, leaderPath, detachedSince, now) {
  const distToLeader = haversine(carPos.lat, carPos.lng, leaderPos.lat, leaderPos.lng);
  if (distToLeader > 5_000) return true; // 선두와 5km 초과

  const distToPath = minDistToPath(carPos.lat, carPos.lng, leaderPath);
  if (distToPath > 300 && detachedSince !== null && (now - detachedSince) >= 30_000) return true;

  return false;
}

// --- 대열 순서 ---

// 앞뒤는 공유된 목적지까지 남은 직선 거리로 본다. 목적지가 없으면 호차 번호가 작은 차가 앞이다
// ponytail: 직선 거리라 굽은 길에서는 틀릴 수 있다. 경로 폴리라인을 받으면 경로상 진행 거리로 바꾼다
function progressKey(num, p, dest) {
  return dest ? haversine(p.lat, p.lng, dest.lat, dest.lng) : Number(num);
}

// positions: { [carNum]: {lat, lng} }, dest: {lat, lng} | null
// 반환: 앞에서 뒤 순서의 carNum 배열
export function formationOrder(positions, dest = null) {
  return Object.keys(positions).map(Number)
    .sort((a, b) => progressKey(a, positions[a], dest) - progressKey(b, positions[b], dest) || a - b);
}

// a 가 b 보다 앞이면 true. 같으면 번호가 작은 쪽
export function isAhead(aNum, a, bNum, b, dest = null) {
  const ka = progressKey(aNum, a, dest), kb = progressKey(bNum, b, dest);
  return ka === kb ? aNum < bNum : ka < kb;
}

// 앱 Phrase.distance 와 같다: 1km 미만 100m 단위, 10km 미만 소수 한 자리, 그 위는 정수 km
export function distText(m) {
  if (m < 1000) return `${Math.floor(m / 100) * 100}m`;
  if (m < 10_000) return `${(Math.round(m / 100) / 10).toFixed(1).replace(/\.0$/, '')}km`;
  return `${Math.round(m / 1000)}km`;
}

// --- 꼬리 콜 ---

// 반환: 대열 맨 앞·맨 뒤 차와 둘 사이 실제 거리(미터). 2대 미만이면 null
export function tailInfo(positions, dest = null) {
  const order = formationOrder(positions, dest);
  if (order.length < 2) return null;
  const front = order[0], tail = order[order.length - 1];
  const f = positions[front], t = positions[tail];
  return { front, tail, gapM: haversine(f.lat, f.lng, t.lat, t.lng) };
}

// 꼬리 콜은 1호차에게만 간다. 1호차가 맨 앞이 아니면 그에 맞춰 말한다
export function tailText({ front, tail, gapM }) {
  const d = distText(gapM);
  if (front === 1) return `후미 ${tail}호차 ${d} 뒤, 천천히`;
  if (tail === 1) return `일행이 ${d} 앞서 있습니다, 맨 앞 ${front}호차`;
  return `후미 ${tail}호차가 맨 앞 ${front}호차와 ${d} 떨어졌습니다`;
}

// 예전 이름. 선두(최소 번호)와 후미(최대 번호) 사이 거리
export function tailDistance(positions) {
  return tailInfo(positions)?.gapM ?? 0;
}

// --- 각자 위치 알림 ---

export const FALL_BEHIND_M   = 2_000;     // 바로 앞차와 이만큼 벌어지면 처짐
export const CATCH_UP_M      = 1_000;     // 이 안으로 들어오면 다시 붙음
export const LONG_STOP_MS    = 3 * 60_000; // 휴게소 밖에서 3분 넘게 서 있으면
export const PLACE_RADIUS_M  = 400;       // 휴게소·목적지 도착 반경
export const NOTICE_COOLDOWN_MS = 2 * 60_000; // 같은 차·같은 종류는 2분에 한 번
export const SUMMARY_MS      = 5 * 60_000; // 일행 위치 요약 주기
export const WARMUP_MS       = 20_000;    // 막 들어온 차는 20초 동안 상태만 잡고 말하지 않는다(입장 때 한꺼번에 쏟아지지 않게)

const stopped = p => p.park === true || (p.speed ?? 0) < 5;

// positions: { [carNum]: {lat, lng, speed, park} }
// mem: 방이 들고 있는 상태 객체. 이 함수가 고친다 { cars: {}, last: {}, summaryAt }
// 반환: [{ kind, car, lat, lng, gapM?, place?, stopMin? }] — 받는 차마다 문장은 noticeText 로 만든다
export function formationNotices(positions, mem, { dest = null, places = [], now }) {
  mem.cars ??= {}; mem.last ??= {};
  const out = [];
  const order = formationOrder(positions, dest);
  const emit = (kind, car, extra = {}) => {
    if (now - mem.cars[car].firstAt < WARMUP_MS) return false;
    const key = `${car}:${kind}`;
    if (now - (mem.last[key] ?? -Infinity) < NOTICE_COOLDOWN_MS) return false;
    mem.last[key] = now;
    const p = positions[car];
    out.push({ kind, car, lat: p.lat, lng: p.lng, ...extra });
    return true;
  };
  const allPlaces = dest ? [...places, { name: dest.name ?? '목적지', lat: dest.lat, lng: dest.lng }] : places;

  order.forEach((car, i) => {
    const p = positions[car];
    const m = (mem.cars[car] ??= { firstAt: now, behind: false, stopSince: null, stopNoticed: false, places: [] });

    // 처짐·다시 붙음: 바로 앞차와의 거리. 1km~2km 사이는 그대로 둔다
    if (i > 0) {
      const ahead = positions[order[i - 1]];
      const gapM = haversine(p.lat, p.lng, ahead.lat, ahead.lng);
      if (!m.behind && gapM > FALL_BEHIND_M) { m.behind = true; emit('fall_behind', car, { gapM }); }
      else if (m.behind && gapM < CATCH_UP_M) { m.behind = false; emit('catch_up', car, { gapM }); }
    } else if (m.behind) {
      // 맨 앞이 되면 처짐을 푼다
      m.behind = false; emit('catch_up', car, { gapM: 0 });
    }

    // 휴게소·목적지 도착: 그 안에서 섰을 때만(지나가는 건 빼고), 차마다 곳마다 한 번
    const here = allPlaces.find(pl => haversine(p.lat, p.lng, pl.lat, pl.lng) <= PLACE_RADIUS_M);
    if (here && stopped(p) && !m.places.includes(here.name)) { m.places.push(here.name); emit('place', car, { place: here.name }); }

    // 오래 정차: 휴게소·목적지 밖에서만
    if (stopped(p) && !here) {
      m.stopSince ??= now;
      if (!m.stopNoticed && now - m.stopSince >= LONG_STOP_MS) {
        m.stopNoticed = emit('long_stop', car, { stopMin: Math.floor((now - m.stopSince) / 60_000) });
      }
    } else { m.stopSince = null; m.stopNoticed = false; }
  });

  // 일행 위치 요약: 5분마다
  if (order.length >= 2) {
    mem.summaryAt ??= now; // 들어오자마자 말하지 않는다
    if (now - mem.summaryAt >= SUMMARY_MS) { mem.summaryAt = now; out.push({ kind: 'summary' }); }
  }
  return out;
}

// 받는 차(meNum) 기준 "2호차 3km 뒤". 받는 차 위치를 모르면 null
export function relText(carNum, meNum, positions, dest = null) {
  const a = positions[carNum], b = positions[meNum];
  if (!a || !b) return null;
  return `${distText(haversine(a.lat, a.lng, b.lat, b.lng))} ${isAhead(carNum, a, meNum, b, dest) ? '앞' : '뒤'}`;
}

// 받는 차마다 읽을 문장. null 이면 그 차에는 보내지 않는다
export function noticeText(n, meNum, positions, dest = null) {
  const self = n.car === meNum;
  const label = `${n.car}호차`;
  const rel = self ? null : relText(n.car, meNum, positions, dest);
  const tail = rel ? `, ${rel}` : '';
  switch (n.kind) {
    case 'fall_behind': return self ? `우리 차가 대열에서 ${distText(n.gapM)} 처졌습니다` : `${label}${tail}, 대열에서 처졌습니다`;
    case 'catch_up':    return self ? '대열에 다시 붙었습니다' : `${label} 대열에 다시 붙음${tail}`;
    case 'place':       return self ? null : `${label} ${n.place} 도착${tail}`;
    case 'long_stop':   return self ? null : `${label} ${n.stopMin}분째 정차 중${tail}`;
    case 'summary': {
      const others = formationOrder(positions, dest).filter(c => c !== meNum)
        .map(c => { const r = relText(c, meNum, positions, dest); return r && `${c}호차 ${r}`; }).filter(Boolean);
      return others.length && positions[meNum] ? `일행 위치, ${others.join(', ')}` : null;
    }
  }
  return null;
}

// --- 깃발 색 ---

// 앱 StatusViewModel.FLAG 와 같은 순서
const FLAG_COLORS = ['#E88E7D', '#7FB3D5', '#9CC3A8', '#E6C27A', '#C39BD3'];
export function flagColorFor(carNum) {
  return FLAG_COLORS[(carNum - 1) % FLAG_COLORS.length];
}

// --- 도착 판정 ---

// positions: { [carNum]: {lat, lng, speed, park?} }
// park 를 모르는 참가자(휴대폰)는 5km/h 미만이면 선 것으로 본다
// 반환: 2대 이상이 모두 서 있고 서로 radiusM 안이면 true
export function allArrived(positions, radiusM = 150) {
  const list = Object.values(positions);
  if (list.length < 2) return false;
  if (!list.every(p => p.park === true || (p.park == null && (p.speed ?? 0) < 5))) return false;
  // ponytail: 쌍마다 비교 O(n²), 일행은 20대 안쪽이라 충분
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++)
      if (haversine(list[i].lat, list[i].lng, list[j].lat, list[j].lng) > radiusM) return false;
  return true;
}

// --- 투표 집계 ---

// votes: { [carNum]: candidateIdx }
// candidateCount: 후보 수
// leaderChoice: 선두(1호차) 표 (동점 결정용)
// 반환: { winner: idx, counts: [...] }
export function tallyVotes(votes, candidateCount, leaderChoice) {
  const counts = Array(candidateCount).fill(0);
  for (const v of Object.values(votes)) {
    if (typeof v === 'number' && v >= 0 && v < candidateCount) counts[v]++;
  }
  const max = Math.max(...counts);
  const winners = counts.reduce((acc, c, i) => { if (c === max) acc.push(i); return acc; }, []);
  const winner = winners.length === 1 ? winners[0] : (leaderChoice ?? winners[0]);
  return { winner, counts };
}

// --- 쉬어 가 조건 ---

// params.minRange:      일행 중 최소 주행가능거리 (미터). null = 데이터 없음
// params.remainingDist: 남은 경로 거리 (미터).         null = 데이터 없음
// params.lastRestAt:    마지막 휴식 timestamp.         null = 기록 없음
// params.now:           현재 timestamp
// params.text:          say 메시지 텍스트 (없으면 '')
// 반환: 'range' | 'time' | 'text' | null
export function shouldOpenVote({ minRange, remainingDist, lastRestAt, now, text = '' }) {
  if (text.includes('화장실') || text.includes('쉬었다 가자')) return 'text';
  if (typeof minRange === 'number' && typeof remainingDist === 'number') {
    if (minRange < remainingDist + 30_000) return 'range';
  }
  if (lastRestAt !== null && (now - lastRestAt) >= 2 * 60 * 60_000) return 'time';
  return null;
}

// --- 메시지 검증 ---

export function validateMessage(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'not a string' };
  if (raw.length > MAX_MSG)    return { ok: false, error: 'message too large (max 8KB)' };
  let msg;
  try { msg = JSON.parse(raw); } catch { return { ok: false, error: 'invalid JSON' }; }
  if (!msg || typeof msg !== 'object' || Array.isArray(msg))
    return { ok: false, error: 'not a JSON object' };
  if (typeof msg.type !== 'string') return { ok: false, error: 'type field required' };
  if (!VALID_TYPES.has(msg.type))   return { ok: false, error: `unknown type: ${msg.type}` };
  if (msg.type === 'signal' && !VALID_SIGNALS.has(msg.kind))
    return { ok: false, error: `unknown signal kind: ${msg.kind}` };
  if (msg.type === 'route' && !(typeof msg.dest?.lat === 'number' && typeof msg.dest?.lng === 'number'))
    return { ok: false, error: 'route needs dest.lat/lng' };
  return { ok: true, msg };
}

// --- 운행 보고서 ---

const TRIP_EVENT_MAX = 500;          // 타임라인 보관 상한
const POS_JUMP_M     = 5_000;        // 한 번에 이만큼 넘게 뛰면 GPS 튐으로 보고 거리에서 뺀다
const SIGNAL_NAME = { brake_hard: '급제동', airbag: '에어백', rain: '비', caution: '주의', speed_limit: '과속 주의' };

export function newTrip(now) {
  return { startedAt: now, cars: {}, events: [] };
}

// trip 을 바꾼다. ev: {kind, car, at, ...}
// kind: join · pos · signal · say · roll · rejoin · vote · arrive · control_say · leave
export function tripUpdate(trip, ev) {
  const c = ev.car != null
    ? (trip.cars[ev.car] ??= { nickname: '', joinedAt: ev.at, leftAt: null, arrivedAt: null, distM: 0, maxSpeed: 0, last: null, signals: {}, says: 0, rejoins: 0, people: null })
    : null;
  const log = text => {
    trip.events.push({ at: ev.at, car: ev.car ?? null, text });
    if (trip.events.length > TRIP_EVENT_MAX) trip.events.shift();
  };
  switch (ev.kind) {
    case 'join':
      c.nickname = ev.nickname ?? ''; c.leftAt = null;
      log('입장');
      break;
    case 'pos':
      if (c.last) {
        const d = haversine(c.last.lat, c.last.lng, ev.lat, ev.lng);
        if (d < POS_JUMP_M) c.distM += d;
      }
      c.last = { lat: ev.lat, lng: ev.lng };
      c.maxSpeed = Math.max(c.maxSpeed, ev.speed ?? 0);
      break;
    case 'signal':
      if (!SIGNAL_NAME[ev.signal]) break;
      c.signals[ev.signal] = (c.signals[ev.signal] ?? 0) + 1;
      log(SIGNAL_NAME[ev.signal]);
      break;
    case 'say':
      c.says++;
      break;
    case 'roll':
      c.people = ev.people;
      log(`점호 ${ev.people}명`);
      break;
    case 'rejoin':
      c.rejoins++;
      log('대열 이탈, 합류 경로 안내');
      break;
    case 'vote':
      log(`휴게소 투표: ${ev.place}`);
      break;
    case 'arrive':
      for (const n of ev.cars) if (trip.cars[n] && !trip.cars[n].arrivedAt) trip.cars[n].arrivedAt = ev.at;
      log('전원 도착');
      break;
    case 'control_say':
      log('관제 공지');
      break;
    case 'leave':
      c.leftAt = ev.at;
      log('퇴장');
      break;
  }
  return trip;
}

// 차량별 한 줄 요약. 호차 순
export function tripReport(trip) {
  const rows = Object.entries(trip.cars).map(([n, c]) => {
    const end = c.arrivedAt ?? c.leftAt;
    return {
      car: Number(n), nickname: c.nickname, joinedAt: c.joinedAt, arrivedAt: c.arrivedAt,
      minutes: end ? Math.round((end - c.joinedAt) / 60_000) : null,
      km: Math.round(c.distM / 100) / 10, maxSpeed: Math.round(c.maxSpeed),
      brake: c.signals.brake_hard ?? 0, airbag: c.signals.airbag ?? 0,
      says: c.says, rejoins: c.rejoins, people: c.people,
    };
  }).sort((a, b) => a.car - b.car);
  return { startedAt: trip.startedAt, rows, events: trip.events };
}
