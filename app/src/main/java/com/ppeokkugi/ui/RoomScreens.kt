package com.ppeokkugi.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
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
    Box(Modifier.fillMaxSize().background(C.paper).padding(R_.lg), contentAlignment = Alignment.Center) { Row(
        Modifier.height(IntrinsicSize.Min),
        horizontalArrangement = Arrangement.spacedBy(R_.lg),
    ) {
        Panel(Modifier.weight(1f).fillMaxHeight()) {
            SpeakerBox(Modifier.fillMaxWidth().height(144.dp)) { CuckooView(Mood.TALK, Modifier.size(128.dp)) }
            Text("새 무전방", style = T.pageTitle)
            Text("방을 만들고 채널 코드를 일행에게 알려 주십시오.", style = T.note)
            Spacer(Modifier.weight(1f))
            BigButton(if (s.busy) "만드는 중…" else "방 만들기", enabled = !s.busy) { vm.createRoom() }
            SubButton("시연 모드 · 봇과 함께 달리기", enabled = !s.busy) { vm.startDemoMode() }
        }
        Panel(Modifier.weight(1f).fillMaxHeight()) {
            SpeakerBox(Modifier.fillMaxWidth().height(144.dp)) { CuckooView(Mood.WAIT, Modifier.size(128.dp)) }
            Text("코드로 들어가기", style = T.pageTitle)
            Text(if (s.driving) "주행 중에는 코드를 입력할 수 없습니다. 정차한 뒤 입력하십시오." else "받은 6자리 코드를 채널 창에 입력하십시오.", style = T.note)
            Spacer(Modifier.height(R_.sm))
            // 채널 창: 코드를 LCD 에 바로 친다
            Lcd(Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("CH", style = T.lcd.copy(fontSize = 36.sp, color = C.lcdMuted))
                    OutlinedTextField(
                        value = code,
                        onValueChange = { code = it.uppercase().filter { c -> c.isLetterOrDigit() }.take(8) },
                        enabled = !s.driving,
                        singleLine = true,
                        textStyle = T.lcd.copy(fontSize = 48.sp, letterSpacing = 8.sp),
                        placeholder = { Text("ABC234", style = T.lcd.copy(fontSize = 48.sp, letterSpacing = 8.sp, color = C.lcdMuted)) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color.Transparent, unfocusedBorderColor = Color.Transparent, disabledBorderColor = Color.Transparent,
                            cursorColor = C.lcdInk, disabledTextColor = C.lcdMuted,
                        ),
                        modifier = Modifier.weight(1f),
                    )
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
    Row(Modifier.fillMaxSize().background(C.paper).padding(R_.lg), horizontalArrangement = Arrangement.spacedBy(R_.lg)) {
        Column(Modifier.width(620.dp).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(R_.sm)) {
            Text("일행", style = T.sectionLabel)
            GroupMap(s, Modifier.fillMaxWidth().weight(1f))
            val myPos = s.cars.find { it.me }
            s.cars.take(4).forEach { CarRow(it, myPos, s.rolls[it.label]) }
            if (s.cars.isEmpty()) Text("아직 아무도 없습니다", style = T.note)
            if (s.demo && s.cars.size <= 1 && s.radios.isEmpty()) DemoHint(s.code)
            if (s.me == 1) SubButton("경로 공유 · 대장 콜", onClick = vm::shareRoute)
            Text("자동 콜은 안전장치가 아니라 미리 알려 드리는 안내입니다.", style = T.note)
        }
        Column(Modifier.weight(1f).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(R_.md)) {
            s.vote?.let { VoteCards(it, vm::vote, Play.ONCE) }
            Text("최근 무전", style = T.sectionLabel)
            // 무전마다 새 자리로 두어 새로 온 카드만 한 번 돈다. 맨 위 카드는 캐릭터를 더 크게
            s.radios.take(if (s.vote != null) 1 else 3).forEachIndexed { i, r -> key(r.id) { RadioCard(r, big = true, play = Play.ONCE, face = 128.dp) } }
            if (s.radios.isEmpty()) Text("일행의 자동 콜과 무전이 여기에 뜹니다.", style = T.note)
            Spacer(Modifier.weight(1f))
            TalkButton(s, vm)
        }
    }
}

/** 시연 모드에서 봇이 들어오기 전까지 PC에서 칠 명령을 보인다 */
@Composable
private fun DemoHint(code: String?) {
    Box(Modifier.fillMaxWidth().padding(end = R_.shadow, bottom = R_.shadow).pixelBox(C.surface, C.accent)) {
        Row(Modifier.padding(R_.md), verticalAlignment = Alignment.CenterVertically) {
        SpeakerBox(Modifier.size(136.dp)) { CuckooView(Mood.WAIT, Modifier.size(128.dp)) }
        Spacer(Modifier.width(R_.md))
        Column {
            Text("시연 모드 · 봇을 기다립니다", style = T.sectionLabel.copy(color = C.accent))
            Text("PC에서 실행하십시오", style = T.note)
            Text("node server/scripts/bots.mjs ${code ?: ""}", style = T.body)
            Text("봇이 들어오면 데모 주행이 시작됩니다", style = T.note)
        }
        }
    }
}

@Composable
private fun CarRow(c: CarInfo, me: CarInfo?, roll: String?) {
    val dist = if (!c.me && me?.lat != null && c.lat != null) Locator.haversineM(me.lat, me.lng!!, c.lat, c.lng!!) else null
    Box(Modifier.fillMaxWidth().pixelBox(C.surface, shadow = 0.dp)) {
        Row(Modifier.padding(horizontal = R_.md, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            val flag = Color(c.color)
            // 깃발 색 네모 칸에 픽셀 호차 번호
            Box(Modifier.size(36.dp).pixelBox(flag, C.ink, shadow = 0.dp, shape = PixelShape(2.dp)), contentAlignment = Alignment.Center) {
                Text("${c.num}", style = T.lcd.copy(fontSize = 24.sp, color = onFlag(flag)))
            }
            Spacer(Modifier.width(R_.md))
            Column(Modifier.weight(1f)) {
                Text(c.label + if (c.me) " · 우리 차" else "", style = T.sectionLabel.copy(fontSize = 24.sp))
                Text(listOfNotNull(c.nickname.takeIf { it.isNotBlank() && !c.me }, roll).joinToString(" · ").ifBlank { "점호 전" }, style = T.note)
            }
            Text(dist?.let { com.ppeokkugi.domain.Phrase.distance(it) } ?: if (c.me) "" else "—", style = T.lcd.copy(fontSize = 24.sp, color = C.ink))
        }
    }
}

/**
 * 무전 카드: 스피커 그릴 옆 LCD 띠. "RX ▶ 3호차" 와 수신 파형, 그 아래 글.
 * 막 온 카드는 백라이트가 잠깐 밝아지고 파형이 잡음처럼 흔들린다. 급제동·긴급은 붉은 LCD 와 송신 빨강 테
 */
@Composable
fun RadioCard(r: Radio, big: Boolean, play: Play = Play.LOOP, face: Dp = if (big) 128.dp else 64.dp) {
    val alert = r.mood.alert
    val ink = if (alert) C.alertInk else C.lcdInk
    // 승객 목록을 넘겨 다시 그릴 때는 깜빡이지 않는다
    val fresh = remember(r.id) { System.currentTimeMillis() - r.at < 3_000 }
    Box(Modifier.fillMaxWidth().padding(end = R_.shadow, bottom = R_.shadow).pixelBox(C.surface, if (alert) C.tx else C.bezel)) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            SpeakerBox(Modifier.size(face + 8.dp)) { CuckooView(r.mood, Modifier.size(face), play) }
            Spacer(Modifier.width(R_.md))
            Lcd(Modifier.weight(1f), color = if (alert) C.lcdAlert else C.lcd, flash = fresh) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // 내가 보낸 무전은 TX, 받은 무전은 RX
                        Text("${if (r.mood == Mood.TX) "TX" else "RX"} ▶ ${r.from}", style = T.lcd.copy(color = ink))
                        if (r.channel != "all") {
                            Spacer(Modifier.width(8.dp))
                            Chip(CHANNELS.first { it.first == r.channel }.second + " 채널", r.channel == "kids")
                        }
                        Spacer(Modifier.width(R_.md))
                        Waveform(r.id.toInt(), live = fresh, color = ink, modifier = Modifier.size(if (big) 140.dp else 90.dp, 24.dp))
                        Spacer(Modifier.weight(1f))
                        Text(TIME.format(Date(r.at)), style = T.lcd.copy(fontSize = 24.sp, color = if (alert) C.alertInk else C.lcdMuted))
                    }
                    Text(r.text, style = if (big) T.cardText.copy(color = ink) else T.body.copy(fontWeight = FontWeight.Bold, color = ink), maxLines = if (big) 2 else 4)
                }
            }
        }
    }
}

@Composable
private fun VoteCards(v: VoteUi, onVote: (Int) -> Unit, play: Play) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(v) { while (true) { now = System.currentTimeMillis(); delay(500) } }
    Row(verticalAlignment = Alignment.CenterVertically) {
        SpeakerBox(Modifier.size(136.dp)) { CuckooView(Mood.VOTE, Modifier.size(128.dp), play) }
        Spacer(Modifier.width(R_.md))
        Text("쉬어 가 · 번호를 누르거나 \"1번\"이라고 말하십시오", style = T.sectionLabel, modifier = Modifier.weight(1f))
        Lcd { Text("${((v.deadline - now) / 1000).coerceAtLeast(0)}초", style = T.lcd.copy(fontSize = 36.sp)) }
    }
    Row(horizontalArrangement = Arrangement.spacedBy(R_.md)) {
        v.candidates.forEachIndexed { i, c ->
            val mine = v.myChoice == i
            PixelButton(
                onClick = { onVote(i) }, enabled = v.myChoice == null || mine,
                fill = if (mine) C.accent else C.sunk,
                modifier = Modifier.weight(1f).height(216.dp),
            ) {
                Column(Modifier.fillMaxSize().grille().padding(horizontal = R_.lg, vertical = R_.md), verticalArrangement = Arrangement.Center) {
                    Text("${i + 1}", style = T.lcd.copy(fontSize = 60.sp, lineHeight = 60.sp, color = if (mine) C.onAccent else C.accent))
                    Text(c.name, style = T.pageTitle.copy(lineHeight = 42.sp, color = if (mine) C.onAccent else C.ink), maxLines = 2)
                }
            }
        }
    }
}

/**
 * 큰 무전 버튼: 고무 PTT. 누르면 살짝 눌리고, 듣는 동안 송신 빨강 테·LED 와 "TX", 실제 마이크 크기 미터를 켠다
 */
@Composable
private fun TalkButton(s: RoomState, vm: StatusViewModel) {
    val level by vm.voice.level.collectAsState()
    PixelButton(onClick = vm::talk, fill = C.sunk, border = if (s.listening) C.tx else C.bezel, modifier = Modifier.fillMaxWidth().height(144.dp)) {
        Row(Modifier.fillMaxSize().grille().padding(horizontal = 32.dp), verticalAlignment = Alignment.CenterVertically) {
            Led(C.tx, on = s.listening, size = 24.dp, blink = s.listening)
            Spacer(Modifier.width(R_.md))
            if (s.listening) {
                CuckooView(Mood.TX, Modifier.size(128.dp))
                Spacer(Modifier.width(R_.md))
                Text("TX", style = T.lcd.copy(fontSize = 48.sp, lineHeight = 48.sp, color = C.lcdInk), modifier = Modifier.pixelBox(C.tx, shadow = 0.dp, shape = PixelShape(2.dp)).padding(horizontal = 14.dp, vertical = 6.dp))
                Spacer(Modifier.width(R_.lg))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    LevelMeter(level, Modifier.fillMaxWidth().height(24.dp))
                    Text("듣는 중… ${s.heard}".take(30), style = T.body, maxLines = 1)
                }
            } else {
                Text("PTT", style = T.lcd.copy(color = C.muted))
                Text("무전", style = T.brand.copy(fontSize = 60.sp, lineHeight = 60.sp, textAlign = TextAlign.Center), modifier = Modifier.weight(1f))
                Spacer(Modifier.width(60.dp))
            }
        }
    }
}

/** 마이크 크기 미터 16칸: 초록·노랑·빨강 */
@Composable
private fun LevelMeter(level: Float, modifier: Modifier) {
    Canvas(modifier) {
        val n = 16; val w = size.width / n
        for (i in 0 until n) {
            val c = when { i >= 13 -> C.tx; i >= 10 -> C.warn; else -> C.rx }
            drawRect(if (i < level * n) c else c.copy(alpha = 0.18f), Offset(i * w, 0f), androidx.compose.ui.geometry.Size(w - 4.dp.toPx(), size.height))
        }
    }
}

// --- 승객 ---

@Composable
fun PassengerScreen(vm: StatusViewModel, s: RoomState, seats: Seats) {
    Row(Modifier.fillMaxSize().background(C.paper).padding(R_.lg), horizontalArrangement = Arrangement.spacedBy(R_.lg)) {
        Column(Modifier.width(640.dp).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(R_.md)) {
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
                PixelToggle(seats.prefixChannel) { v -> vm.updateSeats { it.copy(prefixChannel = v) } }
            }
            Spacer(Modifier.weight(1f))
            var text by remember { mutableStateOf("") }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f).height(76.dp).pixelBox(C.sunk, shadow = 0.dp).padding(horizontal = 16.dp), contentAlignment = Alignment.CenterStart) {
                    if (text.isEmpty()) Text("글로 보내기", style = T.note)
                    BasicTextField(
                        value = text, onValueChange = { text = it }, singleLine = true, textStyle = T.body,
                        cursorBrush = SolidColor(C.accent), modifier = Modifier.fillMaxWidth(),
                    )
                }
                Spacer(Modifier.width(R_.sm))
                PixelButton(onClick = { vm.onHeard(text); text = "" }, enabled = text.isNotBlank(), modifier = Modifier.width(140.dp).height(80.dp)) {
                    Text("보내기", style = T.button.copy(color = if (text.isNotBlank()) C.ink else C.muted))
                }
            }
            TalkButton(s, vm)
        }
        Column(Modifier.weight(1f).fillMaxHeight(), verticalArrangement = Arrangement.spacedBy(R_.md)) {
            s.vote?.let { VoteCards(it, vm::vote, Play.LOOP) }
            Text("일행 지도", style = T.sectionLabel)
            GroupMap(s, Modifier.fillMaxWidth().height(if (s.vote != null) 300.dp else 460.dp))
            if (s.rolls.isNotEmpty()) {
                Text("점호", style = T.sectionLabel)
                Box(Modifier.fillMaxWidth().pixelBox(C.surface, shadow = 0.dp)) {
                    Column(Modifier.padding(R_.md)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            SpeakerBox(Modifier.size(72.dp)) { CuckooView(Mood.ROLLCALL, Modifier.size(64.dp)) }
                            Spacer(Modifier.width(R_.md))
                            Column { s.rolls.toSortedMap().values.forEach { Text(it, style = T.body) } }
                        }
                    }
                }
            }
            Text("무전 기록", style = T.sectionLabel)
            // 새 무전이 위에 붙으므로 맨 위로 올린다. 그대로 두면 LazyColumn 이 보던 항목을 붙잡아 새 무전이 화면 밖에 생긴다
            val list = rememberLazyListState()
            LaunchedEffect(s.radios.firstOrNull()?.id) { list.scrollToItem(0) }
            LazyColumn(Modifier.fillMaxWidth().weight(1f), state = list, verticalArrangement = Arrangement.spacedBy(R_.sm)) {
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

@Composable
private fun Segmented(options: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { (id, name) ->
            val on = id == selected
            PixelButton(onClick = { onSelect(id) }, fill = if (on) C.accent else C.sunk) {
                Text(name, style = T.button.copy(color = if (on) C.onAccent else C.ink), modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp))
            }
        }
    }
}

@Composable
private fun Chip(text: String, kids: Boolean) {
    Text(text, style = T.note.copy(color = C.lcdInk), modifier = Modifier.background(if (kids) C.rain else C.accent).padding(horizontal = 8.dp, vertical = 2.dp))
}

@Composable
private fun SubButton(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    PixelButton(onClick = onClick, enabled = enabled, modifier = Modifier.fillMaxWidth().height(84.dp)) {
        Text(text, style = T.button.copy(color = if (enabled) C.ink else C.muted))
    }
}

/** 입장 패널: 무전기 앞면. 위에 고무 안테나와 채널 손잡이, 몸체는 잔 점무늬 */
@Composable
private fun Panel(modifier: Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier) {
        Canvas(Modifier.fillMaxWidth().height(ANTENNA)) {
            val ridge = 6.dp.toPx()
            // 안테나: 왼쪽 위 고무 막대
            val aw = 30.dp.toPx(); val ax = 64.dp.toPx()
            val st = 4.dp.toPx()
            drawRect(C.sunk, Offset(ax + st, 0f), androidx.compose.ui.geometry.Size(aw - st * 2, st)) // 계단 꼭대기
            drawRect(C.sunk, Offset(ax, st), androidx.compose.ui.geometry.Size(aw, size.height))
            var y = aw
            while (y < size.height) { drawLine(C.bezel, Offset(ax + 4f, y), Offset(ax + aw - 4f, y), 2.dp.toPx()); y += ridge }
            // 채널 손잡이: 오른쪽 위, 세로 홈
            val kw = 72.dp.toPx(); val kh = 26.dp.toPx(); val kx = size.width - 64.dp.toPx() - kw
            drawRect(C.sunk, Offset(kx, size.height - kh), androidx.compose.ui.geometry.Size(kw, kh + 8f))
            var x = kx + 6f
            while (x < kx + kw - 4f) { drawLine(C.bezel, Offset(x, size.height - kh + 4f), Offset(x, size.height), 2.dp.toPx()); x += ridge }
        }
        Box(Modifier.weight(1f).padding(end = R_.shadow, bottom = R_.shadow).pixelBox(C.surface)) {
            Column(Modifier.fillMaxHeight().padding(R_.stroke).grille().padding(34.dp), verticalArrangement = Arrangement.spacedBy(R_.sm), horizontalAlignment = Alignment.CenterHorizontally) { content() }
        }
    }
}

private val ANTENNA = 64.dp

@Composable
private fun BigButton(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    PixelButton(onClick = onClick, enabled = enabled, fill = C.accent, modifier = Modifier.fillMaxWidth().height(100.dp)) {
        Text(text, style = T.button.copy(fontSize = 36.sp, lineHeight = 36.sp, color = if (enabled) C.onAccent else C.muted))
    }
}

/** 켬/끔: 네모 두 칸 중 켜진 쪽이 주황 */
@Composable
private fun PixelToggle(on: Boolean, onChange: (Boolean) -> Unit) {
    PixelButton(onClick = { onChange(!on) }, fill = if (on) C.accent else C.sunk, modifier = Modifier.width(120.dp).height(76.dp)) {
        Text(if (on) "켜짐" else "꺼짐", style = T.button.copy(color = if (on) C.onAccent else C.muted))
    }
}

private val TIME = SimpleDateFormat("HH:mm:ss", Locale.KOREA)
