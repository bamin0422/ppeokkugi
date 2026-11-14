package com.ppeokkugi.ui

import android.content.Context
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.platform.LocalContext
import com.ppeokkugi.Mood
import com.ppeokkugi.R

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

/**
 * 마스코트 한 곳. 바탕이 투명한 표정 그림을 칸에 맞춰 그리고, 프레임이 여럿이면 바꿔 가며 움직인다.
 * 운전석은 주행 중(CarUxRestrictions)에도 새 무전마다 한 번만 돌고(ONCE) 멈춘다. 조작할 일이 없는 짧은 반응이다
 */
@Composable
fun CuckooView(mood: Mood, modifier: Modifier = Modifier, play: Play = Play.LOOP) {
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
    Image(
        painterResource(ids[frame.coerceIn(ids.indices)]), contentDescription = null,
        modifier = modifier.graphicsLayer { scaleX = scale.value; scaleY = scale.value; translationY = -bob.value * size.height * 0.04f },
    )
}
