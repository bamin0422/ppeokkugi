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
 * 핀 보드 무전기: 따뜻한 종이 바탕에 흰 핀 카드, 짙은 LCD 창, 주황 PTT, 송신 빨강·수신 파랑 LED.
 * 바탕·카드 위 글자(ink·ink2)와 LCD 위 글자(lcdInk)는 WCAG AA(4.5:1) 이상. ink3 은 시각 같은 덧붙임에만 쓴다.
 * 초록은 쓰지 않는다
 */
object C {
    val bg = Color(0xFFFFFAF6)         // 화면 바탕(따뜻한 종이)
    val paper = Color(0xFFFFFFFF)      // 핀 카드
    val line = Color(0xFFF1E6DF)       // 카드 테·나눔선·그릴 점
    val ink = Color(0xFF2A2230)
    val ink2 = Color(0xFF6E6170)
    val ink3 = Color(0xFFAB9CA8)       // 덧붙임 글자만(대비 4.5 미만)
    // LCD 창
    val lcd = Color(0xFF2A2230)
    val lcdInk = Color(0xFFFFE9A3)
    val lcdDim = Color(0xFFA48F73)
    val grille = Color(0xFF4A3F50)     // 짙은 판 위 그릴 점
    val onDark = Color(0xFFCBBFCC)     // 짙은 판 위 보조 글자
    // 신호
    val tx = Color(0xFFFF3D5A)         // 송신·경고 LED, 테
    val txInk = Color(0xFFC21535)      // 흰 바탕 위 경고 글자
    val rx = Color(0xFF2B8CFF)         // 수신 LED
    val accent = Color(0xFFFF7A1A)     // 상표·PTT 주황
    val accentHi = Color(0xFFFF9A4A)   // PTT 위쪽 빛
    val amber = Color(0xFFFFBF1F)
    val warnInk = Color(0xFFA34A00)    // 종이 위 주의 글자(주행 중)
    val sos = Color(0xFF2A0B14)        // 긴급 콜 전체 화면
    val sosInk = Color(0xFFFFD9DF)

    /** 호차 색 1..6. 서버가 준 깃발 색 대신 화면에서는 이 색을 쓴다 */
    val cars = listOf(Color(0xFFFF5A4E), Color(0xFF2B8CFF), Color(0xFFFFBF1F), Color(0xFF7B55FF), Color(0xFFFF3D8B), Color(0xFF14B8D4))
    fun car(num: Int) = cars[(num - 1).mod(cars.size)]

    /** 마스코트 칸 바탕(표정마다 옅은 색) */
    fun tint(m: Mood) = when (m) {
        Mood.ALERT, Mood.BRAKE, Mood.EMERGENCY, Mood.LOST, Mood.CAMERA -> Color(0xFFFFE3E8)
        Mood.TALK, Mood.RX, Mood.TX -> Color(0xFFE6F0FF)
        Mood.ROLLCALL, Mood.VOTE, Mood.ARRIVE -> Color(0xFFEFE9FF)
        Mood.REST, Mood.WAIT -> Color(0xFFFFF0DC)
        Mood.KIDS, Mood.RAIN -> Color(0xFFDFF5FA)
        Mood.BASE -> Color(0xFFFFEFE4)
    }
}

/** 색 바탕 위 글자색: 흰색과 ink 중 대비가 큰 쪽(두 대비가 같아지는 밝기 0.217 기준) */
fun onFlag(c: Color) = if (c.luminance() > 0.217f) C.ink else Color.White

object R_ {
    val sm = 10.dp
    val md = 16.dp
    val lg = 24.dp
    /** 카드 모서리 */
    val card = 28.dp
    val stroke = 1.5.dp
}

/**
 * 글꼴은 모두 프리텐다드. 제목·상표·PTT 는 ExtraBold([Display]), 나머지는 [Sans].
 * 라이선스 assets/licenses/OFL-*.txt. 운전석 본문은 24sp 아래로, 무전 카드 글은 36sp 아래로 내리지 않는다
 */
val Display = FontFamily(Font(R.font.pretendard_extrabold, FontWeight.Bold))
val Sans = FontFamily(
    Font(R.font.pretendard_regular, FontWeight.Normal),
    Font(R.font.pretendard_semibold, FontWeight.SemiBold),
    Font(R.font.pretendard_bold, FontWeight.Bold),
    Font(R.font.pretendard_extrabold, FontWeight.ExtraBold),
)

object T {
    val brand = TextStyle(fontFamily = Display, fontWeight = FontWeight.Bold, fontSize = 40.sp, lineHeight = 44.sp, color = C.ink)
    val pageTitle = TextStyle(fontFamily = Display, fontWeight = FontWeight.Bold, fontSize = 36.sp, lineHeight = 46.sp, color = C.ink)
    val sectionLabel = TextStyle(fontFamily = Display, fontWeight = FontWeight.Bold, fontSize = 28.sp, lineHeight = 34.sp, color = C.ink)
    val body = TextStyle(fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, lineHeight = 34.sp, color = C.ink)
    val note = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Normal, fontSize = 20.sp, lineHeight = 28.sp, color = C.ink2)
    /** 무전 카드 본문(운전석 큰 카드). 줄은 어절 단위로 바꾼다(Android 13 이상) */
    val cardText = TextStyle(
        fontFamily = Sans, fontWeight = FontWeight.ExtraBold, fontSize = 40.sp, lineHeight = 50.sp, letterSpacing = (-0.4).sp, color = C.ink,
        lineBreak = LineBreak(LineBreak.Strategy.Balanced, LineBreak.Strictness.Strict, LineBreak.WordBreak.Phrase),
    )
    /** 숫자·짧은 표시(채널 코드·시각·거리·호차 번호) */
    val lcd = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 28.sp, color = C.lcdInk)
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
