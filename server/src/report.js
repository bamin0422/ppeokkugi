// 운수사 관제용 차량별 운행 보고서 화면. tripReport() 결과를 받아 인쇄 가능한 HTML 한 장으로 만든다

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const hm = at => at ? new Date(at).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }) : '–';
const day = at => new Date(at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });

export function reportHtml({ startedAt, rows, events }) {
  const tr = rows.map(r => `<tr>
    <td>${r.car}호차${r.nickname ? ` <small>${esc(r.nickname)}</small>` : ''}</td>
    <td>${hm(r.joinedAt)}</td><td>${hm(r.arrivedAt)}</td><td>${r.minutes ?? '–'}분</td>
    <td>${r.km}km</td><td>${r.maxSpeed}km/h</td>
    <td class="${r.brake ? 'hit' : ''}">${r.brake}</td><td class="${r.airbag ? 'hit' : ''}">${r.airbag}</td>
    <td>${r.rejoins}</td><td>${r.says}</td><td>${r.people ?? '–'}</td></tr>`).join('');
  const ev = events.map(e => `<li><time>${hm(e.at)}</time><b>${e.car ? `${e.car}호차` : '일행'}</b>${esc(e.text)}</li>`).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>뻐꾸기 운행 보고서</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"><style>
:root{--bg:#F2F4F6;--surface:#FFFFFF;--grey50:#F9FAFB;--grey200:#E5E8EB;--text:#191F28;--text2:#4E5968;--text3:#6B7684;
--primary:#7B8EF5;--primary-weak:#EEF0FF;--primary-text:#3340B8;--danger:#F04452;--danger-weak:#FFEEEE;--danger-ink:#D22030;
--font:"Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif}
body{font:500 15px/1.5 var(--font);background:var(--bg);color:var(--text);margin:0;padding:40px 20px;-webkit-font-smoothing:antialiased}
main{max-width:1100px;margin:auto}h1{font:800 30px/1.25 var(--font);letter-spacing:-.03em;margin:0 0 12px}h1 em{color:var(--primary-text);font-style:normal}
p.sub{display:inline-block;background:var(--primary-weak);color:var(--primary-text);border-radius:10px;padding:6px 12px;margin:0 0 12px;font-size:14px;font-weight:700}
h2{font:800 20px/1.3 var(--font);letter-spacing:-.02em;margin:32px 2px 12px}
.wrap,ol{background:var(--surface);border-radius:24px}
.wrap{overflow-x:auto;padding:8px 12px}table{border-collapse:collapse;width:100%;font-size:14px;white-space:nowrap;font-variant-numeric:tabular-nums}
th,td{padding:13px 12px;border-bottom:1px solid var(--grey200);text-align:right}th:first-child,td:first-child{text-align:left}
tr:last-child td{border-bottom:0}th{color:var(--text3);font-weight:600;font-size:13px}td:first-child{font-weight:700}td small{color:var(--text3);font-weight:500;margin-left:4px}
td.hit{color:var(--danger-ink);font-weight:800}
ol{list-style:none;padding:8px 24px;margin:0;font-size:15px}li{padding:12px 0;border-bottom:1px solid var(--grey200)}li:last-child{border-bottom:0}
time{color:var(--text3);margin-right:14px;font-variant-numeric:tabular-nums;font-weight:600}li b{margin-right:8px;font-weight:700}
.note{color:var(--text3);font-size:13px;margin:20px 2px 0}
@media print{body{background:#fff;padding:0}.wrap,ol{border:1px solid var(--grey200)}}
</style></head><body><main>
<h1>차량별 <em>운행 보고서</em></h1>
<p class="sub">${day(startedAt)} · 차량 ${rows.length}대 · 운수사 관제</p>
<h2>차량별 요약</h2>
<div class="wrap"><table><thead><tr><th>차량</th><th>입장</th><th>도착</th><th>운행</th><th>거리</th><th>최고 속도</th><th>급제동</th><th>에어백</th><th>이탈</th><th>무전</th><th>점호</th></tr></thead>
<tbody>${tr || '<tr><td colspan="11">기록 없음</td></tr>'}</tbody></table></div>
<h2>운행 타임라인</h2><ol>${ev || '<li>기록 없음</li>'}</ol>
<p class="note">차량 신호와 위치로 만든 기록입니다. 무전은 횟수만 남기고 내용과 음성은 저장하지 않습니다. 기록은 방과 함께 마지막 활동 24시간 후 삭제됩니다. 거리는 위치 보고 간격 기준 근사치입니다.</p>
</main></body></html>`;
}
