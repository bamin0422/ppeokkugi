package com.ppeokkugi.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ppeokkugi.Emergency
import com.ppeokkugi.Mood
import com.ppeokkugi.StatusViewModel
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.ppeokkugi.net.Link

private val TABS = listOf("운전석", "승객", "상태")

/** 위쪽 막대(방 코드·연결 상태·탭)와 탭별 화면. 방에 들어가기 전에는 운전석·승객 탭이 입장 화면이다 */
@Composable
fun AppScreen(vm: StatusViewModel) {
    val s by vm.room.collectAsState()
    val seats by vm.seats.collectAsState()
    var tab by rememberSaveable { mutableIntStateOf(0) }
    // 도착하면 깃발 띠를 세 번 깜빡인다(앰비언트 조명과 같은 박자)
    var flagOn by remember { mutableStateOf(true) }
    LaunchedEffect(s.blinkAt) {
        if (s.blinkAt == 0L) return@LaunchedEffect
        repeat(3) { flagOn = false; delay(400); flagOn = true; delay(400) }
    }
    Box(Modifier.fillMaxSize()) {
    Column(Modifier.fillMaxSize().background(C.paper)) {
        // 깃발 색 띠: 서버가 정한 우리 차 색. 앰비언트 조명이 없을 때의 대안이기도 하다(§8)
        s.myColor?.let { Box(Modifier.fillMaxWidth().height(10.dp).background(if (flagOn) Color(it) else C.paper)) }
        Row(
            Modifier.fillMaxWidth().background(C.surface).grille().drawBehind {
                drawRect(C.bezel, topLeft = Offset(0f, size.height - 3.dp.toPx()), size = Size(size.width, 3.dp.toPx()))
            }.padding(horizontal = R_.lg, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Logo()
            Spacer(Modifier.width(R_.lg))
            if (s.code != null) {
                val (bars, word) = when (s.link) {
                    Link.ON -> 4 to "연결"
                    Link.CONNECTING -> 2 to "연결 중"
                    Link.OFF -> 0 to "끊김"
                }
                // 방 코드는 채널 읽힘으로, 연결은 신호 막대, 일행 수는 배터리 칸으로
                Lcd {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("CH ${s.code}", style = T.lcd.copy(fontSize = 36.sp, letterSpacing = 3.sp))
                        Spacer(Modifier.width(18.dp))
                        SignalBars(bars, C.lcdInk)
                        Spacer(Modifier.width(14.dp))
                        MemberCells(s.cars.size, C.lcdInk)
                        Spacer(Modifier.width(6.dp))
                        Text("${s.cars.size}", style = T.lcd.copy(fontSize = 24.sp))
                    }
                }
                Spacer(Modifier.width(R_.md))
                Led(C.rx, on = s.link == Link.ON)
                Spacer(Modifier.width(10.dp))
                Text(word + (s.me?.let { " · ${it}호차" + if (it == 1) " (선두)" else "" } ?: ""), style = T.sectionLabel)
                Spacer(Modifier.width(R_.md))
                Text("나가기", style = T.note, modifier = Modifier.clickable { vm.leaveRoom() }.padding(8.dp))
            }
            if (s.driving) {
                Spacer(Modifier.width(R_.md))
                Text("주행 중", style = T.note.copy(color = C.warn))
            }
            Spacer(Modifier.weight(1f))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TABS.forEachIndexed { i, name ->
                    PixelButton(onClick = { tab = i }, fill = if (tab == i) C.accent else C.sunk) {
                        Text(name, style = T.button.copy(color = if (tab == i) C.onAccent else C.ink), modifier = Modifier.padding(horizontal = 28.dp, vertical = 14.dp))
                    }
                }
            }
        }
        Box(Modifier.weight(1f)) {
            when {
                tab == 2 -> StatusScreen(vm)
                s.code == null -> JoinScreen(vm, s)
                tab == 0 -> DriverScreen(vm, s)
                else -> PassengerScreen(vm, s, seats)
            }
        }
    }
    s.emergency?.let { EmergencyAlert(it, vm::dismissEmergency) }
    }
}

/** 로고: 기기 몸체에 찍힌 상표처럼 "뻐꾸기" */
@Composable
private fun Logo() {
    Text(
        "뻐꾸기", style = T.brand.copy(letterSpacing = 1.sp),
        modifier = Modifier.pixelBox(C.surface, C.line, shadow = 0.dp).padding(horizontal = 14.dp, vertical = 8.dp),
    )
}

/** 긴급 콜: 다른 화면을 모두 덮는 빨간 LCD 알림. 송신 LED 가 깜빡인다. 확인을 눌러야 닫힌다 */
@Composable
private fun EmergencyAlert(e: Emergency, onOk: () -> Unit) {
    Box(Modifier.fillMaxSize().background(C.sos).clickable(enabled = false) {}.padding(48.dp), contentAlignment = Alignment.Center) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(48.dp)) {
            // 긴급 콜은 주행 중에도 계속 돈다
            SpeakerBox(Modifier.size(272.dp)) { CuckooView(Mood.EMERGENCY, Modifier.size(256.dp)) }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(R_.md)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Led(C.tx, on = true, size = 36.dp, blink = true)
                    Spacer(Modifier.width(R_.md))
                    Text("긴급 콜", style = T.brand.copy(fontSize = 72.sp, lineHeight = 72.sp))
                }
                Lcd(Modifier.fillMaxWidth(), color = C.lcdAlert) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("EMERGENCY · ${e.from} 에어백", style = T.lcd.copy(fontSize = 60.sp, color = C.alertInk))
                        Text(e.text, style = T.cardText.copy(fontSize = 48.sp, lineHeight = 60.sp, color = C.alertInk))
                        e.lat?.let { Text("${"%.4f".format(it)}, ${"%.4f".format(e.lng)} · ${TIME.format(Date(e.at))}", style = T.lcd.copy(fontSize = 36.sp, color = C.alertInk)) }
                    }
                }
                Text("안전한 곳에 차를 세우고 연락하십시오.", style = T.body.copy(fontSize = 24.sp))
                Spacer(Modifier.height(R_.sm))
                PixelButton(onClick = onOk, fill = C.ink, modifier = Modifier.width(360.dp).height(100.dp)) {
                    Text("확인", style = T.button.copy(fontSize = 36.sp, lineHeight = 36.sp, color = C.sos))
                }
            }
        }
    }
}

private val TIME = SimpleDateFormat("HH:mm:ss", Locale.KOREA)
