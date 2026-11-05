package com.ppeokkugi.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ppeokkugi.R

/**
 * 색은 여기에만 둔다(휴대폰 화면은 server/src/phone.html 의 :root 변수). 지도 타일 색도 paper·muted 로 만든다.
 * 무전기 테마: 검은 기기 몸체, 초록 백라이트 LCD, 신호 주황(마스코트 부리), 송신 빨강·수신 초록 LED.
 * 바탕 위 글자(ink·muted)와 LCD 위 글자(lcdInk·lcdMuted)는 WCAG AA(4.5:1) 이상. tx 빨강은 LED·테에만 쓴다
 */
object C {
    val paper = Color(0xFF121417)      // 기기 몸체
    val surface = Color(0xFF1E2226)    // 패널
    val sunk = Color(0xFF2A2F34)       // 고무 버튼
    val grille = Color(0xFF2C3237)     // 스피커 그릴 점·홈
    val ink = Color(0xFFECEFF1)
    val muted = Color(0xFFA3ABB3)
    val line = Color(0xFF353B41)
    val accent = Color(0xFFFF6A1A)     // 신호 주황
    val onAccent = Color(0xFF121417)
    val tx = Color(0xFFFF3B30)         // 송신 LED
    val rx = Color(0xFF34C759)         // 수신 LED
    val ok = rx
    val warn = Color(0xFFFFC94A)
    val danger = Color(0xFFFF6B5E)
    val rain = Color(0xFF5AC8FA)
    // LCD
    val lcd = Color(0xFFC9D86A)
    val lcdFlash = Color(0xFFEAF7A0)   // 새 무전이 올 때 잠깐 밝아지는 백라이트
    val lcdInk = Color(0xFF1A1F12)
    val lcdMuted = Color(0xFF45502C)
    val lcdAlert = Color(0xFFFFB3A1)   // 급제동·긴급 LCD
    val alertInk = Color(0xFF2A0A06)
    val bezel = Color(0xFF0A0B0D)      // LCD 테
    val sos = Color(0xFF2A0806)        // 긴급 콜 전체 화면
    val face = Color(0xFFF2F2F2)       // 캐릭터 그림 바탕과 같은 색
}

object R_ {
    val sm = 10.dp
    val md = 16.dp
    val lg = 24.dp
    /** 픽셀 계단 모서리 한 칸, 굵은 테, 딱딱한 그림자 */
    val notch = 4.dp
    val stroke = 2.dp
    val shadow = 4.dp
}


/**
 * 모든 글자는 픽셀 글꼴 Galmuri(OFL, 라이선스 assets/licenses/Galmuri-OFL.txt).
 * Galmuri11 은 12px 격자라 160dpi 에서 12의 배수(24·36·48sp)일 때 또렷하다. 작은 메타 글자만 Galmuri9(10px 격자, 20sp).
 * 운전석 본문은 24sp 아래로 내리지 않는다
 */
val Pixel = FontFamily(Font(R.font.galmuri11, FontWeight.Normal), Font(R.font.galmuri11_bold, FontWeight.Bold))
val PixelSmall = FontFamily(Font(R.font.galmuri9))

object T {
    val brand = TextStyle(fontFamily = Pixel, fontWeight = FontWeight.Bold, fontSize = 36.sp, lineHeight = 36.sp, color = C.ink)
    val pageTitle = TextStyle(fontFamily = Pixel, fontWeight = FontWeight.Bold, fontSize = 36.sp, lineHeight = 48.sp, color = C.ink)
    val sectionLabel = TextStyle(fontFamily = Pixel, fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 24.sp, color = C.ink)
    val body = TextStyle(fontFamily = Pixel, fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 36.sp, color = C.ink)
    val note = TextStyle(fontFamily = PixelSmall, fontSize = 20.sp, lineHeight = 30.sp, color = C.muted)
    /** 무전 카드 본문(운전석 큰 카드) */
    val cardText = TextStyle(fontFamily = Pixel, fontWeight = FontWeight.Bold, fontSize = 36.sp, lineHeight = 48.sp, color = C.lcdInk)
    /** LCD 읽힘(채널·RX/TX·시각·거리·호차 번호) */
    val lcd = TextStyle(fontFamily = Pixel, fontSize = 24.sp, lineHeight = 24.sp, color = C.lcdInk)
    val button = TextStyle(fontFamily = Pixel, fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 24.sp)
}

@Composable
fun PpeokkugiTheme(content: @Composable () -> Unit) = MaterialTheme(
    colorScheme = darkColorScheme(
        primary = C.accent, onPrimary = C.onAccent,
        background = C.paper, surface = C.surface, onSurface = C.ink,
    ),
    content = content,
)
