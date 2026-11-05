#!/usr/bin/env node
// 시연 영상 촬영 2: 코드로 참여 → 대장 콜(내비 경로) → 쉬어 가 투표 → 순정 내비 경유지 등록.
// 앱을 2호차로 넣고 lead.mjs 가 1호차(선두)를 맡는다. 시연 모드 선두는 내비에 경로가 없어 경유지 추가가 실패하므로 따로 찍는다.
// 사용: node docs/video/src/shoot2.mjs <출력 폴더>   (server 에서 wrangler dev --port 8792 실행 중)
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, createWriteStream } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv[2] || 'take2');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => execFileSync('adb', ['-s', 'emulator-5554', ...a], { encoding: 'utf8' });
const timeline = [];
const mark = (what, extra = {}) => { const e = { t: Date.now(), what, ...extra }; timeline.push(e); console.log(new Date(e.t).toISOString().slice(11, 23), what, JSON.stringify(extra)); writeFileSync(`${OUT}/timeline.json`, JSON.stringify(timeline, null, 1)); };
const tap = (x, y, why) => { adb('shell', 'input', 'tap', String(x), String(y)); mark('tap', { x, y, why }); };
function tapText(text, why) {
  adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml');
  const m = adb('shell', 'cat', '/sdcard/ui.xml').match(new RegExp(`text="${text}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`));
  if (!m) { mark('tapText 실패', { text }); return null; }
  const xy = [(+m[1] + +m[3]) >> 1, (+m[2] + +m[4]) >> 1];
  tap(...xy, why || text);
  return xy;
}
const app = () => { adb('shell', 'am', 'start', '--user', '10', '-n', 'com.ppeokkugi/.MainActivity'); mark('app front'); };

adb('logcat', '-c');
const logcat = spawn('adb', ['-s', 'emulator-5554', 'logcat', '-v', 'epoch', '-s', 'Ppeokkugi'], { stdio: ['ignore', 'pipe', 'ignore'] });
logcat.stdout.pipe(createWriteStream(`${OUT}/logcat.txt`));

// 입장 화면으로
app(); await sleep(2500);
tapText('운전석');
if (tapText('나가기', '방 나가기')) await sleep(1500);

const { code } = await (await fetch('http://localhost:8792/api/rooms', { method: 'POST' })).json();
mark('room', { code });
const lead = spawn('node', [`${HERE}/lead.mjs`, code, '150'], { stdio: ['ignore', 'pipe', 'pipe'] });
const leadLog = createWriteStream(`${OUT}/lead.log`);
lead.stdout.pipe(leadLog); lead.stderr.pipe(leadLog);
await sleep(1500);

const f = `${OUT}/emu-1.webm`;
adb('emu', 'screenrecord', 'start', '--time-limit', '170', '--fps', '24', f);
mark('rec start', { seg: 1, file: f });
await sleep(4000);
tap(2100, 829, '코드 칸');
await sleep(1200);
adb('shell', 'input', 'text', code); mark('code typed', { code });
await sleep(2000);
tap(2350, 870, '들어가기');                  // 자판이 버튼 아래쪽을 가리므로 위쪽을 누른다
const T0 = Date.now();
const at = s => sleep(Math.max(0, T0 + s * 1000 - Date.now()));
// 앱 pos(2초) → lead 시작 → +4초 대장 콜 → 내비가 앞으로 나온다
await at(16); app();
// +약 28초 투표 열림, 선두가 2초 뒤 기흥에 투표 → 앱이 기흥을 누르면 결과 → 경유지 추가로 내비가 앞으로
await at(29); for (let i = 0; i < 12 && !tapText('기흥 휴게소', '앱 투표'); i++) await sleep(1000);
await at(44); app();
await at(54);
adb('emu', 'screenrecord', 'stop'); mark('rec stop');
lead.kill(); logcat.kill();
mark('done');
process.exit(0);
