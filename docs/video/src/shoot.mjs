#!/usr/bin/env node
// 시연 영상 촬영: 에뮬레이터 화면 녹화 + 봇 3대 + 헤드리스 Chrome 휴대폰 한 대를 한 시나리오로 돌린다.
// 사용: node docs/video/src/shoot.mjs <출력 폴더>
// 전제: server 에서 `npx wrangler dev --port 8792` 실행 중, emulator-5554 사용자 10에 com.ppeokkugi 설치
// 결과: emu-1.webm, emu-2.webm …(에뮬레이터 자체 녹화, 실시간 24fps), phone/*.jpg(CDP 스크린캐스트 프레임),
//       timeline.json(모든 동작·녹화 시작 시각, epoch ms), bots.log, logcat.txt
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, createWriteStream, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = resolve(process.argv[2] || 'take');
mkdirSync(`${OUT}/phone`, { recursive: true });
const SPEED = 2;            // 봇 배속. 2배속이면 급제동 17초, 비 32초, 키즈 47초, 화장실 62초, 도착 약 205초
const SEG = 170;            // 에뮬레이터 녹화 한 토막(초). 콘솔 녹화 상한 180초 안
const sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => execFileSync('adb', ['-s', 'emulator-5554', ...a], { encoding: 'utf8' });
const timeline = [];
const mark = (what, extra = {}) => { const e = { t: Date.now(), what, ...extra }; timeline.push(e); console.log(new Date(e.t).toISOString().slice(11, 23), what, JSON.stringify(extra)); writeFileSync(`${OUT}/timeline.json`, JSON.stringify(timeline, null, 1)); };
const tap = (x, y, why) => { adb('shell', 'input', 'tap', String(x), String(y)); mark('tap', { x, y, why }); };

/** 화면에서 글자를 찾아 그 가운데를 누른다(uiautomator) */
function tapText(text, why) {
  adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml');
  const xml = adb('shell', 'cat', '/sdcard/ui.xml');
  const m = xml.match(new RegExp(`text="${text}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`));
  if (!m) { mark('tapText 실패', { text }); return false; }
  const xy = [(+m[1] + +m[3]) >> 1, (+m[2] + +m[4]) >> 1];
  tap(...xy, why || text);
  return xy;
}

// --- 에뮬레이터 녹화: 콘솔 screenrecord 를 토막으로 잇는다 ---
let segN = 0, recording = false;
async function recLoop() {
  recording = true;
  while (recording) {
    const f = `${OUT}/emu-${++segN}.webm`;
    adb('emu', 'screenrecord', 'start', '--time-limit', String(SEG), '--fps', '24', f);
    mark('rec start', { seg: segN, file: f });
    const until = Date.now() + SEG * 1000;
    while (recording && Date.now() < until - 500) await sleep(250);
    adb('emu', 'screenrecord', 'stop');
    mark('rec stop', { seg: segN });
    await sleep(300);
  }
}

// --- 휴대폰: 헤드리스 Chrome + CDP 스크린캐스트 ---
const PORT = 9339;
let cdp, cdpId = 0; const waits = {};
const cdpSend = (method, params = {}) => new Promise(r => { const i = ++cdpId; waits[i] = r; cdp.send(JSON.stringify({ id: i, method, params })); });
const js = expression => cdpSend('Runtime.evaluate', { expression });
let chrome, frameN = 0;
async function phoneStart() {
  chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/chrome-profile`, '--no-first-run', '--window-size=390,844', 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 60; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); break; } catch { await sleep(250); } }
  cdp = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => cdp.onopen = r);
  cdp.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && waits[m.id]) { waits[m.id](m.result); delete waits[m.id]; }
    if (m.method === 'Page.screencastFrame') {
      const { data, metadata, sessionId } = m.params;
      const n = String(++frameN).padStart(6, '0');
      writeFileSync(`${OUT}/phone/${n}.jpg`, Buffer.from(data, 'base64'));
      appendFileSync(`${OUT}/phone/frames.txt`, `${n} ${Math.round(metadata.timestamp * 1000)}\n`);
      cdpSend('Page.screencastFrameAck', { sessionId });
    }
  };
  await cdpSend('Browser.grantPermissions', { permissions: ['geolocation'], origin: 'http://localhost:8792' });
  await cdpSend('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await phoneGeo(37.272, 127.114); // 기흥 휴게소 부근
  await cdpSend('Page.enable'); await cdpSend('Runtime.enable');
  await cdpSend('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
}
const phoneGeo = (latitude, longitude) => cdpSend('Emulation.setGeolocationOverride', { latitude, longitude, accuracy: 10 });

async function main() {
  writeFileSync(`${OUT}/timeline.json`, '[]');
  adb('logcat', '-c');
  const logcat = spawn('adb', ['-s', 'emulator-5554', 'logcat', '-v', 'epoch', '-s', 'Ppeokkugi'], { stdio: ['ignore', 'pipe', 'ignore'] });
  logcat.stdout.pipe(createWriteStream(`${OUT}/logcat.txt`));

  // 앱을 입장 화면으로: 이미 방에 있으면 나가기
  adb('shell', 'am', 'start', '--user', '10', '-n', 'com.ppeokkugi/.MainActivity');
  await sleep(2500);
  tapText('운전석');
  if (tapText('나가기', '방 나가기')) await sleep(1500);

  await phoneStart();                                  // Chrome 을 먼저 띄워 둔다(기동 수 초)
  const rec = recLoop();
  await sleep(5000);                                   // 입장 화면(마스코트)
  tapText('시연 모드 · 봇과 함께 달리기', '시연 모드');
  let code;
  for (let i = 0; i < 40 && !code; i++) { await sleep(250); code = adb('logcat', '-d', '-s', 'Ppeokkugi').match(/방 ([A-Z0-9]{6,8}) 입장 시도/)?.[1]; }
  if (!code) throw new Error('방 코드를 찾지 못함');
  mark('room', { code });
  await sleep(6000);                                   // 봇 대기 화면

  const bots = spawn('node', ['server/scripts/bots.mjs', code, '--speed', String(SPEED)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  const botLog = createWriteStream(`${OUT}/bots.log`);
  bots.stdout.on('data', d => { botLog.write(`${Date.now()} ${d}`); });
  bots.stderr.pipe(botLog);
  const T0 = Date.now(); mark('bots start', { speed: SPEED });
  const at = s => sleep(Math.max(0, T0 + s * 1000 - Date.now()));

  await at(3);  await cdpSend('Page.navigate', { url: `http://localhost:8792/?code=${code}` }); mark('phone open');
  await at(5);  await js(`document.getElementById('agree').click()`);
  await at(6);  await js(`document.getElementById('go').click()`); mark('phone join');
  await at(9);  tap(2028, 1202, 'PTT 누름');           // 송신 표시. 에뮬레이터에는 마이크 입력이 없다
  await at(14); tap(2028, 1202, 'PTT 끔');
  await at(21); await js(`document.getElementById('text').value='천천히 갑시다';document.getElementById('send').click()`); mark('phone say');
  await at(26); tap(2339, 128, '승객 탭');
  await at(55); tap(2211, 128, '운전석 탭');
  await at(63); tapText('안성 휴게소', '앱 투표');
  await at(67); await js(`[...document.querySelectorAll('#opts button')].find(b=>b.textContent.includes('안성'))?.click()`); mark('phone vote');
  // 시연 모드 선두(앱)는 내비에 경로가 없어 경유지 추가가 "경로 탐색 오류"로 끝난다. 대화 상자를 닫고 앱으로 돌아온다
  await at(74); tapText('닫기', '내비 오류 닫기');
  await at(76); adb('shell', 'am', 'start', '--user', '10', '-n', 'com.ppeokkugi/.MainActivity'); mark('app front');
  // 휴대폰은 기흥 부근에 서 있으므로 도착 판정 전에 방을 나간다
  await at(150); await js(`document.getElementById('leave').click()`); mark('phone leave');
  // 봇이 일행 도착(arrive)을 받으면 15초 머문 뒤 끝난다
  await new Promise(r => bots.on('exit', r));
  mark('bots exit');
  await sleep(2000);
  recording = false; await rec;
  await cdpSend('Page.stopScreencast');
  chrome.kill(); logcat.kill();
  mark('done');
  process.exit(0);
}
main().catch(e => { console.error(e); recording = false; chrome?.kill(); process.exit(1); });
