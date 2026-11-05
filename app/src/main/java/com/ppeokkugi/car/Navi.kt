package com.ppeokkugi.car

import ai.pleos.playground.navi.constants.NaviErrorCode
import ai.pleos.playground.navi.constants.RouteOption
import ai.pleos.playground.navi.constants.TurnType
import ai.pleos.playground.navi.constants.WaypointIndex
import ai.pleos.playground.navi.data.CameraAlert
import ai.pleos.playground.navi.data.CautionPoint
import ai.pleos.playground.navi.data.DestinationArrivedInfo
import ai.pleos.playground.navi.data.DestinationInfo
import ai.pleos.playground.navi.data.RequestWaypointInfo
import ai.pleos.playground.navi.data.RouteInfo
import ai.pleos.playground.navi.data.RouteStartInfo
import ai.pleos.playground.navi.data.RouteWithWaypointsRequest
import ai.pleos.playground.navi.data.TBTInfo
import ai.pleos.playground.navi.data.WaypointArrivedInfo
import ai.pleos.playground.navi.data.WaypointInfo
import ai.pleos.playground.navi.helper.NaviHelper
import ai.pleos.playground.navi.helper.listener.NaviHelperEventListener
import android.content.Context

/** 차량 내비게이션에 경로를 걸고 도착·ETA·TBT·주의 구간·카메라 정보를 받는다. */
class Navi(context: Context, private val emit: (CarEvent) -> Unit, private val log: (String) -> Unit) {
    private val helper = runCatching { NaviHelper(context.applicationContext) }.getOrNull()
    var ready = false; private set
    private var dest: DestinationInfo? = null
    private var waypoints = emptyList<Waypoint>()

    fun start() {
        val h = helper ?: return log("NaviHelper 없음")
        runCatching {
            h.initialize(
                onConnected = {
                    h.addListener(listener)
                    ready = true
                    // 앱보다 먼저 걸어 둔 목적지도 알아야 경유지를 붙일 수 있다
                    h.getDestinationInfo(); h.getWaypointInfo()
                    log("NaviHelper 연결")
                },
                onFailed = { log("NaviHelper 연결 실패: ${it.message}") },
            )
        }.onFailure { log("NaviHelper 실패: ${it.message}") }
    }

    /**
     * 경유지 하나를 경로 맨 앞에 넣는다. 경유지가 목적지와 겹치면 내비가 Invalid Parameter 로 거절하므로
     * 겹치면 넣지 않고, 아니면 목적지+경유지로 다시 찾는다. 목적지를 모르면 그 지점을 목적지로 찾는다.
     */
    fun addWaypoint(lat: Double, lng: Double, name: String) {
        if (!ready) return
        val d = dest ?: return routeWithWaypoints(lat, lng, name)
        fun nearDest(la: Double, ln: Double) = Locator.haversineM(la, ln, d.latitude, d.longitude) < SAME_PLACE_M
        if (nearDest(lat, lng)) return log("경유지 $name 이(가) 목적지와 같아 넣지 않음")
        val rest = waypoints.filter { it.name != name && !nearDest(it.lat, it.lng) }.map { Triple(it.lat, it.lng, it.name) }
        routeWithWaypoints(d.latitude, d.longitude, d.name, listOf(Triple(lat, lng, name)) + rest)
    }

    /** 목적지와 경유지 목록으로 경로를 탐색한다. 경유지는 최대 2곳 */
    fun routeWithWaypoints(
        destLat: Double, destLng: Double, destName: String,
        waypoints: List<Triple<Double, Double, String>> = emptyList(),
    ) {
        if (!ready) return
        val dest = RouteInfo(latitude = destLat, longitude = destLng, poiName = destName, poiId = "", address = destName, poiSubId = "0", routeOption = RouteOption.RECOMMENDED)
        val wps = waypoints.take(2).mapIndexed { i, (lat, lng, name) ->
            RequestWaypointInfo(lat, lng, name, if (i == 0) WaypointIndex.FIRST else WaypointIndex.SECOND, "", name, "0")
        }
        helper?.requestRouteWithWaypoints(RouteWithWaypointsRequest(dest, wps))
    }

    private val listener = object : NaviHelperEventListener {
        override fun onRoutingCompleted() { helper?.getWaypointInfo(); helper?.getDestinationInfo() }
        // 내비가 onRoutingCompleted 없이 onRouteStarted 만 줄 때가 있다
        override fun onRouteStarted(routeStartInfo: RouteStartInfo) { helper?.getWaypointInfo(); helper?.getDestinationInfo() }
        override fun onRouteCancelled() { dest = null; waypoints = emptyList() }
        override fun onDestinationInfo(destinationInfo: DestinationInfo) {
            // 탐색이 실패하거나 취소되면 (0, 0) 빈 목적지가 온다. 이걸 대장 콜로 내보내면 일행 내비가 모두 오류를 낸다
            if (destinationInfo.latitude == 0.0 && destinationInfo.longitude == 0.0) { dest = null; return }
            dest = destinationInfo
            emit(CarEvent.NaviEta(destinationInfo.remainTime))
            emitRoute()
        }
        // 경유지 응답이 목적지보다 늦게 올 수 있어 양쪽에서 경로를 다시 낸다
        override fun onWayPointInfo(waypointInfoList: List<WaypointInfo>) {
            waypoints = waypointInfoList.map { Waypoint(it.latitude, it.longitude, it.name) }
            emitRoute()
        }
        override fun onDestinationArrived(destinationArrivedInfo: DestinationArrivedInfo) =
            emit(CarEvent.NaviArrived(destinationArrivedInfo.duration, destinationArrivedInfo.distance))
        override fun onWayPointArrived(waypointArrivedInfo: WaypointArrivedInfo) = emit(CarEvent.WaypointArrived(waypointArrivedInfo.name))
        override fun onCurrentRoadSpeedLimit(speedLimit: Int) { if (speedLimit > 0) emit(CarEvent.SpeedLimit(speedLimit)) }
        override fun onCameraAlert(cameraAlertList: List<CameraAlert>) = cameraAlertList.forEach { emit(CarEvent.Camera(it.id)) }
        override fun onCautionPointInfo(cautionPointList: List<CautionPoint>) =
            cautionPointList.forEach { emit(CarEvent.CautionPoint(it.id, it.remainDistance)) }
        /** 다음 회전 안내. 첫 번째 항목만 전달한다 */
        override fun onTBTInfo(tbtInfoList: List<TBTInfo>) {
            tbtInfoList.firstOrNull()?.let {
                emit(CarEvent.TbtInfo(it.type, it.distance, it.description))
            }
        }
        override fun onError(errorCode: NaviErrorCode) = log("내비 오류 $errorCode")
    }

    private fun emitRoute() {
        val d = dest ?: return
        emit(CarEvent.NaviRoute(d.latitude, d.longitude, d.name, waypoints))
    }

    private companion object { const val SAME_PLACE_M = 300.0 }

    fun stop() {
        runCatching { helper?.removeListener(listener); helper?.release() }
    }
}
