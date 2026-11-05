// Room Durable Object — 방 1개 = 일행 1팀
// WebSocket Hibernation API 사용: 메시지 없을 때 실행 비용 없음
import {
  validateMessage, isDetached, tailInfo, tailText,
  shouldOpenVote, tallyVotes, haversine, minDistToPath,
  flagColorFor, allArrived, isAhead, formationNotices, noticeText,
  newTrip, tripUpdate, tripReport,
} from './logic.js';
import { reportHtml } from './report.js';
import { REST_AREAS } from './data.js';

const VOTE_TIMEOUT_MS       = 30_000;         // 투표 자동 마감 30초
const TAIL_INTERVAL_MS      = 5 * 60_000;     // 꼬리 콜 최소 간격 5분
const ROOM_TTL_MS           = 24 * 60 * 60_000; // 방 유지 24시간
const LEADER_PATH_WINDOW_MS = 60_000;         // 선두 경로 보관 1분

export class Room {
  constructor(state, env) {
    this.state = state;
    // 휘발성 — 히베르네이션 후 pos 메시지가 쌓이면 복원됨
    this.positions   = new Map(); // carNum → {lat, lng, heading, speed, at}
    this.leaderPath  = [];        // [{lat, lng, at}]
    this.detachState = new Map(); // carNum → detachedSince timestamp
    // 꼬리 콜 메모리 캐시 (히베르네이션 후 리셋돼도 무방)
    this._tailNoticeAt = 0;
    // 도착 알림은 한 번만. 누군가 다시 움직이면 풀린다
    this._arrived = false;
    // 선두가 대장 콜로 보낸 목적지. 앞뒤 판정에 쓴다
    this.dest = null;
    // 각자 위치 알림 상태(처짐·정차·도착한 곳·쿨다운)
    this.noticeMem = {};
  }

  // --- WebSocket 연결 ---

  async fetch(req) {
    const url = new URL(req.url);
    // 운수사 방 만들기(index.js 만 부른다). 키는 처음 한 번만 심는다
    if (url.pathname === '/init' && req.method === 'POST') {
      if (!(await this.state.storage.get('controlKey'))) {
        await this.state.storage.put('controlKey', await req.text());
        const now = Date.now();
        await this.state.storage.put('lastActivity', now);
        await this.state.storage.setAlarm(now + ROOM_TTL_MS);
      }
      return new Response(null, { status: 204 });
    }
    // 차량별 운행 보고서는 운수사 방의 관제 키로만 연다
    // ponytail: 키가 주소에 실린다. 운수사 계정이 생기면 로그인 세션으로 바꾼다
    if (url.pathname.endsWith('/report')) {
      const controlKey = await this.state.storage.get('controlKey');
      if (!controlKey) return new Response('운행 보고서는 운수사 구독 방에서만 볼 수 있습니다', { status: 403 });
      if (url.searchParams.get('key') !== controlKey) return new Response('관제 키가 맞지 않습니다', { status: 403 });
      const report = tripReport((await this.state.storage.get('trip')) ?? newTrip(Date.now()));
      return url.searchParams.get('format') === 'json'
        ? Response.json(report)
        : new Response(reportHtml(report), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    if (req.headers.get('Upgrade') !== 'websocket') {
      return new Response('WebSocket required', { status: 426 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server);
    // 방 활성화 — 24h 후 삭제 알람 예약
    const now = Date.now();
    await this.state.storage.put('lastActivity', now);
    await this.state.storage.setAlarm(now + ROOM_TTL_MS);
    return new Response(null, { status: 101, webSocket: client });
  }

  // --- 메시지 수신 ---

  async webSocketMessage(ws, raw) {
    const result = validateMessage(raw);
    if (!result.ok) {
      ws.send(JSON.stringify({ type: 'error', error: result.error }));
      return;
    }
    const msg = result.msg;
    const now = Date.now();

    // 관제석: 차로 세지 않고 위치도 보내지 않는다. 운수사 방의 관제 키가 있어야 들어온다
    if (msg.type === 'hello' && msg.role === 'control') {
      const controlKey = await this.state.storage.get('controlKey');
      if (!controlKey || msg.key !== controlKey) {
        ws.send(JSON.stringify({ type: 'error', error: '관제석은 운수사 방의 관제 키로만 들어올 수 있습니다' }));
        return;
      }
      ws.serializeAttachment({ role: 'control', carNum: null, nickname: '관제' });
      ws.send(JSON.stringify({ type: 'welcome', role: 'control', carNum: null, carLabel: '관제', cars: this._carList() }));
      return;
    }

    // hello: 입장 처리
    if (msg.type === 'hello') {
      const carNum = await this._nextCarNum();
      // 깃발 색은 보낸 색이 없으면 서버가 호차 번호로 정한다
      const flagColor = msg.flagColor ?? flagColorFor(carNum);
      // 먼저 들어온 차 목록을 함께 보내 새로 온 차도 색과 별칭을 바로 안다
      const cars = this._carList();
      ws.serializeAttachment({ carNum, nickname: msg.nickname ?? '', flagColor, seats: msg.seats ?? [] });
      ws.send(JSON.stringify({ type: 'welcome', carNum, carLabel: `${carNum}호차`, flagColor, cars }));
      this._broadcast(ws, { type: 'hello', from: `${carNum}호차`, nickname: msg.nickname ?? '', flagColor, at: now });
      await this._trip({ kind: 'join', car: carNum, nickname: msg.nickname ?? '', at: now });
      return;
    }

    const att = ws.deserializeAttachment();
    if (!att) {
      ws.send(JSON.stringify({ type: 'error', error: 'hello를 먼저 보내야 합니다' }));
      return;
    }
    const { carNum } = att;
    const from = `${carNum}호차`;

    // 관제석은 말하기(전 기사 공지)만 한다
    if (att.role === 'control') {
      if (msg.type !== 'say') {
        ws.send(JSON.stringify({ type: 'error', error: '관제석은 무전만 보낼 수 있습니다' }));
        return;
      }
      this._broadcastAll({ type: 'say', from: '관제', channel: 'all', text: msg.text ?? '', at: now });
      await this._trip({ kind: 'control_say', at: now });
      return;
    }

    switch (msg.type) {
      case 'pos': {
        const pos = { lat: msg.lat, lng: msg.lng, heading: msg.heading ?? 0, speed: msg.speed ?? 0, park: msg.park ?? null, at: now };
        this.positions.set(carNum, pos);
        // 선두 경로 누적 (1분치 보관)
        if (carNum === 1) {
          this.leaderPath.push({ lat: msg.lat, lng: msg.lng, at: now });
          const cutoff = now - LEADER_PATH_WINDOW_MS;
          this.leaderPath = this.leaderPath.filter(p => p.at >= cutoff);
        }
        this._broadcast(ws, { type: 'pos', from, lat: msg.lat, lng: msg.lng, heading: pos.heading, speed: pos.speed, at: now });
        // 이탈/꼬리 검사
        this._checkDetach(carNum, now);
        await this._checkTail(now);
        this._checkArrive(now);
        this._checkNotices(now);
        await this._trip({ kind: 'pos', car: carNum, lat: msg.lat, lng: msg.lng, speed: pos.speed, at: now });
        break;
      }

      case 'say': {
        const out = { type: 'say', from, seat: msg.seat ?? null, speaker: msg.speaker ?? null, channel: msg.channel ?? 'all', text: msg.text ?? '', at: now };
        this._broadcastAll(out);
        await this._checkVoteTrigger(msg.text ?? '', now);
        await this._trip({ kind: 'say', car: carNum, at: now });
        break;
      }

      case 'roll': {
        if (Array.isArray(msg.seats)) {
          const occupied = msg.seats.filter(s => s.occupied).length;
          const prev = (await this.state.storage.get('totalPeople')) ?? 0;
          await this.state.storage.put('totalPeople', prev + occupied);
          await this._trip({ kind: 'roll', car: carNum, people: occupied, at: now });
        }
        this._broadcastAll({ type: 'roll', from, seats: msg.seats ?? [], at: now });
        break;
      }

      case 'vote': {
        const vote = await this.state.storage.get('vote');
        if (!vote || typeof msg.choice !== 'number') break;
        vote.votes[String(carNum)] = msg.choice;
        if (carNum === 1) vote.leaderChoice = msg.choice;
        const totalWs = this._carSockets().length;
        if (Object.keys(vote.votes).length >= totalWs) {
          await this._closeVote(vote);
        } else {
          await this.state.storage.put('vote', vote);
        }
        break;
      }

      case 'route': {
        // 대장 콜은 선두만 보낸다
        if (carNum !== 1) {
          ws.send(JSON.stringify({ type: 'error', error: 'route는 선두만 보낼 수 있습니다' }));
          break;
        }
        this.dest = msg.dest;
        this._broadcast(ws, { type: 'route', from, dest: msg.dest, waypoints: Array.isArray(msg.waypoints) ? msg.waypoints.slice(0, 2) : [], at: now });
        break;
      }

      case 'signal': {
        // 받는 차마다 보낸 차와의 실제 거리와 앞뒤를 붙인다
        const src = typeof msg.lat === 'number' && typeof msg.lng === 'number' ? { lat: msg.lat, lng: msg.lng } : this.positions.get(carNum);
        this._sendEach(ws, a => {
          const me = this.positions.get(a.carNum);
          if (!src || !me) return { ...msg, from, at: now };
          return { ...msg, from, at: now, gapM: Math.round(haversine(src.lat, src.lng, me.lat, me.lng)), ahead: isAhead(carNum, src, a.carNum, me, this.dest) };
        });
        await this._trip({ kind: 'signal', car: carNum, signal: msg.kind, at: now });
        break;
      }

      default:
        // signal, route, rejoin 등: 보낸 차를 제외하고 릴레이
        this._broadcast(ws, { ...msg, from, at: now });
    }
  }

  async webSocketClose(ws) {
    const att = ws.deserializeAttachment();
    if (att?.carNum) {
      this.positions.delete(att.carNum);
      this._broadcastAll({ type: 'leave', from: `${att.carNum}호차`, at: Date.now() });
      await this._trip({ kind: 'leave', car: att.carNum, at: Date.now() });
    }
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }

  // --- 알람 (투표 마감 / 방 삭제) ---

  async alarm() {
    const now = Date.now();
    const voteDeadline = await this.state.storage.get('voteDeadline');
    if (voteDeadline && now >= voteDeadline) {
      // 투표 시간 초과 → 강제 집계
      const vote = await this.state.storage.get('vote');
      if (vote) await this._closeVote(vote);
      await this.state.storage.delete('voteDeadline');
      // 방 삭제 알람 재예약
      const lastActivity = (await this.state.storage.get('lastActivity')) ?? now;
      await this.state.storage.setAlarm(lastActivity + ROOM_TTL_MS);
      return;
    }
    // 24h TTL 만료 → 방 삭제
    await this.state.storage.deleteAll();
    this._tripCache = null;
  }

  // --- 내부 ---

  // 운행 기록. 방과 함께 24시간 후 지워진다
  // ponytail: 위치마다 저장소에 쓴다. 쓰기 비용이 문제 되면 몇 초씩 모아서 쓴다
  async _trip(ev) {
    this._tripCache ??= (await this.state.storage.get('trip')) ?? newTrip(ev.at);
    tripUpdate(this._tripCache, ev);
    await this.state.storage.put('trip', this._tripCache);
  }

  async _nextCarNum() {
    const n = (await this.state.storage.get('nextCarNum')) ?? 1;
    await this.state.storage.put('nextCarNum', n + 1);
    return n;
  }

  // 차로 들어온 연결만(관제석 제외)
  _carSockets() {
    return this.state.getWebSockets().filter(w => w.deserializeAttachment()?.carNum);
  }

  _carList() {
    return this._carSockets().map(w => w.deserializeAttachment())
      .map(a => ({ from: `${a.carNum}호차`, nickname: a.nickname, flagColor: a.flagColor, lat: this.positions.get(a.carNum)?.lat ?? null, lng: this.positions.get(a.carNum)?.lng ?? null }));
  }

  _broadcast(excludeWs, msg) {
    const data = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      if (ws !== excludeWs) try { ws.send(data); } catch {}
    }
  }

  // 받는 차마다 다른 메시지. make 가 null 을 주면 보내지 않는다
  _sendEach(excludeWs, make) {
    for (const ws of this.state.getWebSockets()) {
      if (ws === excludeWs) continue;
      const a = ws.deserializeAttachment();
      if (!a) continue;
      const msg = make(a);
      if (msg) try { ws.send(JSON.stringify(msg)); } catch {}
    }
  }

  _posObj() {
    const o = {};
    for (const [n, p] of this.positions) o[n] = p;
    return o;
  }

  _checkNotices(now) {
    const posObj = this._posObj();
    const notices = formationNotices(posObj, this.noticeMem, { dest: this.dest, places: REST_AREAS, now });
    for (const n of notices) {
      this._sendEach(null, a => {
        const text = noticeText(n, a.carNum, posObj, this.dest);
        return text && { type: 'notice', from: 'server', kind: n.kind, target: n.car ? `${n.car}호차` : null, lat: n.lat ?? null, lng: n.lng ?? null, text, at: now };
      });
    }
  }

  _broadcastAll(msg) {
    const data = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) try { ws.send(data); } catch {}
  }

  _checkDetach(carNum, now) {
    if (carNum === 1) return; // 선두는 제외
    const leaderPos = this.positions.get(1);
    const carPos    = this.positions.get(carNum);
    if (!leaderPos || !carPos || this.leaderPath.length === 0) return;

    const distToPath = minDistToPath(carPos.lat, carPos.lng, this.leaderPath);
    const offPath    = distToPath > 300;
    const since      = this.detachState.get(carNum) ?? null;

    if (offPath && since === null) {
      this.detachState.set(carNum, now);
      return;
    }
    if (!offPath && haversine(carPos.lat, carPos.lng, leaderPos.lat, leaderPos.lng) <= 5_000) {
      this.detachState.delete(carNum);
      return;
    }

    if (isDetached(carPos, leaderPos, this.leaderPath, since, now)) {
      this.detachState.delete(carNum);
      const nextPt = this.leaderPath[this.leaderPath.length - 1] ?? leaderPos;
      for (const ws of this.state.getWebSockets()) {
        const a = ws.deserializeAttachment();
        if (a?.carNum === carNum) {
          ws.send(JSON.stringify({ type: 'rejoin', from: 'server', target: `${carNum}호차`, waypoint: { lat: nextPt.lat, lng: nextPt.lng }, at: now }));
          this._trip({ kind: 'rejoin', car: carNum, at: now });
          break;
        }
      }
    }
  }

  async _checkTail(now) {
    if (this._carSockets().length < 2) return;
    if (now - this._tailNoticeAt < TAIL_INTERVAL_MS) return;

    const info = tailInfo(this._posObj(), this.dest);
    if (info && info.gapM >= 2_000) {
      this._tailNoticeAt = now;
      // 1호차에게만 전달
      for (const ws of this.state.getWebSockets()) {
        const a = ws.deserializeAttachment();
        if (a?.carNum === 1) {
          ws.send(JSON.stringify({ type: 'say', from: 'server', channel: 'all', text: tailText(info), system: true, at: now }));
          break;
        }
      }
    }
  }

  _checkArrive(now) {
    const posObj = {};
    for (const [n, p] of this.positions) posObj[n] = p;
    const arrived = allArrived(posObj);
    if (arrived && !this._arrived) {
      this._broadcastAll({ type: 'arrive', from: 'server', cars: this.positions.size, at: now });
      this._trip({ kind: 'arrive', cars: [...this.positions.keys()], at: now });
    }
    this._arrived = arrived;
  }

  async _checkVoteTrigger(text, now) {
    if (await this.state.storage.get('vote')) return; // 이미 투표 중
    const lastRestAt = (await this.state.storage.get('lastRestAt')) ?? null;
    const reason = shouldOpenVote({ minRange: null, remainingDist: null, lastRestAt, now, text });
    if (reason) await this._openVote(reason, now);
  }

  async _openVote(reason, now) {
    const candidates = REST_AREAS.map(r => ({ id: r.id, name: r.name, lat: r.lat, lng: r.lng }));
    const vote = { candidates, votes: {}, leaderChoice: 0, openedAt: now };
    await this.state.storage.put('vote', vote);
    await this.state.storage.put('voteDeadline', now + VOTE_TIMEOUT_MS);
    await this.state.storage.setAlarm(now + VOTE_TIMEOUT_MS);
    this._broadcastAll({
      type: 'vote_open', reason,
      candidates: candidates.map(({ id, name }) => ({ id, name })),
      timeoutMs: VOTE_TIMEOUT_MS, at: now,
    });
  }

  async _closeVote(vote) {
    const { winner } = tallyVotes(vote.votes, vote.candidates.length, vote.leaderChoice);
    const chosen     = vote.candidates[winner];
    await this.state.storage.delete('vote');
    const now        = Date.now();
    await this.state.storage.put('lastRestAt', now);
    const totalPeople = (await this.state.storage.get('totalPeople')) ?? 0;
    await this._trip({ kind: 'vote', place: chosen.name, at: now });
    this._broadcastAll({
      type: 'vote_result', from: 'server',
      winner: chosen, totalPeople, at: now,
    });
  }
}
