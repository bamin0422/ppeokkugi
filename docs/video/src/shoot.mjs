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
// 봇 배속. 2배속이면 급제동 17초, 비 32초, 키즈 47초, 화장실 62초, 도착 약 205초.
// 1배속은 봇의 도착 대기(실제 180초)가 먼저 끝나 도착 장면이 안 나온다. 2배속을 쓴다
const SPEED = Number(process.env.SPEED || 2);
const SEG = 170;            // 에뮬레이터 녹화 한 토막(초). 콘솔 녹화 상한 180초 안
const sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => execFileSync('adb', ['-s', 'emulator-5554', ...a], { encoding: 'utf8' });
const timeline = [];
const mark = (what, extra = {}) => { const e = { t: Date.now(), what, ...extra }; timeline.push(e); console.log(new Date(e.t).toISOString().slice(11, 23), what, JSON.stringify(extra)); writeFileSync(`${OUT}/timeline.json`, JSON.stringify(timeline, null, 1)); };
const tap = (x, y, why) => { adb('shell', 'input', 'tap', String(x), String(y)); mark('tap', { x, y, why }); };

/** 글자 대신 좌표로 누른다. 새 앱은 마스코트 애니메이션이 계속 돌아 uiautomator dump 가 "could not get idle state"로 실패한다.
 *  좌표는 2560x1440 에뮬레이터 화면 기준(앱 화면은 x 853~2535, y 90~1300). 앱 배치가 바뀌면 여기만 고친다. */
const XY = {
  '운전석': [2226, 154], '승객': [2342, 154], '나가기': [1680, 154], '나가기2': [1632, 154],   // 나가기 위치는 머리줄 글 길이(1호차 선두/2호차)에 따라 달라 두 곳을 누른다
  '시연 모드': [1277, 977], 'PTT': [2280, 1203],
  '코드 칸': [2110, 840], '들어가기': [2300, 870],   // 자판이 뜨면 들어가기 버튼 왼쪽 아래를 가린다
  '투표1': [1660, 440], '투표2': [2000, 440], '투표3': [2340, 440],
};
const tapAt = (name, why) => tap(...XY[name], why || name);

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
  tapAt('운전석');
  tapAt('나가기', '방 나가기'); await sleep(1500); tapAt('나가기2', '방 나가기'); await sleep(1500);   // 입장 화면이면 빈 곳을 누른다

  await phoneStart();                                  // Chrome 을 먼저 띄워 둔다(기동 수 초)
  const rec = recLoop();
  await sleep(5000);                                   // 입장 화면(마스코트)
  tapAt('시연 모드');
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
  const at = s => sleep(Math.max(0, T0 + s * (2 / SPEED) * 1000 - Date.now()));   // 아래 시각은 2배속 기준

  await at(3);  await cdpSend('Page.navigate', { url: `http://localhost:8792/?code=${code}` }); mark('phone open');
  await at(5);  await js(`document.getElementById('agree').click()`);
  await at(6);  await js(`document.getElementById('go').click()`); mark('phone join');
  await at(21); await js(`document.getElementById('text').value='천천히 갑시다';document.getElementById('send').click()`); mark('phone say');
  // 급제동(17초)·휴대폰 무전(21초) 안내 음성이 운전석 화면에서 바로 읽히도록 PTT·승객 탭은 그 뒤로 미룬다
  await at(42); tapAt('PTT', 'PTT 누름');           // 송신 표시. 에뮬레이터에는 마이크 입력이 없다
  await at(46); tapAt('PTT', 'PTT 끔');
  await at(48); tapAt('승객', '승객 탭');
  await at(57); tapAt('운전석', '운전석 탭');
  await at(63); tapAt('투표3', '앱 투표');   // 후보 순서: 서울 만남의광장, 기흥, 안성
  await at(67); await js(`[...document.querySelectorAll('#opts button')].find(b=>b.textContent.includes('안성'))?.click()`); mark('phone vote');
  // 투표 결과가 경유지로 들어가면 내비가 앞으로 나온다. 앱으로 돌아온다
  // 내비가 뜨는 시각은 투표 마감에 따라 76~100초로 달라진다. 늦게 뜬 경우에도 도착 장면이 앱에서 찍히도록 세 번 부른다
  for (const s of [76, 105, 125]) { await at(s); adb('shell', 'am', 'start', '--user', '10', '-n', 'com.ppeokkugi/.MainActivity'); mark('app front'); }
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
