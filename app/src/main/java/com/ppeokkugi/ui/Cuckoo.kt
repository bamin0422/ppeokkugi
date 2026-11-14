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
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.platform.LocalContext
import com.ppeokkugi.Mood
import com.ppeokkugi.R

/** LOOP 천천히 들썩임을 반복, ONCE 처음 나타날 때 한 번 톡 튀어나옴, STILL 움직이지 않음 */
enum class Play { LOOP, ONCE, STILL }

/**
 * 표정 그림 id: cuckoo_<이름> → 없으면 [Mood.fallback] 의 그림.
 * 이름으로 찾는다(리소스 축소는 꺼져 있어 이름 조회가 안전하다)
 */
@android.annotation.SuppressLint("DiscouragedApi")
private fun imageId(ctx: Context, m: Mood): Int =
    ctx.resources.getIdentifier("cuckoo_${m.name.lowercase()}", "drawable", ctx.packageName).takeIf { it != 0 }
        ?: if (m.fallback != m) imageId(ctx, m.fallback) else R.drawable.cuckoo_base

/**
 * 마스코트 한 곳. 512px 그림을 칸에 맞춰 부드럽게 줄여 그린다.
 * 운전석은 주행 중(CarUxRestrictions)에도 새 무전마다 한 번만 튀어나오고(ONCE) 멈춘다. 조작할 일이 없는 짧은 반응이다
 */
@Composable
fun CuckooView(mood: Mood, modifier: Modifier = Modifier, play: Play = Play.LOOP) {
    val ctx = LocalContext.current
    val id = remember(mood) { imageId(ctx, mood) }
    val scale = remember(mood) { Animatable(if (play == Play.ONCE) 0.82f else 1f) }
    val lift = remember(mood) { Animatable(0f) }
    LaunchedEffect(mood, play) {
        when (play) {
            Play.ONCE -> scale.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow))
            Play.LOOP -> lift.animateTo(1f, infiniteRepeatable(tween(900), RepeatMode.Reverse))
            Play.STILL -> Unit
        }
    }
    Image(
        painterResource(id), contentDescription = null,
        modifier = modifier.graphicsLayer {
            scaleX = scale.value; scaleY = scale.value
            translationY = -lift.value * size.height * 0.04f
        },
    )
}
