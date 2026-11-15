package com.ppeokkugi.ui

import android.content.Context
import android.graphics.BitmapFactory
import android.util.LruCache
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.platform.LocalContext
import com.ppeokkugi.Mood
import com.ppeokkugi.R
import kotlin.math.min

/**
 * LOOP 프레임을 계속 돌림(한 장뿐이면 천천히 위아래로 들썩임), ONCE 처음 나타날 때 톡 튀어나오고
 * [ONCE_MS] 동안만 돌린 뒤 첫 프레임에서 멈춤(한 장뿐이면 튀어나온 뒤 그대로), STILL 첫 프레임만
 */
enum class Play { LOOP, ONCE, STILL }

/** design/character/tools/gen.py 의 FRAME_MS 와 같은 프레임 간격 */
private const val FRAME_MS = 320L
private const val ONCE_MS = 8_000L

/**
 * 표정 프레임 id: cuckoo_<이름>_0, _1, … → 없으면 [Mood.fallback] 의 프레임.
 * 이름으로 찾는다(리소스 축소는 꺼져 있어 이름 조회가 안전하다)
 */
@android.annotation.SuppressLint("DiscouragedApi")
private fun frameIds(ctx: Context, m: Mood): List<Int> {
    val name = m.name.lowercase()
    val ids = generateSequence(0) { it + 1 }
        .map { ctx.resources.getIdentifier("cuckoo_${name}_$it", "drawable", ctx.packageName) }
        .takeWhile { it != 0 }.toList()
    return ids.ifEmpty { if (m.fallback != m) frameIds(ctx, m.fallback) else listOf(R.drawable.cuckoo_base_0) }
}

private val tinted = LruCache<Long, ImageBitmap>(48)

/**
 * 몸통(연보라 계열)만 [body] 색으로 옮긴 프레임. 배·눈·무전기는 그대로 두고, 노랑 차는 부리·발·무전기를
 * 다홍으로 눌러 몸에 묻히지 않게 한다. 규칙은 휴대폰 화면 moodImg 와 같다.
 * ponytail: 처음 보일 때 512px 를 메인 스레드에서 한 번 칠한다(수 ms). 끊기면 백그라운드로 옮긴다
 */
private fun tintedFrame(ctx: Context, id: Int, body: Color): ImageBitmap {
    val argb = body.toArgb()
    val key = (id.toLong() shl 32) or (argb.toLong() and 0xFFFFFFFFL)
    tinted.get(key)?.let { return it }
    val bmp = BitmapFactory.decodeResource(ctx.resources, id, BitmapFactory.Options().apply { inScaled = false; inMutable = true })
    val px = IntArray(bmp.width * bmp.height)
    bmp.getPixels(px, 0, bmp.width, 0, 0, bmp.width, bmp.height)
    val t = FloatArray(3).also { android.graphics.Color.colorToHSV(argb, it) }
    val warm = t[0] > 20f && t[0] < 60f
    val hsv = FloatArray(3)
    for (i in px.indices) {
        val p = px[i]
        if (p ushr 24 == 0) continue
        android.graphics.Color.colorToHSV(p, hsv)
        if (hsv[0] > 205f && hsv[0] < 262f && hsv[1] > 0.18f && hsv[2] > 0.3f) {
            hsv[0] = t[0]; hsv[1] = min(1f, hsv[1] * t[1] / 0.53f); hsv[2] = min(1f, hsv[2] * t[2] / 0.95f)
        } else if (warm && hsv[0] > 15f && hsv[0] < 55f && hsv[1] > 0.5f && hsv[2] > 0.5f) {
            hsv[0] = 14f; hsv[2] *= 0.92f
        } else continue
        px[i] = android.graphics.Color.HSVToColor(p ushr 24, hsv)
    }
    bmp.setPixels(px, 0, bmp.width, 0, 0, bmp.width, bmp.height)
    return bmp.asImageBitmap().also { tinted.put(key, it) }
}

/**
 * 마스코트 한 곳. 바탕이 투명한 표정 그림을 칸에 맞춰 그리고, 프레임이 여럿이면 바꿔 가며 움직인다.
 * 운전석은 주행 중(CarUxRestrictions)에도 새 무전마다 한 번만 돌고(ONCE) 멈춘다. 조작할 일이 없는 짧은 반응이다
 */
@Composable
fun CuckooView(mood: Mood, modifier: Modifier = Modifier, play: Play = Play.LOOP, body: Color? = null) {
    val ctx = LocalContext.current
    val ids = remember(mood) { frameIds(ctx, mood) }
    var frame by remember(mood) { mutableIntStateOf(0) }
    val scale = remember(mood) { Animatable(if (play == Play.ONCE) 0.82f else 1f) }
    val bob = remember(mood) { Animatable(0f) }
    LaunchedEffect(mood, play) {
        if (play == Play.ONCE) launch { scale.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow)) }
        if (play == Play.LOOP && ids.size < 2) launch { bob.animateTo(1f, infiniteRepeatable(tween(900), RepeatMode.Reverse)) }
        if (play == Play.STILL || ids.size < 2) return@LaunchedEffect
        var left = if (play == Play.ONCE) ONCE_MS / FRAME_MS else Long.MAX_VALUE
        while (left-- > 0) {
            delay(FRAME_MS)
            frame = (frame + 1) % ids.size
        }
        frame = 0
    }
    val id = ids[frame.coerceIn(ids.indices)]
    val mod = modifier.graphicsLayer { scaleX = scale.value; scaleY = scale.value; translationY = -bob.value * size.height * 0.04f }
    if (body == null) Image(painterResource(id), contentDescription = null, modifier = mod)
    else Image(remember(id, body) { tintedFrame(ctx, id, body) }, contentDescription = null, modifier = mod)
}
