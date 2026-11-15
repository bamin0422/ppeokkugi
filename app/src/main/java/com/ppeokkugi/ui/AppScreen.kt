package com.ppeokkugi.ui

import androidx.compose.foundation.background
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
    Column(Modifier.fillMaxSize().background(C.bg)) {
        // 깃발 색 띠: 우리 호차 색. 앰비언트 조명이 없을 때의 대안이기도 하다(§8)
        s.me?.let { Box(Modifier.fillMaxWidth().height(8.dp).background(if (flagOn) C.car(it) else C.bg)) }
        Row(
            Modifier.fillMaxWidth().padding(start = 28.dp, end = 28.dp, top = 18.dp, bottom = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Logo(s.me?.let(C::car))
            Spacer(Modifier.width(R_.lg))
            if (s.code != null) {
                val (dot, word) = when (s.link) {
                    Link.ON -> C.accent to "연결"
                    Link.CONNECTING -> C.grey400 to "연결 중"
                    Link.OFF -> C.tx to "끊김"
                }
                // 방 코드·일행 수는 옅은 파랑 칩, 연결은 점과 회색 글자
                Text("CH ${s.code} · ${s.cars.size}대", style = T.num.copy(fontSize = 26.sp, lineHeight = 32.sp, letterSpacing = 0.5.sp, color = C.accentInk),
                    modifier = Modifier.background(C.accentWeak, RoundedCornerShape(R_.sm)).padding(horizontal = 18.dp, vertical = 10.dp))
                Spacer(Modifier.width(R_.lg))
                Dot(dot)
                Spacer(Modifier.width(10.dp))
                Text(word + (s.me?.let { " · ${it}호차" + if (it == 1) " (선두)" else "" } ?: ""), style = T.body.copy(color = C.ink2))
                Spacer(Modifier.width(R_.md))
                Text("나가기", style = T.button.copy(fontSize = 20.sp, color = C.grey700),
                    modifier = Modifier.card(C.paper, RoundedCornerShape(R_.sm)).clickable { vm.leaveRoom() }.padding(horizontal = 18.dp, vertical = 10.dp))
            }
            if (s.driving) {
                Spacer(Modifier.width(R_.md))
                Tag("주행 중", C.accentWeak, C.accentInk)
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

/** 로고: 마스코트 + "뻐꾸기" */
@Composable
private fun Logo(body: Color?) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        CuckooView(Mood.BASE, Modifier.size(60.dp), Play.STILL, body)
        Spacer(Modifier.width(8.dp))
        Text("뻐꾸기", style = T.brand.copy(fontSize = 42.sp, letterSpacing = (-1).sp))
    }
}

private val NIGHT = Color(0xFF151A38)       // 긴급 콜 바탕(짙은 남색)
private val NIGHT_CARD = Color(0xFF232B5A)  // 긴급 콜 카드
private val NIGHT_SUB = Color(0xFFB9C2F0)   // 남색 위 보조 글자(8.9:1)

/**
 * 긴급 콜: 다른 화면을 모두 덮는 짙은 남색 화면에 카드 한 장을 띄운다.
 * 빨강은 머리 칩과 깜빡이는 점에만 쓴다. 확인을 눌러야 닫힌다
 */
@Composable
private fun EmergencyAlert(e: Emergency, onOk: () -> Unit) {
    Box(Modifier.fillMaxSize().background(NIGHT).clickable(enabled = false) {}.padding(72.dp), contentAlignment = Alignment.Center) {
        Row(
            Modifier.fillMaxWidth().card(NIGHT_CARD, RoundedCornerShape(40.dp)).padding(56.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(56.dp),
        ) {
            // 긴급 콜은 주행 중에도 계속 들썩인다
            SpeakerBox(Modifier.size(300.dp), NIGHT) { CuckooView(Mood.EMERGENCY, Modifier.size(256.dp)) }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(R_.lg)) {
                Row(
                    Modifier.background(C.tx, RoundedCornerShape(R_.md)).padding(horizontal = 24.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Dot(Color.White, size = 16.dp, blink = true)
                    Spacer(Modifier.width(14.dp))
                    Text("긴급 콜 · ${e.from} 에어백", style = T.num.copy(fontSize = 30.sp, lineHeight = 38.sp, color = Color.White))
                }
                Text(e.text, style = T.cardText.copy(fontSize = 52.sp, lineHeight = 64.sp, color = Color.White))
                e.lat?.let { Text("${"%.4f".format(it)}, ${"%.4f".format(e.lng)} · ${TIME.format(Date(e.at))}", style = T.num.copy(fontSize = 28.sp, color = NIGHT_SUB)) }
                Text("안전한 곳에 차를 세우고 연락하십시오.", style = T.body.copy(fontSize = 28.sp, lineHeight = 36.sp, color = NIGHT_SUB))
                SoftButton(onClick = onOk, fill = C.accent, pressed = C.accentPressed, modifier = Modifier.width(360.dp).height(100.dp)) {
                    Text("확인", style = T.button.copy(fontSize = 36.sp, lineHeight = 40.sp, color = C.ink))
                }
            }
        }
    }
}

private val TIME = SimpleDateFormat("HH:mm:ss", Locale.KOREA)
