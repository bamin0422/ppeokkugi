package com.ppeokkugi.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlin.random.Random

// 핀 보드 무전기 부품. 둥근 모서리·옅은 테·부드러운 그림자. 색은 Theme.kt 의 C 만 쓴다

val Pill = RoundedCornerShape(50)

/** 핀 카드: 부드러운 그림자, 바탕, 1.5dp 옅은 테. [lift] 0 이면 그림자 없이 */
fun Modifier.pin(
    fill: Color = C.paper,
    border: Color = C.line,
    shape: Shape = RoundedCornerShape(R_.card),
    lift: Dp = 10.dp,
    borderWidth: Dp = R_.stroke,
) = (if (lift > 0.dp) shadow(lift, shape, clip = false, ambientColor = SHADOW, spotColor = SHADOW) else this)
    .background(fill, shape)
    .border(borderWidth, border, shape)
    .clip(shape)

private val SHADOW = Color(0xFF502838).copy(alpha = 0.22f)

/** 스피커 그릴: [step] 간격으로 둥근 점을 찍는다 */
fun Modifier.grille(color: Color = C.line, step: Dp = 12.dp, dot: Dp = 3.dp) = drawBehind {
    val s = step.toPx(); val r = dot.toPx()
    var y = s / 2
    while (y < size.height) {
        var x = s / 2
        while (x < size.width) { drawCircle(color, r, Offset(x, y)); x += s }
        y += s
    }
}

/** LCD 창: 짙은 둥근 판에 노란 글자 */
@Composable
fun Lcd(modifier: Modifier = Modifier, color: Color = C.lcd, content: @Composable BoxScope.() -> Unit) {
    Box(
        modifier.pin(color, color, RoundedCornerShape(18.dp), lift = 6.dp).padding(horizontal = 22.dp, vertical = 12.dp),
        contentAlignment = Alignment.CenterStart,
        content = content,
    )
}

/** 둥근 LED: 켜지면 같은 색 빛 고리. [blink] 면 깜빡인다 */
@Composable
fun Led(color: Color, on: Boolean, size: Dp = 16.dp, blink: Boolean = false) {
    var shown by remember { mutableStateOf(true) }
    LaunchedEffect(blink) { shown = true; while (blink) { delay(420); shown = !shown } }
    val lit = on && shown
    Box(
        Modifier.size(size).drawBehind {
            val r = this.size.minDimension / 2
            if (lit) {
                drawCircle(color.copy(alpha = 0.18f), r * 2f)
                drawCircle(color.copy(alpha = 0.28f), r * 1.5f)
            }
            drawCircle(if (lit) color else C.ink3, r)
        },
    )
}

/** 신호 세기 막대 4칸 */
@Composable
fun SignalBars(level: Int, color: Color, modifier: Modifier = Modifier.size(30.dp, 26.dp)) {
    Canvas(modifier) {
        val w = size.width / 4; val bw = w * 0.62f
        for (i in 0 until 4) {
            val h = size.height * (i + 1) / 4
            drawRoundRect(if (i < level) color else color.copy(alpha = 0.3f), Offset(i * w, size.height - h), Size(bw, h), CornerRadius(bw / 2))
        }
    }
}

/** 수신 파형. [live] 동안 잡음처럼 흔들리고, 끝나면 [seed] 로 정한 모양에 멈춘다 */
@Composable
fun Waveform(seed: Int, live: Boolean, color: Color, modifier: Modifier = Modifier.size(64.dp, 26.dp)) {
    val n = 8
    val still = remember(seed) { Random(seed).let { r -> List(n) { 0.3f + r.nextFloat() * 0.7f } } }
    var bars by remember { mutableStateOf(still) }
    LaunchedEffect(Unit) {
        if (!live) return@LaunchedEffect
        repeat(20) { bars = List(n) { Random.nextFloat() }; delay(70) }
        bars = still
    }
    Canvas(modifier) {
        val w = size.width / n; val bw = 4.dp.toPx()
        bars.forEachIndexed { i, v ->
            val h = size.height * (0.25f + 0.75f * v)
            drawRoundRect(color, Offset(i * w, (size.height - h) / 2), Size(bw, h), CornerRadius(bw / 2))
        }
    }
}

/** 마스코트 자리: 표정 색으로 옅게 칠한 둥근 칸 */
@Composable
fun SpeakerBox(modifier: Modifier, tint: Color = C.tint(com.ppeokkugi.Mood.BASE), content: @Composable BoxScope.() -> Unit) {
    Box(modifier.background(tint, RoundedCornerShape(24.dp)), contentAlignment = Alignment.Center, content = content)
}

/**
 * 둥근 버튼: 누르면 살짝 작아지고 그림자가 줄어든다. 높이는 부르는 쪽이 정한다(차량 터치 76dp 이상)
 */
@Composable
fun SoftButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    fill: Color = C.paper,
    border: Color = C.line,
    enabled: Boolean = true,
    shape: Shape = Pill,
    content: @Composable BoxScope.() -> Unit,
) {
    val press = remember { MutableInteractionSource() }
    val down by press.collectIsPressedAsState()
    Box(
        modifier
            .scale(if (down) 0.97f else 1f)
            .pin(if (enabled) fill else C.line, if (enabled) border else C.line, shape, lift = if (down || !enabled) 0.dp else 6.dp)
            .clickable(interactionSource = press, indication = null, enabled = enabled, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
        content = content,
    )
}
