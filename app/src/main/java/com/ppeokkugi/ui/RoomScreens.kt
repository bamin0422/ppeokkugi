package com.ppeokkugi.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ppeokkugi.CarInfo
import com.ppeokkugi.Mood
import com.ppeokkugi.Radio
import com.ppeokkugi.RoomState
import com.ppeokkugi.Seats
import com.ppeokkugi.StatusViewModel
import com.ppeokkugi.VoteUi
import com.ppeokkugi.car.Locator
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val CHANNELS = listOf("all" to "전체", "adult" to "어른", "kids" to "키즈")

// --- 입장 ---

@Composable
fun JoinScreen(vm: StatusViewModel, s: RoomState) {
    var code by remember { mutableStateOf("") }
    Box(Modifier.fillMaxSize().background(C.bg).padding(R_.lg), contentAlignment = Alignment.Center) { Row(
        Modifier.height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(32.dp),
    ) {
        Panel(Modifier.weight(1f).fillMaxHeight(), Mood.TALK) {
            Text("새 무전방", style = T.pageTitle)
            Text("방을 만들고 채널 코드를 일행에게 알려 주십시오.", style = T.note.copy(fontSize = 22.sp), textAlign = TextAlign.Center)
            Spacer(Modifier.weight(1f))
            BigButton(if (s.busy) "만드는 중…" else "방 만들기", enabled = !s.busy) { vm.createRoom() }
            SubButton("시연 모드 · 봇과 함께 달리기", enabled = !s.busy) { vm.startDemoMode() }
        }
        Panel(Modifier.weight(1f).fillMaxHeight(), Mood.WAIT) {
            Text("코드로 들어가기", style = T.pageTitle)
            Text(
                if (s.driving) "주행 중에는 코드를 입력할 수 없습니다. 정차한 뒤 입력하십시오." else "받은 6자리 코드를 채널 창에 입력하십시오.",
                style = T.note.copy(fontSize = 22.sp, color = if (s.driving) C.warnInk else C.ink2), textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(R_.sm))
            // 채널 창: 코드를 LCD 에 바로 친다
            Lcd(Modifier.fillMaxWidth().height(96.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("CH", style = T.lcd.copy(fontSize = 24.sp, color = C.lcdDim, letterSpacing = 3.sp))
                    Spacer(Modifier.width(R_.md))
                    val style = T.lcd.copy(fontSize = 48.sp, lineHeight = 56.sp, letterSpacing = 8.sp)
                    Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                        if (code.isEmpty()) Text("ABC234", style = style.copy(color = C.lcdDim))
                        BasicTextField(
                            value = code,
                            onValueChange = { code = it.uppercase().filter { c -> c.isLetterOrDigit() }.take(8) },
                            enabled = !s.driving,
                            singleLine = true,
                            textStyle = style,
                            cursorBrush = SolidColor(C.lcdInk),
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }
            Spacer(Modifier.height(R_.sm))
            BigButton("들어가기", enabled = !s.driving && code.length >= 6) { vm.joinRoom(code) }
        }
    } }
}

// --- 운전석 ---

/**
 * 주행 중(CarUxRestrictions)에는 스크롤 목록과 입력을 두지 않고 최근 무전 3개와 큰 버튼만 보인다.
 * 왼쪽 일행 지도는 손댈 것 없이 스스로 맞추므로 주행 중에도 그대로 둔다
 */
@Composable
fun DriverScreen(vm: StatusViewModel, s: RoomState) {
    Row(Modifier.fillMaxSize().background(C.bg).padding(start = 28.dp, end = 28.dp, bottom = R_.lg), horizontalArrangement = Arrangement.spacedBy(R_.lg)) {
        Column(Modifier.width(600.dp).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("일행", style = T.sectionLabel)
            GroupMap(s, Modifier.fillMaxWidth().weight(1f))
            val myPos = s.cars.find { it.me }
            s.cars.take(4).forEach { CarRow(it, myPos, s.rolls[it.label]) }
            if (s.cars.isEmpty()) Text("아직 아무도 없습니다", style = T.note)
            if (s.demo && s.cars.size <= 1 && s.radios.isEmpty()) DemoHint(s.code)
            if (s.me == 1) SubButton("경로 공유 · 대장 콜", onClick = vm::shareRoute)
            Text("자동 콜은 안전장치가 아니라 미리 알려 드리는 안내입니다.", style = T.note)
        }
        Column(Modifier.weight(1f).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            s.vote?.let { VoteCards(it, vm::vote, Play.ONCE) }
            Text("최근 무전", style = T.sectionLabel)
            // 무전마다 새 자리로 두어 새로 온 카드만 한 번 튀어나온다. 맨 위 카드는 캐릭터를 더 크게
            s.radios.take(if (s.vote != null) 1 else 3).forEach { r -> key(r.id) { RadioCard(r, big = true, play = Play.ONCE, face = 118.dp) } }
            if (s.radios.isEmpty()) Text("일행의 자동 콜과 무전이 여기에 뜹니다.", style = T.note)
            Spacer(Modifier.weight(1f))
            TalkButton(s, vm)
        }
    }
}

/** 시연 모드에서 봇이 들어오기 전까지 PC에서 칠 명령을 보인다 */
@Composable
private fun DemoHint(code: String?) {
    Row(Modifier.fillMaxWidth().pin(border = C.accent, borderWidth = 2.dp).padding(R_.md), verticalAlignment = Alignment.CenterVertically) {
        SpeakerBox(Modifier.size(120.dp), C.tint(Mood.WAIT)) { CuckooView(Mood.WAIT, Modifier.size(104.dp)) }
        Spacer(Modifier.width(R_.md))
        Column {
            Text("시연 모드 · 봇을 기다립니다", style = T.sectionLabel.copy(fontSize = 24.sp))
            Text("PC에서 실행하십시오", style = T.note)
            Text("node server/scripts/bots.mjs ${code ?: ""}", style = T.body.copy(fontWeight = FontWeight.Bold))
            Text("봇이 들어오면 데모 주행이 시작됩니다", style = T.note)
        }
    }
}

@Composable
private fun CarRow(c: CarInfo, me: CarInfo?, roll: String?) {
    val dist = if (!c.me && me?.lat != null && c.lat != null) Locator.haversineM(me.lat, me.lng!!, c.lat, c.lng!!) else null
    Row(Modifier.fillMaxWidth().pin(shape = RoundedCornerShape(22.dp), lift = 0.dp).padding(horizontal = 18.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        val flag = C.car(c.num)
        // 호차 색 둥근 칸에 번호
        Box(Modifier.size(48.dp).background(flag, RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
            Text("${c.num}", style = T.lcd.copy(fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = onFlag(flag)))
        }
        Spacer(Modifier.width(R_.md))
        Column(Modifier.weight(1f)) {
            Text(c.label + if (c.me) " · 우리 차" else "", style = T.body.copy(fontSize = 26.sp, fontWeight = FontWeight.ExtraBold), maxLines = 1)
            Text(listOfNotNull(c.nickname.takeIf { it.isNotBlank() && !c.me }, roll).joinToString(" · ").ifBlank { "점호 전" }, style = T.note, maxLines = 1)
        }
        Text(dist?.let { com.ppeokkugi.domain.Phrase.distance(it) } ?: if (c.me) "" else "—", style = T.lcd.copy(fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = C.ink))
    }
}

/** 보낸 쪽 칩 색: "N호차" 면 그 호차 색, 자동 콜 등은 수신 파랑, 내 무전은 주황 */
private fun senderColor(r: Radio): Color =
    Regex("^(\\d+)호차").find(r.from)?.groupValues?.get(1)?.toInt()?.let(C::car) ?: if (r.mood == Mood.TX) C.accent else C.rx

/**
 * 무전 카드: 핀 카드. 왼쪽에 표정 색 칸의 마스코트, 오른쪽에 "RX [보낸 쪽] 파형 시각" 과 글, 오른쪽 아래 스피커 그릴.
 * 막 온 카드는 파형이 잡음처럼 흔들린다. 급제동·긴급은 송신 빨강 굵은 테와 빨간 글자
 */
@Composable
fun RadioCard(r: Radio, big: Boolean, play: Play = Play.LOOP, face: Dp = if (big) 118.dp else 64.dp) {
    val alert = r.mood.alert
    // 승객 목록을 넘겨 다시 그릴 때는 흔들지 않는다
    val fresh = remember(r.id) { System.currentTimeMillis() - r.at < 3_000 }
    val chip = senderColor(r)
    Box(Modifier.fillMaxWidth().pin(border = if (alert) C.tx else C.line, borderWidth = if (alert) 3.dp else R_.stroke, lift = if (big) 12.dp else 4.dp)) {
        // 스피커 그릴은 글 뒤에 깐다(긴 글이 덮어도 읽힌다)
        Box(Modifier.align(Alignment.BottomEnd).padding(end = 22.dp, bottom = 14.dp).size(72.dp, 22.dp).grille(step = 12.dp, dot = 3.dp))
        Row(Modifier.height(IntrinsicSize.Min)) {
            Box(Modifier.width(face + if (big) 32.dp else 20.dp).fillMaxHeight().background(C.tint(r.mood)), contentAlignment = Alignment.Center) {
                CuckooView(r.mood, Modifier.size(face).padding(vertical = 6.dp), play)
            }
            Column(Modifier.weight(1f).padding(horizontal = if (big) 28.dp else 18.dp, vertical = if (big) 20.dp else 12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // 내가 보낸 무전은 TX, 받은 무전은 RX
                    Text(if (r.mood == Mood.TX) "TX" else "RX", style = T.lcd.copy(fontSize = 20.sp, color = C.ink2, letterSpacing = 1.sp))
                    Spacer(Modifier.width(12.dp))
                    Text(r.from, style = T.lcd.copy(fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = onFlag(chip)), maxLines = 1,
                        modifier = Modifier.background(chip, Pill).padding(horizontal = 14.dp, vertical = 3.dp))
                    if (r.channel != "all") {
                        Spacer(Modifier.width(8.dp))
                        Chip(CHANNELS.first { it.first == r.channel }.second + " 채널", r.channel == "kids")
                    }
                    Spacer(Modifier.width(12.dp))
                    Waveform(r.id.toInt(), live = fresh, color = chip, modifier = Modifier.size(if (big) 64.dp else 44.dp, 26.dp))
                    Spacer(Modifier.weight(1f))
                    Text(TIME.format(Date(r.at)), style = T.lcd.copy(fontSize = 20.sp, fontWeight = FontWeight.SemiBold, color = C.ink3))
                }
                Spacer(Modifier.height(if (big) 8.dp else 4.dp))
                Text(
                    r.text,
                    style = if (big) T.cardText.copy(color = if (alert) C.txInk else C.ink) else T.body.copy(fontWeight = FontWeight.Bold, color = if (alert) C.txInk else C.ink),
                    maxLines = if (big) 2 else 4,
                )
            }
        }
    }
}

@Composable
private fun VoteCards(v: VoteUi, onVote: (Int) -> Unit, play: Play) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(v) { while (true) { now = System.currentTimeMillis(); delay(500) } }
    Row(verticalAlignment = Alignment.CenterVertically) {
        SpeakerBox(Modifier.size(120.dp), C.tint(Mood.VOTE)) { CuckooView(Mood.VOTE, Modifier.size(104.dp), play) }
        Spacer(Modifier.width(R_.md))
        Text("쉬어 가 · 번호를 누르거나 \"1번\"이라고 말하십시오", style = T.sectionLabel, modifier = Modifier.weight(1f))
        Spacer(Modifier.width(R_.md))
        Lcd { Text("${((v.deadline - now) / 1000).coerceAtLeast(0)}초", style = T.lcd.copy(fontSize = 36.sp, lineHeight = 40.sp)) }
    }
    Row(horizontalArrangement = Arrangement.spacedBy(R_.md)) {
        v.candidates.forEachIndexed { i, c ->
            val mine = v.myChoice == i
            val open = v.myChoice == null || mine
            SoftButton(
                onClick = { onVote(i) }, enabled = open,
                fill = if (mine) C.accent else C.paper, border = if (mine) C.accent else C.line,
                shape = RoundedCornerShape(R_.card),
                modifier = Modifier.weight(1f).height(200.dp),
            ) {
                Column(Modifier.fillMaxSize().padding(horizontal = R_.lg, vertical = 20.dp)) {
                    val tag = C.cars[i % C.cars.size]
                    Box(Modifier.size(64.dp).background(if (mine) C.paper else if (open) tag else C.ink3, RoundedCornerShape(20.dp)), contentAlignment = Alignment.Center) {
                        Text("${i + 1}", style = T.lcd.copy(fontSize = 40.sp, lineHeight = 44.sp, fontWeight = FontWeight.ExtraBold, color = if (mine) C.ink else onFlag(tag)))
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(c.name, style = T.cardText.copy(fontSize = 34.sp, lineHeight = 42.sp, color = if (open) C.ink else C.ink2), maxLines = 2)
                }
            }
        }
    }
}

/**
 * 큰 무전 버튼: 짙은 무전기 판에 그릴 점과 주황 PTT. 판 전체가 눌린다.
 * 듣는 동안 송신 빨강 테·LED 와 "TX", 실제 마이크 크기 미터를 켠다
 */
@Composable
private fun TalkButton(s: RoomState, vm: StatusViewModel, ptt: Dp = 420.dp) {
    val level by vm.voice.level.collectAsState()
    val press = remember { MutableInteractionSource() }
    val down by press.collectIsPressedAsState()
    Row(
        Modifier.fillMaxWidth().height(144.dp)
            .pin(C.ink, if (s.listening) C.tx else C.ink, RoundedCornerShape(36.dp), lift = 14.dp, borderWidth = 3.dp)
            .clickable(interactionSource = press, indication = null, role = Role.Button, onClick = vm::talk)
            .padding(start = 32.dp, end = 17.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Led(if (s.listening) C.tx else C.rx, on = true, size = 18.dp, blink = s.listening)
        Spacer(Modifier.width(R_.lg))
        if (s.listening) {
            CuckooView(Mood.TX, Modifier.size(104.dp))
            Spacer(Modifier.width(R_.md))
            Text("TX", style = T.lcd.copy(fontSize = 44.sp, lineHeight = 48.sp, fontWeight = FontWeight.ExtraBold, color = Color.White),
                modifier = Modifier.background(C.tx, RoundedCornerShape(18.dp)).padding(horizontal = 18.dp, vertical = 6.dp))
            Spacer(Modifier.width(R_.lg))
            Column(Modifier.weight(1f).padding(end = 15.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                LevelMeter(level, Modifier.fillMaxWidth().height(24.dp))
                Text("듣는 중… ${s.heard}".take(30), style = T.body.copy(color = Color.White), maxLines = 1)
            }
        } else {
            Box(Modifier.weight(1f).height(72.dp).grille(C.grille, step = 16.dp, dot = 4.dp))
            Spacer(Modifier.width(R_.lg))
            Text("누르고 말하기", style = T.body.copy(fontSize = 22.sp, color = C.onDark), maxLines = 1)
            Spacer(Modifier.width(R_.lg))
            // 주황 PTT: 위쪽이 밝고 아래 안쪽 그림자가 진 고무 버튼
            Box(
                Modifier.height(110.dp).width(ptt).scale(if (down) 0.97f else 1f)
                    .pin(C.accent, C.accent, Pill, lift = if (down) 0.dp else 10.dp, borderWidth = 0.dp)
                    .background(Brush.verticalGradient(listOf(C.accentHi, C.accent)))
                    .padding(bottom = 4.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text("무전", style = T.brand.copy(fontSize = 52.sp, lineHeight = 60.sp, letterSpacing = 6.sp, color = C.ink))
            }
        }
    }
}

/** 마이크 크기 미터 16칸: 파랑·주황·빨강 */
@Composable
private fun LevelMeter(level: Float, modifier: Modifier) {
    Canvas(modifier) {
        val n = 16; val w = size.width / n; val bw = w - 6.dp.toPx()
        for (i in 0 until n) {
            val c = when { i >= 13 -> C.tx; i >= 10 -> C.accent; else -> C.rx }
            drawRoundRect(if (i < level * n) c else c.copy(alpha = 0.22f), Offset(i * w, 0f), Size(bw, size.height), CornerRadius(bw / 2))
        }
    }
}

// --- 승객 ---

@Composable
fun PassengerScreen(vm: StatusViewModel, s: RoomState, seats: Seats) {
    Row(Modifier.fillMaxSize().background(C.bg).padding(start = 28.dp, end = 28.dp, bottom = R_.lg), horizontalArrangement = Arrangement.spacedBy(R_.lg)) {
        Column(Modifier.width(660.dp).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("보낼 채널", style = T.sectionLabel)
            Segmented(CHANNELS, seats.channel) { c -> vm.updateSeats { it.copy(channel = c) } }
            Text("내 좌석 (화자 식별이 안 될 때 씁니다)", style = T.sectionLabel)
            Segmented(StatusViewModel.SEAT_NAME.toList(), seats.seat) { c -> vm.updateSeats { it.copy(seat = c) } }
            Text("좌석 스피커 (오디오 존 번호)", style = T.sectionLabel)
            ZoneRow("운전석 · 안내만", seats.guideZone) { z -> vm.updateSeats { it.copy(guideZone = z) } }
            ZoneRow("조수석 · 어른 채널", seats.adultZone) { z -> vm.updateSeats { it.copy(adultZone = z) } }
            ZoneRow("뒷좌석 · 키즈 채널", seats.kidsZone) { z -> vm.updateSeats { it.copy(kidsZone = z) } }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("채널 이름을 앞에 붙여 읽기", style = T.body, modifier = Modifier.weight(1f))
                Toggle(seats.prefixChannel) { v -> vm.updateSeats { it.copy(prefixChannel = v) } }
            }
            Spacer(Modifier.weight(1f))
            var text by remember { mutableStateOf("") }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f).height(80.dp).pin(shape = Pill, lift = 0.dp, border = C.line, borderWidth = 2.dp).padding(horizontal = 28.dp), contentAlignment = Alignment.CenterStart) {
                    if (text.isEmpty()) Text("글로 보내기", style = T.body.copy(color = C.ink2, fontWeight = FontWeight.Normal))
                    BasicTextField(
                        value = text, onValueChange = { text = it }, singleLine = true, textStyle = T.body,
                        cursorBrush = SolidColor(C.accent), modifier = Modifier.fillMaxWidth(),
                    )
                }
                Spacer(Modifier.width(R_.sm))
                SoftButton(onClick = { vm.onHeard(text); text = "" }, enabled = text.isNotBlank(), fill = C.ink, border = C.ink, modifier = Modifier.width(150.dp).height(80.dp)) {
                    Text("보내기", style = T.button.copy(color = if (text.isNotBlank()) Color.White else C.ink2))
                }
            }
            TalkButton(s, vm, ptt = 300.dp)
        }
        Column(Modifier.weight(1f).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            s.vote?.let { VoteCards(it, vm::vote, Play.LOOP) }
            Text("일행 지도", style = T.sectionLabel)
            GroupMap(s, Modifier.fillMaxWidth().height(if (s.vote != null) 300.dp else 460.dp))
            if (s.rolls.isNotEmpty()) {
                Text("점호", style = T.sectionLabel)
                Row(Modifier.fillMaxWidth().pin(lift = 4.dp).height(IntrinsicSize.Min), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.width(96.dp).fillMaxHeight().background(C.tint(Mood.ROLLCALL)), contentAlignment = Alignment.Center) {
                        CuckooView(Mood.ROLLCALL, Modifier.size(72.dp))
                    }
                    Column(Modifier.padding(horizontal = R_.lg, vertical = R_.md)) { s.rolls.toSortedMap().values.forEach { Text(it, style = T.body) } }
                }
            }
            Text("무전 기록", style = T.sectionLabel)
            // 새 무전이 위에 붙으므로 맨 위로 올린다. 그대로 두면 LazyColumn 이 보던 항목을 붙잡아 새 무전이 화면 밖에 생긴다
            val list = rememberLazyListState()
            LaunchedEffect(s.radios.firstOrNull()?.id) { list.scrollToItem(0) }
            LazyColumn(
                Modifier.fillMaxWidth().weight(1f), state = list, verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 8.dp),
            ) {
                items(s.radios, key = { it.id }) { RadioCard(it, big = false) }
            }
        }
    }
}

@Composable
private fun ZoneRow(label: String, zone: Int, onChange: (Int) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = T.body, modifier = Modifier.weight(1f))
        Segmented((0..3).map { it.toString() to "존 $it" }, zone.toString()) { onChange(it.toInt()) }
    }
}

/** 둥근 마디 탭: 흰 알약 안에서 고른 칸만 짙게 칠한다 */
@Composable
fun Segmented(options: List<Pair<String, String>>, selected: String, padH: Dp = 22.dp, onSelect: (String) -> Unit) {
    Row(Modifier.pin(shape = Pill, lift = 0.dp).padding(6.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        options.forEach { (id, name) ->
            val on = id == selected
            Box(
                Modifier.height(64.dp).background(if (on) C.ink else Color.Transparent, Pill)
                    .clickable(role = Role.Tab) { onSelect(id) }.padding(horizontal = padH),
                contentAlignment = Alignment.Center,
            ) {
                Text(name, style = T.button.copy(color = if (on) Color.White else C.ink2))
            }
        }
    }
}

@Composable
private fun Chip(text: String, kids: Boolean) {
    val bg = if (kids) C.car(6) else C.accent
    Text(text, style = T.note.copy(fontWeight = FontWeight.Bold, color = onFlag(bg)), modifier = Modifier.background(bg, Pill).padding(horizontal = 12.dp, vertical = 2.dp))
}

@Composable
private fun SubButton(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    SoftButton(onClick = onClick, enabled = enabled, border = C.line, modifier = Modifier.fillMaxWidth().height(84.dp)) {
        Text(text, style = T.button.copy(color = if (enabled) C.ink else C.ink2))
    }
}

/** 입장 패널: 무전기 앞면 같은 큰 핀 카드. 맨 위에 표정 칸과 스피커 그릴 */
@Composable
private fun Panel(modifier: Modifier, mood: Mood, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier) {
        Column(
            Modifier.weight(1f).fillMaxWidth().pin(shape = RoundedCornerShape(36.dp), lift = 16.dp).padding(32.dp),
            verticalArrangement = Arrangement.spacedBy(R_.sm), horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            SpeakerBox(Modifier.fillMaxWidth().height(170.dp), C.tint(mood)) {
                CuckooView(mood, Modifier.size(150.dp))
                Box(Modifier.align(Alignment.BottomEnd).padding(18.dp).size(84.dp, 36.dp).grille(C.paper.copy(alpha = 0.8f), 12.dp, 3.dp))
            }
            Spacer(Modifier.height(6.dp))
            content()
        }
    }
}

@Composable
private fun BigButton(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    SoftButton(onClick = onClick, enabled = enabled, fill = C.accent, border = C.accent, modifier = Modifier.fillMaxWidth().height(100.dp)) {
        Text(text, style = T.button.copy(fontSize = 32.sp, lineHeight = 36.sp, fontWeight = FontWeight.ExtraBold, color = if (enabled) C.ink else C.ink2))
    }
}

/** 켬/끔 스위치: 켜지면 주황 알약에 손잡이가 오른쪽 */
@Composable
private fun Toggle(on: Boolean, onChange: (Boolean) -> Unit) {
    Box(
        Modifier.size(168.dp, 76.dp).background(if (on) C.accent else C.line, Pill)
            .border(R_.stroke, if (on) C.accent else C.ink3.copy(alpha = 0.5f), Pill)
            .clickable(role = Role.Switch) { onChange(!on) }.padding(8.dp),
        contentAlignment = if (on) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Box(Modifier.size(92.dp, 60.dp).pin(C.paper, C.paper, Pill, lift = 4.dp), contentAlignment = Alignment.Center) {
            Text(if (on) "켜짐" else "꺼짐", style = T.button.copy(fontSize = 20.sp, color = if (on) C.ink else C.ink2))
        }
    }
}

private val TIME = SimpleDateFormat("HH:mm:ss", Locale.KOREA)
