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
/** 글자 대신 좌표로 누른다. 새 앱은 마스코트 애니메이션이 계속 돌아 uiautomator dump 가 "could not get idle state"로 실패한다.
 *  좌표는 2560x1440 에뮬레이터 화면 기준(앱 화면은 x 853~2535, y 90~1300). 앱 배치가 바뀌면 여기만 고친다. */
const XY = {
  '운전석': [2226, 154], '승객': [2342, 154], '나가기': [1680, 154], '나가기2': [1632, 154],   // 나가기 위치는 머리줄 글 길이(1호차 선두/2호차)에 따라 달라 두 곳을 누른다
  '시연 모드': [1277, 977], 'PTT': [2280, 1203],
  '코드 칸': [2110, 840], '들어가기': [2300, 870],   // 자판이 뜨면 들어가기 버튼 왼쪽 아래를 가린다
  '투표1': [1660, 440], '투표2': [2000, 440], '투표3': [2340, 440],
};
const tapAt = (name, why) => tap(...XY[name], why || name);
const app = () => { adb('shell', 'am', 'start', '--user', '10', '-n', 'com.ppeokkugi/.MainActivity'); mark('app front'); };

adb('logcat', '-c');
const logcat = spawn('adb', ['-s', 'emulator-5554', 'logcat', '-v', 'epoch', '-s', 'Ppeokkugi'], { stdio: ['ignore', 'pipe', 'ignore'] });
logcat.stdout.pipe(createWriteStream(`${OUT}/logcat.txt`));

// 입장 화면으로
app(); await sleep(2500);
tapAt('운전석');
tapAt('나가기', '방 나가기'); await sleep(1500); tapAt('나가기2', '방 나가기'); await sleep(1500);

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
tapAt('코드 칸');
await sleep(1200);
for (let i = 0; i < 8; i++) adb('shell', 'input', 'keyevent', 'KEYCODE_DEL');
adb('shell', 'input', 'text', code); mark('code typed', { code });
await sleep(2000);
tapAt('들어가기');
const T0 = Date.now();
const at = s => sleep(Math.max(0, T0 + s * 1000 - Date.now()));
// 앱 pos(2초) → lead 시작 → +4초 대장 콜 → 내비가 앞으로 나온다
await at(16); app();
// +약 28초 투표 열림, 선두가 2초 뒤 기흥에 투표 → 앱이 기흥을 누르면 결과 → 경유지 추가로 내비가 앞으로
await at(33); tapAt('투표2', '앱 투표');   // 기흥. 투표는 약 +28초에 열린다
await at(44); app();
await at(54);
adb('emu', 'screenrecord', 'stop'); mark('rec stop');
lead.kill(); logcat.kill();
mark('done');
process.exit(0);
