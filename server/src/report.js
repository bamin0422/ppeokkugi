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
<title>뻐꾸기 운행 보고서</title><style>
body{font-family:system-ui,sans-serif;background:#121417;color:#e8eaed;margin:0;padding:24px 16px}
main{max-width:1100px;margin:auto}h1{font-size:22px;margin:0 0 4px}h1 em{color:#FF6A1A;font-style:normal}
p.sub{color:#9aa0a6;margin:0 0 20px;font-size:14px}h2{font-size:16px;color:#C9D86A;margin:28px 0 8px}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:14px;white-space:nowrap}
th,td{padding:8px 10px;border-bottom:1px solid #2a2f35;text-align:right}th:first-child,td:first-child{text-align:left}
th{color:#9aa0a6;font-weight:600}td small{color:#9aa0a6}td.hit{color:#FF3B30;font-weight:700}
ol{list-style:none;padding:0;margin:0;font-size:14px}li{padding:6px 0;border-bottom:1px solid #1E2226}
time{color:#9aa0a6;margin-right:12px;font-variant-numeric:tabular-nums}li b{margin-right:8px}
.note{color:#9aa0a6;font-size:12px;margin-top:20px}
@media print{body{background:#fff;color:#000}h2{color:#000}th,td,li{border-color:#ccc}}
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
