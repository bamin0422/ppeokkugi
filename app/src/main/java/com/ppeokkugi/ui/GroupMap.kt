package com.ppeokkugi.ui

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.drawable.BitmapDrawable
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.res.ResourcesCompat
import com.ppeokkugi.Pin
import com.ppeokkugi.R
import com.ppeokkugi.RoomState
import com.ppeokkugi.StatusViewModel
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.BoundingBox
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.CustomZoomButtonsController
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.CopyrightOverlay
import org.osmdroid.views.overlay.Marker
import java.io.File

// 길품 GilpumMap 에서 가져와 일행 지도로 고쳤다

/**
 * OSM 기본 타일을 반전하고 채도를 뺀 뒤, 어두운 곳은 바탕(paper)·밝은 곳은 흐린 글자색(muted)으로 맞춘 중립 밤 지도.
 * 테마 색만 바꾸면 지도도 따라간다. 그 위의 차·핀만 제 색을 갖는다
 */
private val NIGHT_TILES = run {
    val lo = C.paper; val hi = C.muted
    val k = 0.75f // 가장 밝은 글자도 muted 까지는 가지 않게
    fun sc(l: Float, h: Float) = (h - l) * k
    ColorMatrixColorFilter(
        ColorMatrix(floatArrayOf(-1f, 0f, 0f, 0f, 255f, 0f, -1f, 0f, 0f, 255f, 0f, 0f, -1f, 0f, 255f, 0f, 0f, 0f, 1f, 0f)).apply {
            postConcat(ColorMatrix().apply { setSaturation(0f) })
            postConcat(ColorMatrix(floatArrayOf(
                sc(lo.red, hi.red), 0f, 0f, 0f, lo.red * 255f,
                0f, sc(lo.green, hi.green), 0f, 0f, lo.green * 255f,
                0f, 0f, sc(lo.blue, hi.blue), 0f, lo.blue * 255f,
                0f, 0f, 0f, 1f, 0f,
            )))
        },
    )
}

/** 이슈 핀 글자·색·이름 */
private fun pinStyle(kind: String): Triple<String, Color, String> = when (kind) {
    "brake_hard" -> Triple("급", C.danger, "급제동")
    "rain" -> Triple("비", C.rain, "비")
    "turn_left" -> Triple("좌", C.accent, "좌회전")
    "turn_right" -> Triple("우", C.accent, "우회전")
    "speed_limit" -> Triple("속", C.warn, "제한속도")
    "caution" -> Triple("주", C.warn, "주의 구간")
    "airbag" -> Triple("!", C.tx, "에어백")
    "fall_behind" -> Triple("이", C.muted, "대열 이탈")
    else -> Triple("?", C.muted, kind)
}

/**
 * 일행 지도. 모든 차를 흰 테를 두른 깃발 색 원과 "N호차" 이름표로, 우리 차는 굵은 테로 그린다.
 * 손으로 움직이지 않고 맨 앞 차부터 맨 뒤 차까지 들어오게 스스로 맞춘다(주행 중에도 조작이 필요 없다).
 * 이슈 핀은 [StatusViewModel.PIN_TTL_MS] 동안 남는다.
 */
@Composable
fun GroupMap(s: RoomState, modifier: Modifier = Modifier) {
    val now = System.currentTimeMillis()
    val pins = s.pins.filter { now - it.at < StatusViewModel.PIN_TTL_MS }
    Box(modifier.clipToBounds().background(C.sunk).border(3.dp, C.bezel)) {
        if (LocalInspectionMode.current) {
            Text("지도", style = T.note, modifier = Modifier.align(Alignment.Center))
        } else {
            OsmMap(s, pins)
        }
        if (s.cars.none { it.lat != null }) Text("일행 위치를 기다립니다", style = T.note, modifier = Modifier.align(Alignment.Center))
        if (pins.isNotEmpty()) Legend(pins, Modifier.align(Alignment.TopStart).padding(12.dp))
    }
}

@SuppressLint("ClickableViewAccessibility")
@Composable
private fun OsmMap(s: RoomState, pins: List<Pin>) {
    val ctx = LocalContext.current
    val latest by rememberUpdatedState(s)
    val icons = remember { HashMap<String, BitmapDrawable>() }
    val map = remember {
        Configuration.getInstance().apply {
            userAgentValue = ctx.packageName
            osmdroidBasePath = File(ctx.cacheDir, "osmdroid")
            osmdroidTileCache = File(ctx.cacheDir, "osmdroid/tiles")
        }
        MapView(ctx).apply {
            // OSM 타일 정책: 앱을 알아볼 수 있는 User-Agent 와 출처 표기
            setTileSource(TileSourceFactory.MAPNIK)
            overlayManager.tilesOverlay.setColorFilter(NIGHT_TILES)
            isTilesScaledToDpi = true
            zoomController.setVisibility(CustomZoomButtonsController.Visibility.NEVER)
            // 운전 중이라 손으로 움직이지 않는다
            setMultiTouchControls(false)
            setOnTouchListener { _, _ -> true }
            minZoomLevel = 6.0
            maxZoomLevel = 16.0
            controller.setZoom(12.0)
            controller.setCenter(GeoPoint(37.454, 127.043))
            addOnFirstLayoutListener { _, _, _, _, _ -> fit(this, latest, latest.pins) }
        }
    }
    DisposableEffect(map) {
        map.onResume()
        onDispose { map.onDetach() }
    }
    AndroidView({ map }, Modifier.fillMaxSize()) { m ->
        draw(m, s, pins, icons)
        if (m.width > 0) fit(m, s, pins)
    }
}

/** 맨 앞부터 맨 뒤 차까지, 살아 있는 이슈 핀까지 한 화면에. 한 대뿐이면 그 차 가운데 */
private fun fit(m: MapView, s: RoomState, pins: List<Pin>) {
    val pts = s.cars.mapNotNull { c -> c.lat?.let { GeoPoint(it, c.lng!!) } } + pins.map { GeoPoint(it.lat, it.lng) }
    if (pts.isEmpty()) return
    val b = BoundingBox.fromGeoPoints(pts)
    if (pts.size < 2 || (b.latitudeSpan < 0.002 && b.longitudeSpan < 0.002)) {
        m.controller.setZoom(15.0)
        m.controller.setCenter(GeoPoint(b.centerLatitude, b.centerLongitude))
        return
    }
    m.zoomToBoundingBox(b, false, 90)
}

private fun draw(m: MapView, s: RoomState, pins: List<Pin>, icons: HashMap<String, BitmapDrawable>) {
    val ctx = m.context
    m.overlays.clear()
    pins.forEach { p ->
        val (label, color, name) = pinStyle(p.kind)
        m.overlays += marker(m, p.lat, p.lng, icons.getOrPut("pin$label") { pin(ctx, label, color) }, "$name · ${p.from}", Marker.ANCHOR_BOTTOM)
    }
    // 차는 핀 위에 그린다. 우리 차를 맨 마지막에
    s.cars.filter { it.lat != null }.sortedBy { it.me }.forEach { c ->
        val name = if (c.me) "우리 차" else c.label
        m.overlays += marker(m, c.lat!!, c.lng!!, icons.getOrPut("car${c.num}${c.color}${c.me}") { car(ctx, c.num, name, Color(c.color), c.me) }, c.label, CAR_ANCHOR)
    }
    m.overlays += CopyrightOverlay(ctx).apply { setTextColor(C.muted.toArgb()) }
    m.invalidate()
}

private fun marker(m: MapView, lat: Double, lng: Double, icon: BitmapDrawable, title: String, anchorV: Float) = Marker(m).apply {
    position = GeoPoint(lat, lng)
    setAnchor(Marker.ANCHOR_CENTER, anchorV)
    this.icon = icon
    this.title = title
    infoWindow = null
}

/** 차 그림에서 칸 가운데의 세로 위치(이름표가 아래에 붙는다). 핀은 아래 꼭짓점이 위치 */
private const val CAR_ANCHOR = 0.33f

/** 지도 글자도 픽셀 글꼴(Galmuri11 Bold, 12px 격자라 24px) */
private fun pixel(ctx: Context) = ResourcesCompat.getFont(ctx, R.font.galmuri11_bold)

/** 계단 모서리 네모: 가로·세로 두 사각형을 겹쳐 네 귀퉁이를 한 칸씩 비운다 */
private fun notched(cv: Canvas, l: Float, t: Float, r: Float, b: Float, n: Float, p: Paint) {
    cv.drawRect(l + n, t, r - n, b, p)
    cv.drawRect(l, t + n, r, b - n, p)
}

/** 테·바탕·딱딱한 그림자를 갖춘 픽셀 칸 */
private fun pixelBox(cv: Canvas, l: Float, t: Float, r: Float, b: Float, d: Float, fill: Int, border: Int, stroke: Float) {
    val p = Paint() // 픽셀이라 안티에일리어스 없이
    val n = 2 * d; val sh = 3 * d
    p.color = C.bezel.toArgb(); notched(cv, l + sh, t + sh, r + sh, b + sh, n, p)
    p.color = border; notched(cv, l, t, r, b, n, p)
    p.color = fill; notched(cv, l + stroke, t + stroke, r - stroke, b - stroke, n, p)
}

/** 차: 깃발 색 네모 칸 안에 픽셀 호차 번호(깃발 밝기에 따라 검정·흰색), 아래에 이름표. 흰 테, 우리 차는 굵게 */
private fun car(ctx: Context, num: Int, name: String, fill: Color, me: Boolean): BitmapDrawable {
    val d = ctx.resources.displayMetrics.density
    val box = (if (me) 48f else 40f) * d
    val p = Paint().apply { typeface = pixel(ctx); textSize = 24f * d; textAlign = Paint.Align.CENTER }
    val tagW = p.measureText(name) + 16 * d
    val w = maxOf(box, tagW) + 8 * d
    val h = box + 40 * d
    val bmp = Bitmap.createBitmap(w.toInt(), h.toInt(), Bitmap.Config.ARGB_8888)
    val cv = Canvas(bmp)
    val cx = w / 2
    pixelBox(cv, cx - box / 2, 2 * d, cx + box / 2, 2 * d + box, d, fill.toArgb(), C.ink.toArgb(), (if (me) 4f else 2f) * d)
    p.color = onFlag(fill).toArgb()
    val cy = 2 * d + box / 2
    cv.drawText("$num", cx, cy - (p.descent() + p.ascent()) / 2, p)
    // 이름표
    val top = 2 * d + box + 6 * d
    val tag = RectF(cx - tagW / 2, top, cx + tagW / 2, top + 30 * d)
    p.color = (if (me) C.ink else C.paper).toArgb()
    notched(cv, tag.left, tag.top, tag.right, tag.bottom, 2 * d, p)
    p.color = (if (me) C.paper else C.ink).toArgb()
    cv.drawText(name, cx, tag.centerY() - (p.descent() + p.ascent()) / 2, p)
    return BitmapDrawable(ctx.resources, bmp)
}

/** 이슈 핀: 색 네모 칸에 픽셀 글자 하나, 아래로 계단 꼬리 */
private fun pin(ctx: Context, label: String, fill: Color): BitmapDrawable {
    val d = ctx.resources.displayMetrics.density
    val box = 36 * d
    val w = box + 6 * d
    val h = box + 18 * d
    val bmp = Bitmap.createBitmap(w.toInt(), h.toInt(), Bitmap.Config.ARGB_8888)
    val cv = Canvas(bmp)
    val p = Paint()
    // 계단 꼬리: 아래로 갈수록 4dp 씩 좁아진다
    val cx = box / 2
    p.color = C.ink.toArgb()
    for (i in 0 until 3) { val half = (6 - i * 2) * d; cv.drawRect(cx - half, box + i * 4 * d, cx + half, box + (i + 1) * 4 * d, p) }
    pixelBox(cv, 0f, 0f, box, box, d, fill.toArgb(), C.ink.toArgb(), 2 * d)
    p.color = C.paper.toArgb()
    p.textSize = 24 * d
    p.textAlign = Paint.Align.CENTER
    p.typeface = pixel(ctx)
    cv.drawText(label, cx, box / 2 - (p.descent() + p.ascent()) / 2, p)
    return BitmapDrawable(ctx.resources, bmp).apply { setFilterBitmap(false) }
}

/** 지금 지도에 있는 핀 종류만 */
@Composable
private fun Legend(pins: List<Pin>, modifier: Modifier) {
    Row(
        modifier.background(C.paper.copy(alpha = 0.9f)).border(R_.stroke, C.bezel).padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        pins.map { it.kind }.distinct().forEach { k ->
            val (label, color, name) = pinStyle(k)
            Box(Modifier.size(28.dp).background(color), contentAlignment = Alignment.Center) {
                Text(label, style = T.note.copy(color = C.paper))
            }
            Text(name, style = T.note.copy(color = C.ink))
        }
    }
}
