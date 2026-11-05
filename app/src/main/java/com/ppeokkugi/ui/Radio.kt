package com.ppeokkugi.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.ImageShader
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlin.math.roundToInt
import kotlin.random.Random

// 픽셀 무전기 부품. 둥근 것 없이 계단 모서리·굵은 테·딱딱한 그림자. 색은 Theme.kt 의 C 만 쓴다

/** 네 모서리에서 한 칸씩 깎은 픽셀 계단 모서리 */
class PixelShape(private val notch: Dp = R_.notch) : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline {
        val n = with(density) { notch.toPx() }.coerceAtMost(minOf(size.width, size.height) / 2)
        val w = size.width; val h = size.height
        return Outline.Generic(Path().apply {
            moveTo(n, 0f); lineTo(w - n, 0f); lineTo(w - n, n); lineTo(w, n)
            lineTo(w, h - n); lineTo(w - n, h - n); lineTo(w - n, h); lineTo(n, h)
            lineTo(n, h - n); lineTo(0f, h - n); lineTo(0f, n); lineTo(n, n); close()
        })
    }
}

val Px = PixelShape()

/**
 * 픽셀 상자: 오른쪽 아래로 흐림 없는 그림자, 계단 모서리 바탕, 2dp 굵은 테.
 * [shadow] 0 이면 그림자 없이(눌린 버튼)
 */
fun Modifier.pixelBox(fill: Color, border: Color = C.bezel, shadow: Dp = R_.shadow, shape: Shape = Px) = drawBehind {
    val o = shape.createOutline(size, layoutDirection, this)
    val sh = shadow.toPx()
    if (sh > 0f) translate(sh, sh) { drawOutline(o, C.bezel) }
    val st = R_.stroke.toPx()
    drawOutline(o, border)
    // 안쪽을 테 두께만큼 줄여 채운다
    translate(st, st) { drawOutline(shape.createOutline(Size(size.width - st * 2, size.height - st * 2), layoutDirection, this), fill) }
}

/** 작은 비트맵을 바둑판처럼 깔아 그리는 무늬(그릴 디더·스캔라인). 매 프레임 사각형 수천 개를 그리지 않는다 */
private fun tile(cell: Int, paint: (IntArray, Int) -> Unit): ShaderBrush {
    val px = IntArray(cell * cell)
    paint(px, cell)
    val bmp = android.graphics.Bitmap.createBitmap(px, cell, cell, android.graphics.Bitmap.Config.ARGB_8888)
    return ShaderBrush(ImageShader(bmp.asImageBitmap(), TileMode.Repeated, TileMode.Repeated))
}

/** 몸체 디더 무늬: 2dp 칸 체커를 4칸마다 하나씩 찍는 성긴 디더 */
fun Modifier.grille() = drawWithCache {
    val p = 2.dp.toPx().roundToInt().coerceAtLeast(1)
    val brush = tile(p * 4) { a, n ->
        val c = C.grille.toArgb()
        for (y in 0 until n) for (x in 0 until n) {
            val cx = x / p; val cy = y / p
            if (cx % 2 == 0 && cy % 2 == 0 && (cx + cy) % 4 == 0) a[y * n + x] = c
        }
    }
    onDrawBehind { drawRect(brush) }
}

/** 스피커 가로 홈: 2dp 검은 줄, 2dp 띄움 */
fun Modifier.slots() = drawWithCache {
    val p = 2.dp.toPx().roundToInt().coerceAtLeast(1)
    val brush = tile(p * 2) { a, n -> val c = C.bezel.toArgb(); for (y in 0 until p) for (x in 0 until n) a[y * n + x] = c }
    onDrawBehind { drawRect(brush) }
}

/** LCD 스캔라인: 3px 마다 1px 옅은 줄 */
private fun Modifier.scanlines(ink: Color) = drawWithCache {
    val brush = tile(3) { a, n -> val c = ink.copy(alpha = 0.07f).toArgb(); for (x in 0 until n) a[2 * n + x] = c }
    onDrawWithContent { drawContent(); drawRect(brush) }
}

/** 백라이트 LCD 창: 각진 검은 테, 1px 빗면, 스캔라인. [flash] 면 처음 그릴 때 백라이트가 잠깐 밝아진다 */
@Composable
fun Lcd(modifier: Modifier = Modifier, color: Color = C.lcd, flash: Boolean = false, content: @Composable BoxScope.() -> Unit) {
    var lit by remember { mutableStateOf(flash) }
    LaunchedEffect(Unit) { if (flash) { delay(450); lit = false } }
    val bg by animateColorAsState(if (lit) C.lcdFlash else color, tween(600), label = "backlight")
    Box(
        modifier.pixelBox(bg, shadow = 0.dp, shape = PixelShape(2.dp)).drawBehind {
            val w = 1.dp.toPx(); val st = R_.stroke.toPx()
            drawRect(C.lcdFlash, Offset(st, st), Size(size.width - st * 2, w))
            drawRect(C.lcdMuted, Offset(st, size.height - st - w), Size(size.width - st * 2, w))
        }.scanlines(C.lcdInk).padding(horizontal = 18.dp, vertical = 12.dp),
        content = content,
    )
}

/** 네모 LED: 켜지면 색 칸 둘레로 같은 색 반투명 칸(픽셀 빛번짐). [blink] 면 깜빡인다 */
@Composable
fun Led(color: Color, on: Boolean, size: Dp = 16.dp, blink: Boolean = false) {
    var shown by remember { mutableStateOf(true) }
    LaunchedEffect(blink) { shown = true; while (blink) { delay(420); shown = !shown } }
    val lit = on && shown
    Box(
        Modifier.size(size).drawBehind {
            val g = this.size.width / 4
            if (lit) drawRect(color.copy(alpha = 0.35f), Offset(-g, -g), Size(this.size.width + g * 2, this.size.height + g * 2))
            drawRect(C.bezel)
            drawRect(if (lit) color else C.sunk, Offset(g / 2, g / 2), Size(this.size.width - g, this.size.height - g))
            if (lit) drawRect(Color.White.copy(alpha = 0.5f), Offset(g, g), Size(g, g)) // 반짝임 한 점
        },
    )
}

/** 신호 세기 막대 4칸 */
@Composable
fun SignalBars(level: Int, color: Color, modifier: Modifier = Modifier.size(28.dp, 24.dp)) {
    Canvas(modifier) {
        val w = size.width / 4
        for (i in 0 until 4) {
            val h = size.height * (i + 1) / 4
            drawRect(if (i < level) color else color.copy(alpha = 0.22f), Offset(i * w, size.height - h), Size(w - 2.dp.toPx(), h))
        }
    }
}

/** 일행 수를 배터리 칸으로: 칸 하나가 차 한 대(6칸까지). 테도 네모 칸으로 그린다 */
@Composable
fun MemberCells(count: Int, color: Color, modifier: Modifier = Modifier.size(56.dp, 24.dp)) {
    Canvas(modifier) {
        val p = 2.dp.toPx(); val nub = p * 2
        val bw = size.width - nub; val h = size.height
        drawRect(color, Offset.Zero, Size(bw, p)); drawRect(color, Offset(0f, h - p), Size(bw, p))
        drawRect(color, Offset.Zero, Size(p, h)); drawRect(color, Offset(bw - p, 0f), Size(p, h))
        drawRect(color, Offset(bw, h * 0.3f), Size(nub, h * 0.4f))
        val n = 6; val cw = (bw - p * 4) / n
        for (i in 0 until minOf(count, n)) drawRect(color, Offset(p * 2 + i * cw, p * 2), Size(cw - p, h - p * 4))
    }
}

/** 수신 파형. [live] 동안 잡음처럼 흔들리고, 끝나면 [seed] 로 정한 모양에 멈춘다. 높이는 2dp 칸 단위 */
@Composable
fun Waveform(seed: Int, live: Boolean, color: Color, modifier: Modifier = Modifier.size(120.dp, 24.dp)) {
    val n = 16
    val still = remember(seed) { Random(seed).let { r -> List(n) { 0.25f + r.nextFloat() * 0.75f } } }
    var bars by remember { mutableStateOf(still) }
    var on by remember { mutableStateOf(live) }
    LaunchedEffect(Unit) {
        if (!live) return@LaunchedEffect
        repeat(20) { bars = List(n) { Random.nextFloat() }; delay(70) }
        on = false; bars = still
    }
    Canvas(modifier) {
        val w = size.width / n; val p = 2.dp.toPx()
        bars.forEachIndexed { i, v ->
            val h = ((size.height * (0.15f + 0.85f * v)) / p).roundToInt().coerceAtLeast(1) * p
            drawRect(if (on) color else color.copy(alpha = 0.55f), Offset(i * w, (size.height - h) / 2), Size(w - p, h))
        }
    }
}

/** 마스코트 자리: 스피커 홈 위 네모 칸 */
@Composable
fun SpeakerBox(modifier: Modifier, content: @Composable BoxScope.() -> Unit) {
    Box(modifier.pixelBox(C.sunk, shadow = 0.dp).slots(), contentAlignment = Alignment.Center, content = content)
}

/**
 * 8비트 버튼: 평소엔 오른쪽 아래 그림자가 있고, 누르면 그림자만큼 내려앉으며 그림자가 사라진다.
 * 높이는 부르는 쪽이 정한다(차량 터치 76dp 이상)
 */
@Composable
fun PixelButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    fill: Color = C.sunk,
    border: Color = C.bezel,
    enabled: Boolean = true,
    content: @Composable BoxScope.() -> Unit,
) {
    val press = remember { MutableInteractionSource() }
    val down by press.collectIsPressedAsState()
    val sh = R_.shadow
    // 바깥 상자가 그림자 자리를 비워 두고, 정해진 크기는 안쪽에 그대로 넘긴다
    Box(modifier.padding(end = sh, bottom = sh), propagateMinConstraints = true) {
        Box(
            Modifier
                .offset(if (down) sh else 0.dp, if (down) sh else 0.dp)
                .pixelBox(if (enabled) fill else C.sunk, border, if (down || !enabled) 0.dp else sh)
                .clickable(interactionSource = press, indication = null, enabled = enabled, role = Role.Button, onClick = onClick),
            contentAlignment = Alignment.Center,
            content = content,
        )
    }
}

/** 깃발 색 위 글자색: 밝은 색이면 검정, 어두운 색이면 흰색(4호차 파랑 같은 어두운 깃발에서도 읽히게) */
fun onFlag(c: Color) = if (c.luminance() > 0.179f) C.onAccent else C.ink // 흑·백 대비가 같아지는 밝기
