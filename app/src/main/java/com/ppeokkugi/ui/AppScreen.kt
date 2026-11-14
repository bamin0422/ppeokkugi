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
import androidx.compose.ui.text.font.FontWeight
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
    Column(Modifier.fillMaxSize().background(C.bg)) {
        // 깃발 색 띠: 우리 호차 색. 앰비언트 조명이 없을 때의 대안이기도 하다(§8)
        s.me?.let { Box(Modifier.fillMaxWidth().height(8.dp).background(if (flagOn) C.car(it) else C.bg)) }
        Row(
            Modifier.fillMaxWidth().padding(start = 28.dp, end = 28.dp, top = 18.dp, bottom = 14.dp),
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
                // 방 코드는 채널 읽힘으로, 연결은 신호 막대, 일행 수는 대수로
                Lcd {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("CH", style = T.lcd.copy(fontSize = 18.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 2.sp, color = C.lcdDim))
                        Spacer(Modifier.width(14.dp))
                        Text("${s.code}", style = T.lcd.copy(fontSize = 30.sp, lineHeight = 34.sp, letterSpacing = 1.5.sp))
                        Spacer(Modifier.width(18.dp))
                        SignalBars(bars, C.lcdInk)
                        Spacer(Modifier.width(14.dp))
                        Text("${s.cars.size}대", style = T.lcd.copy(fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = C.lcdDim))
                    }
                }
                Spacer(Modifier.width(R_.lg))
                Led(C.rx, on = s.link == Link.ON)
                Spacer(Modifier.width(12.dp))
                Text(word + (s.me?.let { " · ${it}호차" + if (it == 1) " (선두)" else "" } ?: ""), style = T.body.copy(fontWeight = FontWeight.Bold, color = C.ink2))
                Spacer(Modifier.width(R_.md))
                Text("나가기", style = T.button.copy(fontSize = 20.sp, color = C.ink2),
                    modifier = Modifier.pin(shape = Pill, lift = 0.dp).clickable { vm.leaveRoom() }.padding(horizontal = 18.dp, vertical = 10.dp))
            }
            if (s.driving) {
                Spacer(Modifier.width(R_.md))
                Text("주행 중", style = T.body.copy(fontWeight = FontWeight.Bold, color = C.warnInk))
            }
            Spacer(Modifier.weight(1f))
            Segmented(TABS.mapIndexed { i, n -> "$i" to n }, "$tab", padH = 30.dp) { tab = it.toInt() }
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

/** 로고: 마스코트 + 세리프 "뻐꾸기" */
@Composable
private fun Logo() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        CuckooView(Mood.BASE, Modifier.size(60.dp), Play.STILL)
        Spacer(Modifier.width(8.dp))
        Text("뻐꾸기", style = T.brand.copy(fontSize = 42.sp, letterSpacing = (-1).sp))
    }
}

/** 긴급 콜: 다른 화면을 모두 덮는 짙은 빨강 화면. 송신 LED 가 깜빡인다. 확인을 눌러야 닫힌다 */
@Composable
private fun EmergencyAlert(e: Emergency, onOk: () -> Unit) {
    Box(Modifier.fillMaxSize().background(C.sos).clickable(enabled = false) {}.padding(64.dp), contentAlignment = Alignment.Center) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(56.dp)) {
            // 긴급 콜은 주행 중에도 계속 들썩인다
            SpeakerBox(Modifier.size(300.dp), C.tint(Mood.EMERGENCY)) { CuckooView(Mood.EMERGENCY, Modifier.size(256.dp)) }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(R_.lg)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Led(C.tx, on = true, size = 32.dp, blink = true)
                    Spacer(Modifier.width(28.dp))
                    Text("긴급 콜", style = T.brand.copy(fontSize = 76.sp, lineHeight = 84.sp, color = Color.White))
                }
                Column(
                    Modifier.fillMaxWidth().pin(C.paper, C.tx, RoundedCornerShape(36.dp), lift = 0.dp, borderWidth = 4.dp).padding(horizontal = 40.dp, vertical = 32.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text("EMERGENCY · ${e.from} 에어백", style = T.lcd.copy(fontSize = 36.sp, lineHeight = 44.sp, fontWeight = FontWeight.ExtraBold, color = Color.White),
                        modifier = Modifier.background(C.txInk, Pill).padding(horizontal = 22.dp, vertical = 6.dp))
                    Text(e.text, style = T.cardText.copy(fontSize = 48.sp, lineHeight = 60.sp))
                    e.lat?.let { Text("${"%.4f".format(it)}, ${"%.4f".format(e.lng)} · ${TIME.format(Date(e.at))}", style = T.lcd.copy(fontSize = 28.sp, color = C.ink2)) }
                }
                Text("안전한 곳에 차를 세우고 연락하십시오.", style = T.body.copy(fontSize = 28.sp, lineHeight = 36.sp, color = C.sosInk))
                SoftButton(onClick = onOk, fill = C.paper, border = C.paper, modifier = Modifier.width(360.dp).height(100.dp)) {
                    Text("확인", style = T.button.copy(fontSize = 36.sp, lineHeight = 40.sp, fontWeight = FontWeight.ExtraBold, color = C.txInk))
                }
            }
        }
    }
}

private val TIME = SimpleDateFormat("HH:mm:ss", Locale.KOREA)
