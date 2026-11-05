package com.ppeokkugi.ui

import android.content.Context
import android.graphics.BitmapFactory
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import com.ppeokkugi.Mood
import com.ppeokkugi.R
import kotlinx.coroutines.delay

/** LOOP 계속 반복, ONCE 처음 나타날 때 한 번 돌고 첫 프레임으로, STILL 첫 프레임에 멈춤 */
enum class Play { LOOP, ONCE, STILL }

/** 픽셀 그림 한 장: 가로로 이어 붙인 프레임(한 칸이 [cell]px 정사각형) */
private class Sheet(val image: ImageBitmap, val cell: Int) {
    val frames = image.width / cell
}

private val sheets = HashMap<Mood, Sheet>()
private const val FRAME_MS = 125L

/**
 * 표정 그림 찾기: sprite_<이름>.png(64px 프레임을 가로로 이은 원본) → [Mood.fallback] → cuckoo_<이름>.png(정지 그림 한 장).
 * 새 표정 그림은 따로 들어오므로 이름으로 찾는다(리소스 축소는 꺼져 있어 이름 조회가 안전하다)
 */
@android.annotation.SuppressLint("DiscouragedApi")
private fun sheet(ctx: Context, m: Mood): Sheet = sheets.getOrPut(m) {
    val res = ctx.resources
    val opts = BitmapFactory.Options().apply { inScaled = false }
    fun load(name: String) = res.getIdentifier(name, "drawable", ctx.packageName).takeIf { it != 0 }
        ?.let { BitmapFactory.decodeResource(res, it, opts) }
    val name = m.name.lowercase()
    load("sprite_$name")?.let { return@getOrPut Sheet(it.asImageBitmap(), it.height) }
    if (m.fallback != m) return@getOrPut sheet(ctx, m.fallback)
    val still = load("cuckoo_$name") ?: BitmapFactory.decodeResource(res, R.drawable.cuckoo_base, opts)
    Sheet(still.asImageBitmap(), still.height)
}

/**
 * 마스코트 한 곳. 64px 픽셀 그림을 칸에 들어가는 가장 큰 정수 배로, 필터 없이(최근접 이웃) 그려 계단이 뭉개지지 않게 한다.
 * 프레임은 125ms 마다 넘긴다. 칸 크기는 64의 배수(64·128·256dp)로 두면 160dpi 에서 딱 맞는다.
 * 운전석은 주행 중(CarUxRestrictions)에도 새 무전마다 한 번만 돌리고(ONCE) 멈춘다. 조작할 일이 없는 짧은 반응이다
 */
@Composable
fun CuckooView(mood: Mood, modifier: Modifier = Modifier, play: Play = Play.LOOP) {
    val ctx = LocalContext.current
    val s = remember(mood) { sheet(ctx, mood) }
    var frame by remember(mood) { mutableIntStateOf(0) }
    LaunchedEffect(mood, play) {
        if (s.frames < 2 || play == Play.STILL) { frame = 0; return@LaunchedEffect }
        if (play == Play.LOOP) while (true) { delay(FRAME_MS); frame = (frame + 1) % s.frames }
        repeat(s.frames - 1) { delay(FRAME_MS); frame++ }
        delay(FRAME_MS); frame = 0
    }
    Canvas(modifier) {
        val box = minOf(size.width, size.height)
        val k = (box / s.cell).toInt()
        // 정수 배가 안 되는(칸이 그림보다 작은) 때만 칸에 맞춰 줄인다
        val out = if (k >= 1) s.cell * k else box.toInt()
        drawImage(
            s.image,
            srcOffset = IntOffset(frame * s.cell, 0), srcSize = IntSize(s.cell, s.cell),
            dstOffset = IntOffset(((size.width - out) / 2).toInt(), ((size.height - out) / 2).toInt()), dstSize = IntSize(out, out),
            filterQuality = FilterQuality.None,
        )
    }
}
