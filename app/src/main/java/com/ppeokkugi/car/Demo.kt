package com.ppeokkugi.car

import ai.pleos.playground.navi.constants.TurnType
import kotlinx.coroutines.delay

/** 간단한 경유지 */
data class Waypoint(val lat: Double, val lng: Double, val name: String)

/**
 * 에뮬레이터 시연용 가상 주행. 실제 차량 연결부와 같은 [CarEvent] 를 보낸다.
 * 경부고속도로 서울 요금소 → 안성 휴게소 구간(봇 경로와 같은 끝점)을 흉내 내며 방향지시등·브레이크·기어·와이퍼 신호를 낸다.
 */
class Demo(private val emit: (CarEvent) -> Unit) {

    /** [route] 의 각 경유지를 차례로 통과하며 신호를 낸다 */
    suspend fun run(route: List<Waypoint> = DEMO_ROUTE) {
        var lat = route.first().lat
        var lng = route.first().lng
        emit(CarEvent.Gear(park = false, reverse = false))
        emit(CarEvent.Driving(true))
        emit(CarEvent.Wiper(false))

        route.drop(1).forEachIndexed { i, wp ->
            val legNs = distanceM(lat, lng, wp.lat, lng)
            val total = legNs + distanceM(wp.lat, lng, wp.lat, wp.lng)
            val steps = (total / STEP_M).toInt().coerceAtLeast(1)
            var signalled = false

            for (s in 1..steps) {
                val d = total * s / steps
                val la = if (d <= legNs) lat + (wp.lat - lat) * d / legNs.coerceAtLeast(1.0) else wp.lat
                val ln = if (d <= legNs) lng else lng + (wp.lng - lng) * (d - legNs) / (total - legNs).coerceAtLeast(1.0)
                val left = total - d

                emit(CarEvent.Location(la, ln))

                // 목적지 1km 안에서 간헐적 브레이크
                if (left < 1000 && s % 8 == 0) {
                    emit(CarEvent.Brake(true)); delay(200); emit(CarEvent.Brake(false))
                }
                // 와이퍼: 두 번째 구간은 비 흉내
                if (i == 1 && s == 5) emit(CarEvent.Wiper(true))
                if (i == 1 && s == steps - 10) emit(CarEvent.Wiper(false))
                // 도착 300m 앞에서 방향지시등
                if (!signalled && left < 300) {
                    signalled = true
                    val dir = if (i % 2 == 0) TurnSignalState.RIGHT else TurnSignalState.LEFT
                    // 회전 콜은 같은 방향 내비 안내가 있어야 나가므로 안내도 함께 흉내 낸다
                    emit(CarEvent.TbtInfo(if (dir == TurnSignalState.RIGHT) TurnType.TURN_RIGHT else TurnType.TURN_LEFT, left, "데모 ${wp.name}"))
                    emit(CarEvent.TurnSignal(dir))
                    delay(2000L)
                    emit(CarEvent.TurnSignal(TurnSignalState.OFF))
                }
                delay(TICK_MS)
            }
            lat = wp.lat; lng = wp.lng
        }

        // 목적지 도착
        emit(CarEvent.Gear(park = true, reverse = false))
        emit(CarEvent.Driving(false))
    }

    companion object {
        const val STEP_M = 100.0
        const val TICK_MS = 80L

        /** 경부고속도로 서울 요금소 → 기흥 → 오산 → 안성 휴게소. 끝점은 server/src/data.js 와 같다 */
        val DEMO_ROUTE = listOf(
            Waypoint(37.454, 127.043, "서울 요금소"),
            Waypoint(37.272, 127.114, "기흥 휴게소"),
            Waypoint(37.148, 127.069, "오산"),
            Waypoint(37.014, 127.280, "안성 휴게소"),
        )

        private fun distanceM(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
            val dlat = Math.toRadians(lat2 - lat1)
            val dlng = Math.toRadians(lng2 - lng1)
            val a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dlng / 2) * Math.sin(dlng / 2)
            return 6_371_000 * 2 * Math.asin(Math.sqrt(a))
        }
    }
}
