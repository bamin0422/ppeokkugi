package com.ppeokkugi.car

import ai.pleos.playground.navi.constants.TurnType
import ai.pleos.playground.vehicle.api.model.area.SeatArea
import ai.pleos.playground.vehicle.constant.area.SeatValue

/** 차량·내비·위치에서 들어오는 신호. 실제 차량 연결부와 데모 주행이 같은 이벤트를 보낸다. */
sealed interface CarEvent {
    data class Location(val lat: Double, val lng: Double, val atMillis: Long? = null) : CarEvent
    /** 연속 위치 델타로 계산한 속도 */
    data class Speed(val kmh: Double) : CarEvent
    data class Range(val meters: Double) : CarEvent
    /** 플랫폼 CarUxRestrictions 가 주행 중 제약을 요구하는지 */
    data class Driving(val restricted: Boolean) : CarEvent
    data class Gear(val park: Boolean, val reverse: Boolean) : CarEvent
    /** 방향지시등. OFF·LEFT·RIGHT 세 상태 */
    data class TurnSignal(val state: TurnSignalState) : CarEvent
    data class Wiper(val on: Boolean) : CarEvent
    data class Brake(val pressed: Boolean) : CarEvent
    /** occupied: 좌석별 착석. 점호(roll)에 쓴다 */
    data class Passengers(val count: Int, val occupied: Map<SeatValue, Boolean> = emptyMap()) : CarEvent
    /** 안전벨트 미착용 경고. seat 별로 온다 */
    data class SeatBelt(val seat: SeatArea, val warning: Boolean) : CarEvent
    /** 에어백 전개. seat 별로 온다 */
    data class AirbagDeployed(val seat: SeatArea) : CarEvent
    data class Camera(val id: String) : CarEvent
    data class CautionPoint(val id: String, val remainM: Int? = null) : CarEvent
    /** 내비 다음 회전 안내 */
    data class TbtInfo(val type: TurnType, val distanceM: Double, val description: String) : CarEvent
    data class NaviEta(val sec: Int) : CarEvent
    data class NaviArrived(val durationSec: Int, val distanceM: Int) : CarEvent
    data class WaypointArrived(val name: String) : CarEvent
    data class SpeedLimit(val kmh: Int) : CarEvent
    /** 내비에 걸린 목적지와 경유지. 선두면 대장 콜로 보낸다 */
    data class NaviRoute(val lat: Double, val lng: Double, val name: String, val waypoints: List<Waypoint>) : CarEvent
}

/** 방향지시등 상태 */
enum class TurnSignalState { OFF, LEFT, RIGHT }
