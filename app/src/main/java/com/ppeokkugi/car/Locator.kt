package com.ppeokkugi.car

import ai.pleos.playground.location.fused.FusedLocation
import ai.pleos.playground.location.fused.listener.FusedLocationListener
import ai.pleos.playground.location.fused.model.LocationData
import android.annotation.SuppressLint
import android.content.Context
import android.location.LocationListener
import android.location.LocationManager
/** Pleos FusedLocation 을 먼저 쓰고, 지원하지 않으면 안드로이드 GPS 로 받는다. 연속 위치로 속도를 계산해 Speed 이벤트를 함께 낸다. */
class Locator(context: Context, private val emit: (CarEvent) -> Unit, private val log: (String) -> Unit) {
    private val app = context.applicationContext
    private var fused: FusedLocation? = null
    private var lm: LocationManager? = null

    // 속도 계산용 이전 위치
    private var prevLat = 0.0
    private var prevLng = 0.0
    private var prevMs = 0L

    private fun onLocation(lat: Double, lng: Double) {
        emit(CarEvent.Location(lat, lng))
        val now = System.currentTimeMillis()
        val dt = now - prevMs
        if (prevMs > 0 && dt in 500..5000) {
            val dm = haversineM(prevLat, prevLng, lat, lng)
            val kmh = dm / dt * 3_600_000
            // 비현실적 값(250km/h 초과)은 GPS 튐으로 보고 버린다
            if (kmh < 250) emit(CarEvent.Speed(kmh))
        }
        prevLat = lat; prevLng = lng; prevMs = now
    }

    private val fusedListener = object : FusedLocationListener {
        override fun onChanged(location: LocationData?) { location?.let { onLocation(it.latitude, it.longitude) } }
        override fun onError(exception: Exception) = log("FusedLocation 오류: ${exception.message}")
    }
    private val gpsListener = LocationListener { onLocation(it.latitude, it.longitude) }

    @SuppressLint("MissingPermission")
    fun start(hasGpsPermission: Boolean) {
        val ok = runCatching {
            val f = FusedLocation(app)
            if (!f.isSupported()) return@runCatching false
            f.initialize()
            f.registerFusedLocationCallback(fusedListener)
            fused = f
            log("FusedLocation 연결")
            true
        }.getOrElse { log("FusedLocation 없음: ${it.message}"); false }
        if (ok || !hasGpsPermission) return
        runCatching {
            val m = app.getSystemService(LocationManager::class.java)
            m.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 5f, gpsListener)
            lm = m
            log("GPS 위치 사용")
        }.onFailure { log("GPS 실패: ${it.message}") }
    }

    fun stop() {
        runCatching { fused?.unregisterFusedLocationCallback(fusedListener); fused?.release() }
        lm?.removeUpdates(gpsListener)
    }

    companion object {
        /** 두 좌표 사이의 거리(미터). Haversine */
        fun haversineM(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
            val r = 6_371_000.0
            val dlat = Math.toRadians(lat2 - lat1)
            val dlng = Math.toRadians(lng2 - lng1)
            val a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dlng / 2) * Math.sin(dlng / 2)
            return r * 2 * Math.asin(Math.sqrt(a))
        }
    }
}
