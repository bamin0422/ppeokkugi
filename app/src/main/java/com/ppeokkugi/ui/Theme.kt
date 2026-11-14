package com.ppeokkugi.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineBreak
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ppeokkugi.Mood
import com.ppeokkugi.R

/**
 * 색은 여기에만 둔다(휴대폰 화면은 server/src/phone.html 의 :root 변수). 지도 타일 색도 여기서 만든다.
 * 회색 바탕에 테 없는 흰 카드, 회색 단계로 나눈 글자, 주황 하나를 주 색으로 쓴다.
 * 바탕·카드 위 본문(ink·ink2)은 WCAG AA(4.5:1) 이상. ink3 은 시각 같은 덧붙임에만 쓴다.
 * 주황 면 위 글자는 흰색이 아니라 ink(5.9:1). 색 위 작은 태그 글자는 모두 20sp 이상 굵은 글자(큰 글자 기준 3:1)다.
 * 초록은 쓰지 않는다. 성공·연결은 주황으로 보인다
 */
object C {
    val grey50 = Color(0xFFF9FAFB)
    val grey100 = Color(0xFFF2F4F6)
    val grey200 = Color(0xFFE5E8EB)
    val grey300 = Color(0xFFD1D6DB)
    val grey400 = Color(0xFFB0B8C1)
    val grey500 = Color(0xFF8B95A1)
    val grey600 = Color(0xFF6B7684)
    val grey700 = Color(0xFF4E5968)

    val bg = grey100                   // 화면 바탕
    val paper = Color(0xFFFFFFFF)      // 카드
    val ink = Color(0xFF191F28)        // 본문(grey900)
    val ink2 = grey700                 // 보조 글자. 회색 바탕 위에서도 4.5:1 이상
    val ink3 = grey500                 // 덧붙임 글자만(대비 4.5 미만)

    // 주 색(주황)
    val accent = Color(0xFFFF6F0F)
    val accentPressed = Color(0xFFE85F00)
    val accentWeak = Color(0xFFFFF1E6)
    val accentInk = Color(0xFFB04000)  // 옅은 주황 위 글자(5.3:1)

    // 신호
    val tx = Color(0xFFF04452)         // 위험·급제동·긴급
    val txWeak = Color(0xFFFFEEEE)
    val rx = Color(0xFF3182F6)         // 수신·안내
    val rxWeak = Color(0xFFE8F3FF)
    val purple = Color(0xFF7B55FF)
    val purpleWeak = Color(0xFFF0EBFF)
    val amber = Color(0xFFFFB331)

    /** 호차 색 1..6. 서버가 준 깃발 색 대신 화면에서는 이 색을 쓴다 */
    val cars = listOf(tx, rx, amber, purple, Color(0xFFFF3D8B), Color(0xFF14B8D4))
    fun car(num: Int) = cars[(num - 1).mod(cars.size)]

    /** 마스코트 칸 바탕(표정마다 옅은 색) */
    fun tint(m: Mood) = when (m) {
        Mood.ALERT, Mood.BRAKE, Mood.EMERGENCY, Mood.LOST, Mood.CAMERA -> txWeak
        Mood.TALK, Mood.RX, Mood.TX, Mood.KIDS, Mood.RAIN -> rxWeak
        Mood.ROLLCALL, Mood.VOTE, Mood.ARRIVE -> purpleWeak
        Mood.REST, Mood.WAIT -> accentWeak
        Mood.BASE -> grey100
    }
}

/** 색 바탕 위 글자색: 흰색과 ink 중 대비가 큰 쪽(두 대비가 같아지는 밝기 0.217 기준) */
fun onFlag(c: Color) = if (c.luminance() > 0.217f) C.ink else Color.White

object R_ {
    /** 칩·태그 모서리 */
    val sm = 10.dp
    /** 버튼 모서리 */
    val md = 16.dp
    val lg = 24.dp
    /** 카드 모서리 */
    val card = 24.dp
}

/**
 * 글꼴은 모두 프리텐다드. 제목은 Bold, 구역 이름은 SemiBold 회색, 본문은 SemiBold.
 * 라이선스 assets/licenses/OFL-*.txt. 운전석 본문은 24sp 아래로, 무전 카드 글은 36sp 아래로 내리지 않는다
 */
val Sans = FontFamily(
    Font(R.font.pretendard_regular, FontWeight.Normal),
    Font(R.font.pretendard_semibold, FontWeight.SemiBold),
    Font(R.font.pretendard_bold, FontWeight.Bold),
    Font(R.font.pretendard_extrabold, FontWeight.ExtraBold),
)

object T {
    val brand = TextStyle(fontFamily = Sans, fontWeight = FontWeight.ExtraBold, fontSize = 40.sp, lineHeight = 44.sp, letterSpacing = (-0.8).sp, color = C.ink)
    val pageTitle = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 38.sp, lineHeight = 48.sp, letterSpacing = (-0.6).sp, color = C.ink)
    val sectionLabel = TextStyle(fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, lineHeight = 32.sp, color = C.grey700)
    val body = TextStyle(fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, lineHeight = 34.sp, color = C.ink)
    val note = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Normal, fontSize = 20.sp, lineHeight = 28.sp, color = C.ink2)
    /** 무전 카드 본문(운전석 큰 카드). 줄은 어절 단위로 바꾼다(Android 13 이상) */
    val cardText = TextStyle(
        fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 40.sp, lineHeight = 52.sp, letterSpacing = (-0.6).sp, color = C.ink,
        lineBreak = LineBreak(LineBreak.Strategy.Balanced, LineBreak.Strictness.Strict, LineBreak.WordBreak.Phrase),
    )
    /** 숫자·짧은 표시(채널 코드·시각·거리·호차 번호) */
    val num = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 28.sp, color = C.ink)
    val button = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 28.sp, color = C.ink)
}

@Composable
fun PpeokkugiTheme(content: @Composable () -> Unit) = MaterialTheme(
    colorScheme = lightColorScheme(
        primary = C.accent, onPrimary = C.ink,
        background = C.bg, surface = C.paper, onSurface = C.ink,
    ),
    content = content,
)
