// 경유지 장면용 선두 차(1호차) 시뮬레이션. 앱을 2호차로 넣어 대장 콜 → 쉬어 가 투표 → 경유지 등록을 본다.
// 사용: node lead.mjs <CODE>   앱(2호차)이 들어오면 앱 200m 앞에 서서(300m 넘으면 서버가 이탈로 본다)
//   +4초 대장 콜(목적지 안성 휴게소), +24초 "화장실" 무전(투표 열림), 투표가 열리고 2초 뒤 기흥 휴게소에 투표
const code = process.argv[2];
const ws = new WebSocket(`ws://localhost:8792/api/rooms/${code}/ws`);
const send = o => ws.send(JSON.stringify(o));
let app = null, started = false;
const log = s => console.log(Date.now(), s);
ws.onopen = () => send({ type: 'hello', nickname: '선두차', seats: [{ id: 'driver', occupied: true }, { id: 'passenger', occupied: true }, { id: 'rear-l', occupied: true }] });
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.type === 'welcome') log(`입장 ${m.carLabel}`);
  if (m.type === 'pos' && m.from === '2호차') app = m;
  if (m.type === 'vote_open') { log('투표 열림'); setTimeout(() => { send({ type: 'vote', choice: m.candidates.findIndex(c => c.name.includes('기흥')) }); log('기흥 투표'); }, 2000); }
  if (m.type === 'vote_result') log(`투표 결과 ${m.winner.name}`);
};
setInterval(() => {
  if (!app) return;
  send({ type: 'pos', lat: app.lat + 0.0018, lng: app.lng, heading: 180, speed: 60 });
  if (started) return;
  started = true; log('앱 확인, 시나리오 시작');
  setTimeout(() => { send({ type: 'route', dest: { lat: 37.014, lng: 127.28, name: '안성 휴게소' }, waypoints: [] }); log('대장 콜'); }, 4000);
  setTimeout(() => { send({ type: 'say', text: '아이가 화장실 가고 싶대요', channel: 'all', seat: 'passenger', speaker: '조수석' }); log('화장실'); }, 24000);
}, 2000);
setTimeout(() => process.exit(0), Number(process.argv[3] || 120) * 1000);
