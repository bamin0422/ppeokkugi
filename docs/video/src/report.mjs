#!/usr/bin/env node
// 운행 보고서 화면을 찍는다. 가상 차량(server/scripts/bots.mjs)이 한 번 달리고 끝낸 방의 보고서를 그대로 캡처한다.
// 사용: node docs/video/src/report.mjs <방 코드> <관제 키> [서버 주소=http://localhost:8792]
// 결과: docs/video/src/raw/report.png (전체 화면), docs/video/remotion/src/report.json (영상에서 강조할 자리, CSS px)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [code, key, base = 'http://localhost:8792'] = process.argv.slice(2);
if (!code || !key) { console.error('사용: node report.mjs <방 코드> <관제 키> [서버 주소]'); process.exit(1); }
const HERE = dirname(fileURLToPath(import.meta.url));
const W = 820, PORT = 9341;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), 'report-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let cdp, id = 0; const waits = {};
const send = (method, params = {}) => new Promise(r => { const i = ++id; waits[i] = r; cdp.send(JSON.stringify({ id: i, method, params })); });

try {
  let targets;
  for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(250); } }
  cdp = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => cdp.onopen = r);
  cdp.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; } };
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 3, mobile: false });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: `${base}/api/rooms/${code}/report?key=${key}` });
  await sleep(2000);
  // 강조할 자리: 표, 열 묶음, 타임라인, "전원 도착" 줄. 영상 자막은 여기 있는 항목만 쓴다
  const r = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
    await document.fonts.ready;
    const box = el => { const b = el.getBoundingClientRect(); return [b.left + scrollX, b.top + scrollY, b.width, b.height].map(v => Math.round(v)); };
    const wrap = document.querySelector('.wrap'), table = document.querySelector('table');
    const ths = [...document.querySelectorAll('th')], tb = box(table);
    const cols = (...names) => { const bs = names.map(n => box(ths.find(t => t.textContent === n))); const x = Math.min(...bs.map(b => b[0])), x2 = Math.max(...bs.map(b => b[0] + b[2])); return [x, tb[1], x2 - x, tb[3]]; };
    const lis = [...document.querySelectorAll('ol li')], all = lis.find(li => li.textContent.includes('전원 도착'));
    return {
      page: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      overflow: wrap.scrollWidth > wrap.clientWidth,
      headers: ths.map(t => t.textContent),
      table: box(wrap), timeline: box(document.querySelector('ol')),
      arrive: cols('입장', '도착', '운행'), drive: cols('거리', '최고 속도'), events: cols('급제동', '에어백', '이탈'), radio: cols('무전', '점호'),
      allArrived: all ? box(all) : null,
      lines: lis.map(li => li.textContent),
    };
  })()` });
  const info = r.result.value;
  if (info.overflow) throw new Error('표가 화면 폭을 넘는다. W 를 키울 것');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: info.page[1], deviceScaleFactor: 3, mobile: false });
  await sleep(500);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(HERE, 'raw/report.png'), Buffer.from(shot.data, 'base64'));
  writeFileSync(join(HERE, '../remotion/src/report.json'), JSON.stringify(info, null, 1) + '\n');
  console.log(JSON.stringify(info));
} finally {
  chrome.kill(); await sleep(300); rmSync(profile, { recursive: true, force: true });
}
