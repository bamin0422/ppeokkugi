// 뻐꾸기 릴레이 서버 — Cloudflare Worker 진입점
export { Room } from './room.js';
// 휴대폰 참여 화면. wrangler 기본 규칙이 .html 을 글자로 불러온다
import PHONE_HTML from './phone.html';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0·O·1·I 제외
const CODE_RE    = /^[A-HJ-NP-Z2-9]{6,8}$/;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let s = '';
  for (const b of bytes) s += CODE_CHARS[b % CODE_CHARS.length];
  return s;
}

function getRoom(env, code) {
  const id = env.ROOM.idFromName(code);
  return env.ROOM.get(id);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Max-Age': '86400' } });
    }

    // GET / → 휴대폰 참여 화면, /control → 같은 화면의 운수사 관제석
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/control')) {
      return new Response(PHONE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // GET /health
    if (url.pathname === '/health') {
      return json({ ok: true, service: 'ppeokkugi', ts: Date.now() });
    }

    const parts = url.pathname.slice(1).split('/').filter(Boolean);

    // POST /api/rooms → { code }
    // 본문이 {"fleet": true} 면 운수사 방: 관제 키를 만들어 방에 심고 함께 돌려준다
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'rooms' && parts.length === 2) {
      const code = randomCode();
      const body = await req.json().catch(() => ({}));
      if (body?.fleet !== true) return json({ code }, 201);
      const controlKey = [...crypto.getRandomValues(new Uint8Array(18))].map(b => b.toString(16).padStart(2, '0')).join('');
      await getRoom(env, code).fetch('https://room/init', { method: 'POST', body: controlKey });
      return json({ code, controlKey }, 201);
    }

    // GET /api/rooms/{code}/ws → WebSocket 업그레이드, /report → 운수사 관제용 운행 보고서
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'rooms' && (parts[3] === 'ws' || parts[3] === 'report')) {
      const code = parts[2];
      if (!CODE_RE.test(code)) return json({ error: 'invalid room code' }, 400);
      return getRoom(env, code).fetch(req);
    }

    return json({ error: 'not found' }, 404);
  },
};
