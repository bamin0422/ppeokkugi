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
:root{--bg:#fffaf6;--paper:#fff;--line:#f1e6df;--ink:#2a2230;--ink2:#6e6170;--ink3:#ab9ca8;--lcd:#2a2230;--lcd-ink:#ffe9a3;--tx:#ff3d5a;--tx-ink:#c21535;--brand:#ff7a1a;
--serif:"Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;--sans:"Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",system-ui,sans-serif}
body{font:500 15px/1.5 var(--sans);background:var(--bg);color:var(--ink);margin:0;padding:28px 16px}
main{max-width:1100px;margin:auto}h1{font:700 28px/1.2 var(--serif);letter-spacing:-.03em;margin:0 0 10px}h1 em{color:var(--brand);font-style:normal}
p.sub{display:inline-block;background:var(--lcd);color:var(--lcd-ink);border-radius:14px;padding:6px 14px;margin:0 0 22px;font-size:14px;font-weight:700}
h2{font:700 20px/1.3 var(--serif);margin:28px 4px 10px}
.wrap,ol{background:var(--paper);border:1.5px solid var(--line);border-radius:24px;box-shadow:0 10px 26px rgba(80,40,60,.08)}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:14px;white-space:nowrap}
th,td{padding:12px 14px;border-bottom:1.5px solid var(--line);text-align:right}th:first-child,td:first-child{text-align:left}
tr:last-child td{border-bottom:0}th{color:var(--ink2);font-weight:700}td:first-child{font-weight:800}td small{color:var(--ink2);font-weight:500}
td.hit{color:var(--tx-ink);font-weight:800}
ol{list-style:none;padding:6px 18px;margin:0;font-size:14px}li{padding:10px 0;border-bottom:1.5px solid var(--line)}li:last-child{border-bottom:0}
time{color:var(--ink2);margin-right:12px;font-variant-numeric:tabular-nums;font-weight:700}li b{margin-right:8px}
.note{color:var(--ink2);font-size:12px;margin:20px 4px 0}
@media print{body{background:#fff}.wrap,ol{box-shadow:none}p.sub{background:none;color:var(--ink);padding:0}}
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
