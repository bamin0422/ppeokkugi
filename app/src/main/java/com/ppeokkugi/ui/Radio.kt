package com.ppeokkugi.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.random.Random

// 화면 부품. 테·그림자 없는 둥근 면과 옅은 색 태그. 색은 Theme.kt 의 C 만 쓴다

val Pill = RoundedCornerShape(50)

/** 카드: 테·그림자 없이 바탕만 칠한 둥근 면 */
fun Modifier.card(fill: Color = C.paper, shape: Shape = RoundedCornerShape(R_.card)) = background(fill, shape).clip(shape)

/** 작은 태그: 옅은 바탕에 진한 글자(RX 주황, TX 파랑, 경고 빨강 등) */
@Composable
fun Tag(text: String, bg: Color, fg: Color, modifier: Modifier = Modifier) {
    Text(
        text, style = T.num.copy(fontSize = 20.sp, lineHeight = 24.sp, color = fg), maxLines = 1,
        modifier = modifier.background(bg, RoundedCornerShape(R_.sm)).padding(horizontal = 12.dp, vertical = 4.dp),
    )
}

/** 작은 상태 점. [blink] 면 깜빡인다 */
@Composable
fun Dot(color: Color, size: Dp = 12.dp, blink: Boolean = false) {
    var shown by remember { mutableStateOf(true) }
    LaunchedEffect(blink) { shown = true; while (blink) { delay(420); shown = !shown } }
    Box(Modifier.size(size).background(if (shown) color else Color.Transparent, CircleShape))
}

/** 수신 파형: 둥근 막대. [live] 동안 잡음처럼 흔들리고, 끝나면 [seed] 로 정한 모양에 멈춘다 */
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
    Box(modifier.background(tint, RoundedCornerShape(R_.card)), contentAlignment = Alignment.Center, content = content)
}

/**
 * 둥근 버튼: 누르면 [pressed] 색으로 바뀌고 살짝 작아진다. 높이는 부르는 쪽이 정한다(차량 터치 76dp 이상)
 */
@Composable
fun SoftButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    fill: Color = C.paper,
    pressed: Color = C.grey200,
    enabled: Boolean = true,
    shape: Shape = RoundedCornerShape(R_.md),
    content: @Composable BoxScope.() -> Unit,
) {
    val press = remember { MutableInteractionSource() }
    val down by press.collectIsPressedAsState()
    Box(
        modifier
            .scale(if (down) 0.98f else 1f)
            .card(if (!enabled) C.grey200 else if (down) pressed else fill, shape)
            .clickable(interactionSource = press, indication = null, enabled = enabled, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
        content = content,
    )
}
