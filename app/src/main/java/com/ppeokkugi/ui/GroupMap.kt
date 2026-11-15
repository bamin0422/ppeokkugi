package com.ppeokkugi.ui

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.drawable.BitmapDrawable
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.ui.text.font.FontWeight
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
 * OSM 기본 타일의 채도를 빼고 대비를 줄인 뒤, 어두운 곳은 옅은 회색·밝은 곳은 거의 흰색으로 맞춘 낮 지도.
 * 테마 색만 바꾸면 지도도 따라간다. 그 위의 차·핀만 제 색을 갖는다
 */
private val MAP_LAND = C.grey50
private val DAY_TILES = run {
    val lo = C.grey300; val hi = MAP_LAND // 지도 글자·선은 ink3 보다 옅게
    ColorMatrixColorFilter(
        ColorMatrix().apply {
            setSaturation(0f)
            postConcat(ColorMatrix(floatArrayOf(
                hi.red - lo.red, 0f, 0f, 0f, lo.red * 255f,
                0f, hi.green - lo.green, 0f, 0f, lo.green * 255f,
                0f, 0f, hi.blue - lo.blue, 0f, lo.blue * 255f,
                0f, 0f, 0f, 1f, 0f,
            )))
        },
    )
}

/** 이슈 핀 글자·색·이름 */
private fun pinStyle(kind: String): Triple<String, Color, String> = when (kind) {
    "brake_hard" -> Triple("급", C.tx, "급제동")
    "rain" -> Triple("비", C.car(6), "비")
    "turn_left" -> Triple("좌", C.accent, "좌회전")
    "turn_right" -> Triple("우", C.accent, "우회전")
    "speed_limit" -> Triple("속", C.amber, "제한속도")
    "caution" -> Triple("주", C.amber, "주의 구간")
    "airbag" -> Triple("!", C.tx, "에어백")
    "fall_behind" -> Triple("이", C.ink2, "대열 이탈")
    else -> Triple("?", C.ink2, kind)
}

/**
 * 일행 지도. 모든 차를 흰 테를 두른 호차 색 물방울 핀과 "N호차" 이름표로, 우리 차는 더 크게 그린다.
 * 손으로 움직이지 않고 맨 앞 차부터 맨 뒤 차까지 들어오게 스스로 맞춘다(주행 중에도 조작이 필요 없다).
 * 이슈 핀은 [StatusViewModel.PIN_TTL_MS] 동안 남는다.
 */
@Composable
fun GroupMap(s: RoomState, modifier: Modifier = Modifier) {
    val now = System.currentTimeMillis()
    val pins = s.pins.filter { now - it.at < StatusViewModel.PIN_TTL_MS }
    val shape = RoundedCornerShape(R_.card)
    Box(modifier.clip(shape).background(MAP_LAND)) {
        if (LocalInspectionMode.current) {
            Text("지도", style = T.note, modifier = Modifier.align(Alignment.Center))
        } else {
            OsmMap(s, pins)
        }
        if (s.cars.none { it.lat != null }) Text("일행 위치를 기다립니다", style = T.note, modifier = Modifier.align(Alignment.Center))
        if (pins.isNotEmpty()) Legend(pins, Modifier.align(Alignment.TopStart).padding(16.dp))
    }
}

@SuppressLint("ClickableViewAccessibility")
@Composable
private fun OsmMap(s: RoomState, pins: List<Pin>) {
    val ctx = LocalContext.current
    val latest by rememberUpdatedState(s)
    val icons = remember { HashMap<String, Pair<BitmapDrawable, Float>>() }
    val map = remember {
        Configuration.getInstance().apply {
            userAgentValue = ctx.packageName
            osmdroidBasePath = File(ctx.cacheDir, "osmdroid")
            osmdroidTileCache = File(ctx.cacheDir, "osmdroid/tiles")
        }
        MapView(ctx).apply {
            // OSM 타일 정책: 앱을 알아볼 수 있는 User-Agent 와 출처 표기
            setTileSource(TileSourceFactory.MAPNIK)
            overlayManager.tilesOverlay.setColorFilter(DAY_TILES)
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

private fun draw(m: MapView, s: RoomState, pins: List<Pin>, icons: HashMap<String, Pair<BitmapDrawable, Float>>) {
    val ctx = m.context
    m.overlays.clear()
    pins.forEach { p ->
        val (label, color, name) = pinStyle(p.kind)
        val (icon, tip) = icons.getOrPut("pin$label") { pin(ctx, label, color) }
        m.overlays += marker(m, p.lat, p.lng, icon, "$name · ${p.from}", tip)
    }
    // 차는 핀 위에 그린다. 우리 차를 맨 마지막에
    s.cars.filter { it.lat != null }.sortedBy { it.me }.forEach { c ->
        val name = if (c.me) "우리 차" else c.label
        val (icon, tip) = icons.getOrPut("car${c.num}${c.me}${C.car(c.num).value}") { car(ctx, c.num, name, C.car(c.num), c.me) }
        m.overlays += marker(m, c.lat!!, c.lng!!, icon, c.label, tip)
    }
    m.overlays += CopyrightOverlay(ctx).apply { setTextColor(C.ink2.toArgb()) }
    m.invalidate()
}

private fun marker(m: MapView, lat: Double, lng: Double, icon: BitmapDrawable, title: String, anchorV: Float) = Marker(m).apply {
    position = GeoPoint(lat, lng)
    setAnchor(Marker.ANCHOR_CENTER, anchorV)
    this.icon = icon
    this.title = title
    infoWindow = null
}

/** 지도 글자는 프리텐다드 ExtraBold */
private fun sans(ctx: Context) = ResourcesCompat.getFont(ctx, R.font.pretendard_extrabold)

/**
 * 물방울 핀: 한 귀퉁이만 덜 둥근 네모를 45도 돌려 뾰족한 끝이 아래로 오게 한다. 흰 테, 옅은 그림자, 가운데 글자.
 * [top] 은 핀 머리 위 끝, 돌아온 값은 뾰족한 끝의 y
 */
private fun drop(ctx: Context, cv: Canvas, cx: Float, top: Float, side: Float, fill: Color, label: String, textSize: Float): Float {
    val d = ctx.resources.displayMetrics.density
    val half = side / 2
    val diag = side * 0.7071f
    val cy = top + diag
    val r = half
    val path = Path().apply {
        addRoundRect(RectF(cx - half, cy - half, cx + half, cy + half), floatArrayOf(r, r, r, r, r, r, side * 0.15f, side * 0.15f), Path.Direction.CW)
        transform(Matrix().apply { setRotate(-45f, cx, cy) })
    }
    val p = Paint(Paint.ANTI_ALIAS_FLAG)
    p.color = android.graphics.Color.WHITE
    p.setShadowLayer(8 * d, 0f, 4 * d, SHADOW.toArgb())
    cv.save(); cv.scale(1.12f, 1.12f, cx, cy); cv.drawPath(path, p); cv.restore() // 흰 테
    p.clearShadowLayer()
    p.color = fill.toArgb(); cv.drawPath(path, p)
    p.typeface = sans(ctx); p.textSize = textSize; p.textAlign = Paint.Align.CENTER; p.color = onFlag(fill).toArgb()
    cv.drawText(label, cx, cy - (p.descent() + p.ascent()) / 2, p)
    return cy + diag * 1.12f
}

private val SHADOW = Color(0x33191F28)

/** 차: 호차 색 물방울 핀에 번호(색 밝기에 따라 ink·흰색), 아래에 흰 알약 이름표. 우리 차는 핀이 크다 */
private fun car(ctx: Context, num: Int, name: String, fill: Color, me: Boolean): Pair<BitmapDrawable, Float> {
    val d = ctx.resources.displayMetrics.density
    val side = (if (me) 50f else 42f) * d
    val p = Paint(Paint.ANTI_ALIAS_FLAG).apply { typeface = sans(ctx); textSize = 20f * d; textAlign = Paint.Align.CENTER }
    val tagW = p.measureText(name) + 28 * d
    val w = maxOf(side * 1.6f, tagW) + 20 * d
    val pad = 10 * d
    val tipGuess = pad + side * 0.7071f * 2.12f
    val h = tipGuess + 6 * d + 34 * d + pad
    val bmp = Bitmap.createBitmap(w.toInt(), h.toInt(), Bitmap.Config.ARGB_8888)
    val cv = Canvas(bmp)
    val cx = w / 2
    val tip = drop(ctx, cv, cx, pad, side, fill, "$num", (if (me) 26f else 22f) * d)
    // 이름표
    val top = tip + 6 * d
    val tag = RectF(cx - tagW / 2, top, cx + tagW / 2, top + 32 * d)
    p.color = (if (me) C.ink else C.paper).toArgb()
    p.setShadowLayer(6 * d, 0f, 3 * d, SHADOW.toArgb())
    cv.drawRoundRect(tag, tag.height() / 2, tag.height() / 2, p)
    p.clearShadowLayer()
    p.color = (if (me) C.paper else C.ink).toArgb()
    cv.drawText(name, cx, tag.centerY() - (p.descent() + p.ascent()) / 2, p)
    return BitmapDrawable(ctx.resources, bmp) to tip / h
}

/** 이슈 핀: 색 물방울에 글자 하나, 뾰족한 끝이 위치 */
private fun pin(ctx: Context, label: String, fill: Color): Pair<BitmapDrawable, Float> {
    val d = ctx.resources.displayMetrics.density
    val side = 36 * d
    val pad = 8 * d
    val w = side * 1.6f + pad * 2
    val h = pad + side * 0.7071f * 2.12f + pad
    val bmp = Bitmap.createBitmap(w.toInt(), h.toInt(), Bitmap.Config.ARGB_8888)
    val tip = drop(ctx, Canvas(bmp), w / 2, pad, side, fill, label, 20 * d)
    return BitmapDrawable(ctx.resources, bmp) to tip / h
}

/** 지금 지도에 있는 핀 종류만 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Legend(pins: List<Pin>, modifier: Modifier) {
    // 종류가 많으면 다음 줄로 넘긴다
    FlowRow(
        modifier.padding(end = 16.dp).card(shape = RoundedCornerShape(R_.md)).padding(horizontal = 14.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        pins.map { it.kind }.distinct().forEach { k ->
            val (label, color, name) = pinStyle(k)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(30.dp).background(color, RoundedCornerShape(50)), contentAlignment = Alignment.Center) {
                    Text(label, style = T.note.copy(fontWeight = FontWeight.ExtraBold, color = onFlag(color)))
                }
                Text(name, style = T.note.copy(fontWeight = FontWeight.Bold, color = C.ink), maxLines = 1)
            }
        }
    }
}
