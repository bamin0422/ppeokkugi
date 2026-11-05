package com.ppeokkugi.car

import ai.pleos.playground.vehicle.Vehicle
import ai.pleos.playground.vehicle.api.model.area.SeatArea
import ai.pleos.playground.vehicle.api.model.area.WindowArea
import ai.pleos.playground.vehicle.constant.area.SeatValue
import ai.pleos.playground.vehicle.constant.area.TurnSignalValue
import ai.pleos.playground.vehicle.constant.area.WindowValue
import ai.pleos.playground.vehicle.constant.control.LightState
import ai.pleos.playground.vehicle.constant.control.WiperState
import ai.pleos.playground.vehicle.listener.BrakePedalStatusListener
import ai.pleos.playground.vehicle.listener.LightStateListener
import ai.pleos.playground.vehicle.listener.SeatAirbagDeployedListener
import ai.pleos.playground.vehicle.listener.SeatBeltNotBuckledWarningListener
import ai.pleos.playground.vehicle.listener.SeatOccupancyListener
import ai.pleos.playground.vehicle.listener.TurnSignalStateListener
import ai.pleos.playground.vehicle.listener.WiperStateListener
import android.car.Car
import android.car.VehicleGear
import android.car.VehiclePropertyIds
import android.car.drivingstate.CarUxRestrictionsManager
import android.car.hardware.CarPropertyValue
import android.car.hardware.property.CarPropertyManager
import android.content.Context

/**
 * 주행·정차 판정은 플랫폼 CarUxRestrictions, 기어는 GEAR_SELECTION,
 * 나머지 신호는 Pleos Vehicle SDK 에서 받는다.
 * 지원하지 않는 속성은 runCatching 으로 조용히 실패하고 로그에 남긴다.
 */
class CarBridge(
    private val context: Context,
    private val emit: (CarEvent) -> Unit,
    private val log: (String) -> Unit,
) {
    private var car: Car? = null
    private var vehicle: Vehicle? = null
    var platformAvailable = false; private set
    /** 앰비언트 색을 지원하는 좌석. capability 조회 뒤 첫 좌석으로 바꾼다 */
    private var ambientSeat = SeatArea(SeatValue.ROW_1_LEFT)

    fun start() {
        startPlatform()
        startVehicle()
    }

    fun stop() {
        runCatching { vehicle?.release() }
        runCatching { car?.disconnect() }
    }

    private fun startPlatform() = runCatching {
        car = Car.createCar(context, null, Car.CAR_WAIT_TIMEOUT_DO_NOT_WAIT) { c, ready ->
            if (ready) registerPlatform(c) else { platformAvailable = false; log("차량 플랫폼 끊김, 재연결 대기") }
        }
    }.onFailure { log("차량 플랫폼 없음: ${it.message ?: it.javaClass.simpleName}") }

    private fun registerPlatform(c: Car) = runCatching {
        val ux = c.getCarManager(Car.CAR_UX_RESTRICTION_SERVICE) as CarUxRestrictionsManager
        ux.registerListener { emit(CarEvent.Driving(it.isRequiresDistractionOptimization)) }
        emit(CarEvent.Driving(ux.currentCarUxRestrictions.isRequiresDistractionOptimization))
        val props = c.getCarManager(Car.PROPERTY_SERVICE) as CarPropertyManager
        props.registerCallback(object : CarPropertyManager.CarPropertyEventCallback {
            override fun onChangeEvent(value: CarPropertyValue<*>) {
                val gear = value.value as? Int ?: return
                emit(CarEvent.Gear(park = gear == VehicleGear.GEAR_PARK, reverse = gear == VehicleGear.GEAR_REVERSE))
            }
            override fun onErrorEvent(propertyId: Int, zone: Int) = log("기어 신호 오류 $propertyId")
        }, VehiclePropertyIds.GEAR_SELECTION, CarPropertyManager.SENSOR_RATE_ONCHANGE)
        runCatching {
            props.registerCallback(object : CarPropertyManager.CarPropertyEventCallback {
                override fun onChangeEvent(value: CarPropertyValue<*>) {
                    (value.value as? Float)?.let { emit(CarEvent.Range(it.toDouble())) }
                }
                override fun onErrorEvent(propertyId: Int, zone: Int) = Unit
            }, VehiclePropertyIds.RANGE_REMAINING, CarPropertyManager.SENSOR_RATE_ONCHANGE)
        }.onFailure { log("주행가능거리 신호 없음: ${it.message}") }
        platformAvailable = true
        log("차량 플랫폼 연결")
    }.onFailure { log("차량 플랫폼 없음: ${it.message ?: it.javaClass.simpleName}") }

    private fun startVehicle() = runCatching {
        val v = Vehicle(context.applicationContext)
        v.initialize()
        vehicle = v

        // 방향지시등: LEFT·RIGHT·OFF 모두 처리
        v.getTurnSignal().registerTurnSignalState(object : TurnSignalStateListener {
            override fun onTurnSignalStateUpdated(state: TurnSignalValue?) {
                val s = when (state) {
                    TurnSignalValue.LEFT -> TurnSignalState.LEFT
                    TurnSignalValue.RIGHT -> TurnSignalState.RIGHT
                    else -> TurnSignalState.OFF
                }
                emit(CarEvent.TurnSignal(s))
            }
            override fun onFailed(e: Exception) = log("방향지시등: ${e.message}")
        })

        v.getWiper().registerWiperState(WindowArea(WindowValue.FRONT_WINDSHIELD), object : WiperStateListener {
            override fun onWiperStateUpdated(state: WiperState?) { emit(CarEvent.Wiper(state == WiperState.ON)) }
            override fun onFailed(e: Exception) = log("와이퍼: ${e.message}")
        })

        startCabin(v)
        probeSafetyCapabilities(v)
        probeAmbientLight(v)
        log("Vehicle SDK 연결")
    }.onFailure { log("Vehicle SDK 실패: ${it.message ?: it.javaClass.simpleName}") }

    /** 브레이크, 좌석 점유, 안전벨트, 에어백 */
    private fun startCabin(v: Vehicle) {
        // 브레이크
        runCatching {
            v.getBrake().registerBrakePedalStatus(object : BrakePedalStatusListener {
                override fun onBrakePedalStatusUpdated(pressed: Boolean?) { pressed?.let { emit(CarEvent.Brake(it)) } }
                override fun onFailed(e: Exception) = log("브레이크: ${e.message}")
            })
        }.onFailure { log("브레이크 신호 없음: ${it.message}") }

        // 좌석 점유
        val seats = mutableMapOf<SeatValue, Boolean>()
        ALL_SEATS.forEach { seat ->
            runCatching {
                v.getSeat().registerSeatOccupancy(SeatArea(seat), object : SeatOccupancyListener {
                    override fun onSeatOccupancyUpdated(occupied: Boolean?) {
                        seats[seat] = occupied == true
                        emit(CarEvent.Passengers(seats.values.count { it }, seats.toMap()))
                    }
                    override fun onFailed(e: Exception) = log("좌석 $seat 점유: ${e.message}")
                })
            }.onFailure { log("좌석 점유 없음: ${it.message}") }
        }

        // 안전벨트 미착용 경고: 좌석별
        ALL_SEATS.forEach { seat ->
            runCatching {
                v.getSafety().registerSeatBeltNotBuckledWarning(SeatArea(seat), object : SeatBeltNotBuckledWarningListener {
                    override fun onSeatBeltNotBuckledWarningUpdated(warning: Boolean?) {
                        emit(CarEvent.SeatBelt(SeatArea(seat), warning == true))
                    }
                    override fun onFailed(e: Exception) = log("안전벨트 $seat: ${e.message}")
                })
            }.onFailure { log("안전벨트 신호 없음($seat): ${it.message}") }
        }

        // 에어백 전개: 좌석별
        ALL_SEATS.forEach { seat ->
            runCatching {
                v.getSafety().registerSeatAirbagDeployed(SeatArea(seat), object : SeatAirbagDeployedListener {
                    override fun onSeatAirbagDeployUpdated(deployed: Boolean?) {
                        if (deployed == true) emit(CarEvent.AirbagDeployed(SeatArea(seat)))
                    }
                    override fun onFailed(e: Exception) = log("에어백 $seat: ${e.message}")
                })
            }.onFailure { log("에어백 신호 없음($seat): ${it.message}") }
        }
    }

    /** 안전벨트·에어백 지원 좌석 목록을 로그에 남긴다 */
    private fun probeSafetyCapabilities(v: Vehicle) {
        runCatching {
            v.getSafety().checkSeatBuckledCapabilities(
                { seats -> log("안전벨트 지원 좌석: $seats") },
                { e -> log("안전벨트 capability 조회 실패: ${e.message}") },
            )
        }.onFailure { log("안전벨트 capability 없음: ${it.message}") }

        runCatching {
            v.getSafety().checkAirbagDeployedCapabilities(
                { _, seats -> log("에어백 전개 지원 좌석: $seats") },
                { e -> log("에어백 capability 조회 실패: ${e.message}") },
            )
        }.onFailure { log("에어백 capability 없음: ${it.message}") }
    }

    /** 앰비언트 조명 색 지원 좌석을 로그에 남긴다 */
    private fun probeAmbientLight(v: Vehicle) {
        runCatching {
            v.getLight().checkAmbientLightBrightnessColorCapabilities(
                { _, seats -> log("앰비언트 색 지원 좌석: $seats"); seats.firstOrNull()?.let { ambientSeat = it } },
                { e -> log("앰비언트 색 capability 조회 실패: ${e.message}") },
            )
        }.onFailure { log("앰비언트 색 capability 없음: ${it.message}") }
    }

    /** 깃발 색을 앰비언트 조명에 켠다. rgb 는 0xRRGGBB. quiet 면 성공 로그를 남기지 않는다(깜빡임용) */
    fun setAmbientColor(rgb: Int, quiet: Boolean = false) {
        val v = vehicle ?: return log("앰비언트 색: Vehicle 없음")
        runCatching {
            v.getLight().setAmbientLightBrightnessColor(
                ambientSeat, rgb,
                { area, c -> if (!quiet) log("앰비언트 색 설정 성공: $area #${"%06X".format(c)}") },
                { e -> log("앰비언트 색 설정 실패: ${e.message}") },
            )
        }.onFailure { log("앰비언트 색 설정 예외: ${it.message}") }
    }

    companion object {
        val ALL_SEATS = listOf(
            SeatValue.ROW_1_LEFT, SeatValue.ROW_1_RIGHT,
            SeatValue.ROW_2_LEFT, SeatValue.ROW_2_RIGHT,
        )
    }
}
