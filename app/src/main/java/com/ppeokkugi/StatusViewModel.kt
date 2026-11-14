package com.ppeokkugi

import ai.pleos.playground.vehicle.constant.area.SeatValue
import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.ppeokkugi.car.CarBridge
import com.ppeokkugi.car.CarEvent
import com.ppeokkugi.car.Demo
import com.ppeokkugi.car.Locator
import com.ppeokkugi.car.Navi
import com.ppeokkugi.car.TurnSignalState
import com.ppeokkugi.domain.AutoCall
import com.ppeokkugi.domain.Outgoing
import com.ppeokkugi.domain.Phrase
import com.ppeokkugi.net.Link
import com.ppeokkugi.net.RoomClient
import com.ppeokkugi.net.RoomMsg
import com.ppeokkugi.voice.Voice
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

data class SdkState(
    val platform: Boolean = false,
    val navi: Boolean = false,
    val location: Boolean = false,
    val tts: Boolean = false,
    val stt: Boolean = false,
)

/**
 * 카드에 띄울 마스코트 표정. 그림은 drawable-nodpi/cuckoo_<이름>_0.png(design/character 의 3D 뻐꾸기, 512px 투명 PNG).
 * 제 그림이 없는 표정은 [fallback] 의 그림을 쓴다(ui/Cuckoo.kt)
 */
enum class Mood {
    BASE, TALK, ALERT, REST, ROLLCALL, KIDS,
    TX, RX, BRAKE, RAIN, CAMERA, LOST, VOTE, ARRIVE, EMERGENCY, WAIT;

    val fallback: Mood get() = when (this) {
        TX -> TALK
        WAIT, RAIN -> BASE
        BRAKE, CAMERA, LOST, EMERGENCY -> ALERT
        else -> this
    }

    /** 옅은 빨강 경고 카드와 빨간 글자로 띄울 표정 */
    val alert: Boolean get() = this == ALERT || this == BRAKE || this == EMERGENCY || this == LOST
}

data class CarInfo(val label: String, val num: Int, val nickname: String, val color: Long, val me: Boolean, val lat: Double? = null, val lng: Double? = null, val speed: Double = 0.0)
data class Radio(val id: Long, val from: String, val text: String, val channel: String, val mood: Mood, val at: Long)
/** 긴급 콜(에어백) 전체 화면 알림 */
data class Emergency(val from: String, val text: String, val lat: Double?, val lng: Double?, val at: Long)
/** 지도에 잠시 꽂는 이슈 핀. kind 는 signal kind 또는 fall_behind(대열 이탈) */
data class Pin(val kind: String, val from: String, val lat: Double, val lng: Double, val at: Long)
data class VoteUi(val candidates: List<RoomMsg.Candidate>, val deadline: Long, val myChoice: Int? = null)

data class RoomState(
    val code: String? = null,
    val link: Link = Link.OFF,
    val me: Int? = null,
    val cars: List<CarInfo> = emptyList(),
    val radios: List<Radio> = emptyList(),
    val vote: VoteUi? = null,
    /** 호차 → 점호 한 줄 */
    val rolls: Map<String, String> = emptyMap(),
    val driving: Boolean = false,
    val listening: Boolean = false,
    val heard: String = "",
    val busy: Boolean = false,
    /** 서버가 정한 우리 차 깃발 색 */
    val myColor: Long? = null,
    val emergency: Emergency? = null,
    /** 도착 깜빡임을 시작한 시각. 화면 깃발 띠도 이 값으로 깜빡인다 */
    val blinkAt: Long = 0,
    /** 시연 모드: 방을 만들고 봇이 들어오면 데모 주행을 시작한다 */
    val demo: Boolean = false,
    /** 이슈 핀. PIN_TTL_MS 가 지나면 지도에서 빠진다 */
    val pins: List<Pin> = emptyList(),
)

/** 좌석 채널 설정. zone 은 TTS setAudioZoneId 값 */
data class Seats(
    val channel: String = "all",
    val seat: String = "passenger",
    val guideZone: Int = 0,
    val adultZone: Int = 1,
    val kidsZone: Int = 2,
    /** 오디오 존이 좌석별로 나뉘는지 확인하지 못했으므로 기본으로 채널 이름을 앞에 붙인다(§6.3 대안) */
    val prefixChannel: Boolean = true,
)

class StatusViewModel(app: Application) : AndroidViewModel(app) {

    private val _logs = MutableStateFlow<List<String>>(emptyList())
    val logs = _logs.asStateFlow()

    private val _sdk = MutableStateFlow(SdkState())
    val sdk = _sdk.asStateFlow()

    private val _demoRunning = MutableStateFlow(false)
    val demoRunning = _demoRunning.asStateFlow()

    private val _room = MutableStateFlow(RoomState())
    val room = _room.asStateFlow()

    private val _seats = MutableStateFlow(Seats())
    val seats = _seats.asStateFlow()

    private val log: (String) -> Unit = { msg ->
        android.util.Log.d("Ppeokkugi", msg)
        _logs.update { (listOf(msg) + it).take(200) }
    }

    private val bridge = CarBridge(app, ::onCarEventAnyThread, log)
    // 데모 주행 중과 시연 모드에서는 실제 위치를 무시한다. 데모가 끝난 뒤에도 도착 지점에 머물러야 도착 판정이 된다
    private val locator = Locator(app, { if (!_demoRunning.value && !_room.value.demo) onCarEventAnyThread(it) }, log)
    private val navi = Navi(app, ::onCarEventAnyThread, log)
    val voice = Voice(app, log)
    private val demo = Demo(::onCarEventAnyThread)
    private val client = RoomClient(BuildConfig.SYNC_URL, ::onRoomMsg, { l -> _room.update { it.copy(link = l) } }, log)
    private val auto = AutoCall()

    private var myLat: Double? = null
    private var myLng: Double? = null
    private var mySpeed = 0.0
    private var occupied: Map<SeatValue, Boolean> = emptyMap()
    private val beltWarn = mutableMapOf<SeatValue, Boolean>()
    private var driveSeen = false
    private var rollSent = false
    private var lastRejoinAt = 0L
    /** 기어 P 여부. 모르면 null 이고 pos 에 넣지 않는다 */
    private var parked: Boolean? = null
    private var naviRoute: CarEvent.NaviRoute? = null
    private var sharedRoute: CarEvent.NaviRoute? = null
    /** 일행이 함께 가는 목적지. 선두는 보낸 대장 콜, 뒤차는 받은 대장 콜 */
    private var groupDest: Pair<Double, Double>? = null
    /** 마지막으로 따른 대장 콜. 서버는 입장·재접속 때 마지막 대장 콜을 다시 보내므로 같은 것은 건너뛴다 */
    private var lastRoute: RoomMsg.Route? = null
    /** 시연 모드 데모 주행은 방마다 한 번만 */
    private var demoStarted = false
    private var radioId = 0L

    init {
        bridge.start()
        navi.start()
        voice.start()
        // SDK 상태를 1초 주기로 갱신
        viewModelScope.launch {
            while (true) {
                _sdk.value = SdkState(
                    platform = bridge.platformAvailable,
                    navi = navi.ready,
                    tts = voice.ttsReady,
                    stt = voice.sttReady,
                    location = myLat != null,
                )
                delay(1000)
            }
        }
        // 위치는 2초마다 보낸다
        viewModelScope.launch {
            while (true) {
                delay(2000)
                val lat = myLat ?: continue
                val lng = myLng ?: continue
                if (_room.value.link != Link.ON) continue
                client.send(JSONObject().put("type", "pos").put("lat", lat).put("lng", lng).put("heading", 0).put("speed", mySpeed).apply {
                    parked?.let { put("park", it) }
                    // 일행 목적지로 안내 중이면 경로상 남은 거리를 함께 보낸다. 서버가 앞·뒤를 이 값으로 가린다
                    groupDest?.let { (dLat, dLng) -> navi.remainTo(dLat, dLng) }?.let { put("remainM", it) }
                })
                _room.value.me?.let { n -> upsertCar(label(n)) { it.copy(lat = lat, lng = lng, speed = mySpeed) } }
            }
        }
    }

    /** 위치는 권한 요청이 끝난 뒤에 시작한다. Pleos FusedLocation 도 런타임 권한이 필요하다 */
    fun startLocation(hasGps: Boolean) {
        locator.stop()
        locator.start(hasGps)
    }

    // --- 차량 신호 → 자동 콜 ---

    /** SDK 콜백은 아무 스레드에서나 오므로 메인으로 옮겨 상태를 한 곳에서만 바꾼다 */
    private fun onCarEventAnyThread(event: CarEvent) {
        viewModelScope.launch(Dispatchers.Main.immediate) { onCarEvent(event) }
    }

    private fun onCarEvent(event: CarEvent) {
        if (event !is CarEvent.Location && event !is CarEvent.Speed) log("[CarEvent] $event")
        val t = System.currentTimeMillis()
        val out: Outgoing? = when (event) {
            is CarEvent.Location -> { myLat = event.lat; myLng = event.lng; null }
            is CarEvent.Speed -> { mySpeed = event.kmh; auto.speed(event.kmh, t) }
            is CarEvent.Brake -> auto.brake(event.pressed, t)
            is CarEvent.Wiper -> auto.wiper(event.on, t)
            is CarEvent.TbtInfo -> {
                val n = event.type.name
                val dir = when {
                    n == "TURN_UTURN" -> null
                    n.endsWith("_R") || n == "TURN_RIGHT" -> TurnSignalState.RIGHT
                    n.endsWith("_L") || n == "TURN_LEFT" -> TurnSignalState.LEFT
                    else -> null
                }
                auto.tbt(dir, event.distanceM); null
            }
            is CarEvent.TurnSignal -> auto.turnSignal(event.state).also {
                if (it == null && event.state != TurnSignalState.OFF) log("회전 콜 보류: 선두 아님 또는 500m 안 같은 방향 안내 없음")
            }
            is CarEvent.SpeedLimit -> auto.speedLimit(event.kmh)
            is CarEvent.CautionPoint -> auto.caution(event.id, event.remainM)
            is CarEvent.AirbagDeployed -> auto.airbag(t)
            is CarEvent.Driving -> { _room.update { it.copy(driving = event.restricted) }; null }
            is CarEvent.Passengers -> { occupied = event.occupied; null }
            is CarEvent.SeatBelt -> { event.seat.values.forEach { beltWarn[it] = event.warning }; null }
            is CarEvent.Gear -> {
                parked = event.park
                if (!event.park && !event.reverse) { driveSeen = true; maybeSendRoll() }
                null
            }
            is CarEvent.NaviRoute -> {
                naviRoute = event
                // 선두의 경로가 바뀌면 바로 대장 콜을 보낸다
                if (auto.leader && event != sharedRoute) shareRoute()
                null
            }
            // 단속 카메라는 일행에게 공유하지 않는다(§6.1)
            else -> null
        }
        out?.let(::sendSignal)
    }

    private fun sendSignal(o: Outgoing) {
        val msg = JSONObject().put("type", "signal").put("kind", o.kind)
        myLat?.let { msg.put("lat", it) }
        myLng?.let { msg.put("lng", it) }
        o.value?.let { msg.put("value", it) }
        o.distanceM?.let { msg.put("distanceM", it) }
        val ok = client.send(msg)
        log("자동 콜 ${o.kind} ${if (ok) "보냄" else "못 보냄(방 연결 없음)"}")
        // 우리 차가 낸 콜도 우리 지도에 꽂는다
        val me = _room.value.me
        if (ok && me != null && myLat != null && myLng != null) addPin(o.kind, label(me), myLat!!, myLng!!)
    }

    /** 기어가 처음 D 로 바뀌면 좌석별 착석·벨트를 보낸다. 벨트 신호가 없으면 buckled=null */
    private fun maybeSendRoll() {
        if (rollSent || !driveSeen || _room.value.link != Link.ON) return
        val seats = JSONArray()
        SEAT_IDS.forEach { (v, id) ->
            val occ = occupied[v] ?: (v == SeatValue.ROW_1_LEFT) // 착석 신호가 없으면 운전석만 앉은 것으로 본다
            seats.put(JSONObject().put("id", id).put("occupied", occ).put("buckled", beltWarn[v]?.let { !it } ?: JSONObject.NULL))
        }
        rollSent = client.send(JSONObject().put("type", "roll").put("seats", seats))
        log("점호 ${if (rollSent) "보냄" else "못 보냄"}: $seats")
    }

    // --- 대장 콜 ---

    /** 선두의 내비 경로를 일행에게 보낸다. 내비에 경로가 없으면 시연 목적지(안성 휴게소)를 보낸다 */
    fun shareRoute() {
        if (!auto.leader) return
        val r = naviRoute ?: CarEvent.NaviRoute(37.014, 127.280, "안성 휴게소", emptyList()).also { log("내비 경로 없음, 시연 목적지로 공유") }
        fun place(lat: Double, lng: Double, name: String) = JSONObject().put("lat", lat).put("lng", lng).put("name", name)
        val msg = JSONObject().put("type", "route").put("dest", place(r.lat, r.lng, r.name))
            .put("waypoints", JSONArray().apply { r.waypoints.take(2).forEach { put(place(it.lat, it.lng, it.name)) } })
        if (client.send(msg)) {
            sharedRoute = r
            groupDest = r.lat to r.lng
            addRadio("대장 콜", "${r.name}(으)로 가는 경로를 일행에게 보냈습니다", "all", Mood.TX)
            log("대장 콜 보냄: $msg")
        } else log("대장 콜 못 보냄(방 연결 없음)")
    }

    // --- 긴급 콜·깃발 색 (디버그 메뉴에서도 부른다) ---

    /** 에뮬레이터는 에어백 속성을 지원하지 않으므로 디버그 메뉴에서 전개 신호를 흉내 낸다 */
    fun injectAirbag() {
        log("디버그: 에어백 전개 주입")
        onCarEvent(CarEvent.AirbagDeployed(ai.pleos.playground.vehicle.api.model.area.SeatArea(SeatValue.ROW_1_LEFT)))
        addRadio("긴급 콜", "에어백 전개를 일행에게 알렸습니다", "all", Mood.EMERGENCY)
    }

    fun dismissEmergency() = _room.update { it.copy(emergency = null) }

    /** 깃발 색으로 앰비언트 조명을 세 번 깜빡인다 */
    fun blinkFlag() {
        val rgb = flagRgb()
        _room.update { it.copy(blinkAt = System.currentTimeMillis()) }
        viewModelScope.launch {
            repeat(3) {
                bridge.setAmbientColor(0, quiet = true); delay(400)
                bridge.setAmbientColor(rgb, quiet = true); delay(400)
            }
            log("앰비언트 깜빡임 3회 요청 (#${"%06X".format(rgb)})")
        }
    }

    private fun flagRgb(): Int = ((_room.value.myColor ?: FLAG[((_room.value.me ?: 1) - 1).mod(FLAG.size)]) and 0xFFFFFF).toInt()

    // --- 방 ---

    /** 시연 모드: 방을 만들고, 봇이 들어오면 데모 주행을 시작한다 */
    fun startDemoMode() {
        createRoom()
        _room.update { it.copy(demo = true) }
    }

    fun createRoom() {
        _room.update { it.copy(busy = true) }
        client.createRoom { code ->
            _room.update { it.copy(busy = false) }
            if (code == null) addRadio("뻐꾸기", "서버에 연결하지 못했습니다", "all", Mood.ALERT) else joinRoom(code)
        }
    }

    fun joinRoom(code: String) {
        val c = code.trim().uppercase()
        if (c.length !in 6..8) return
        rollSent = false
        sharedRoute = null
        groupDest = null
        lastRoute = null
        demoStarted = false
        _room.value = RoomState(code = c, driving = _room.value.driving, demo = _room.value.demo)
        val seats = JSONArray()
        SEAT_IDS.forEach { (v, id) -> seats.put(JSONObject().put("id", id).put("occupied", occupied[v] ?: (v == SeatValue.ROW_1_LEFT))) }
        client.join(c, JSONObject().put("nickname", "뻐꾸기 차").put("flagColor", JSONObject.NULL).put("seats", seats))
        log("방 $c 입장 시도 (${BuildConfig.SYNC_URL})")
        RoomService.start(getApplication(), c)
    }

    fun leaveRoom() {
        client.leave()
        RoomService.stop(getApplication())
        _room.value = RoomState(driving = _room.value.driving)
    }

    private fun label(n: Int) = "${n}호차"
    private fun numOf(label: String) = label.removeSuffix("호차").toIntOrNull()

    private fun upsertCar(label: String, f: (CarInfo) -> CarInfo) {
        val n = numOf(label) ?: return
        _room.update { s ->
            val cur = s.cars.find { it.label == label } ?: CarInfo(label, n, "", FLAG[(n - 1).mod(FLAG.size)], me = n == s.me)
            s.copy(cars = (s.cars.filter { it.label != label } + f(cur)).sortedBy { it.num })
        }
    }

    private fun onRoomMsg(m: RoomMsg) {
        val me = _room.value.me
        when (m) {
            is RoomMsg.Welcome -> {
                // 서버 깃발 색은 쓰지 않고 호차 번호로 정한다(휴대폰 화면과 같은 색)
                val color = FLAG[(m.carNum - 1).mod(FLAG.size)]
                // 재입장 토큰으로 같은 번호를 받지만, 서버가 방을 잊었으면 번호가 바뀌므로 예전 우리 차 줄을 지운다
                _room.update { st -> st.copy(me = m.carNum, myColor = color, cars = st.cars.filter { !it.me }) }
                auto.leader = m.carNum == 1
                upsertCar(m.carLabel) { it.copy(nickname = "우리 차", me = true, color = color) }
                m.cars.forEach(::onHello)
                log("${if (m.rejoined) "재접속" else "입장"}: ${m.carLabel}${if (auto.leader) " (선두)" else ""}")
                bridge.setAmbientColor(flagRgb())
                maybeSendRoll()
            }
            is RoomMsg.Hello -> {
                onHello(m)
                // 시연 모드에서는 봇이 들어오면 데모 주행을 시작한다
                if (_room.value.demo && !demoStarted) {
                    demoStarted = true
                    runDemo()
                    if (auto.leader && sharedRoute == null) shareRoute()
                }
            }
            is RoomMsg.Notice -> {
                val mood = when (m.kind) {
                    "fall_behind" -> Mood.LOST
                    "long_stop" -> Mood.ALERT
                    "place" -> Mood.ARRIVE
                    else -> Mood.BASE
                }
                addRadio("위치", m.text, "all", mood)
                // 처짐·다시 붙음은 차마다 마지막 것만 읽는다(한꺼번에 여러 줄이 와도 밀리지 않게)
                speak(m.text, "guide", m.target?.takeIf { m.kind == "fall_behind" || m.kind == "catch_up" }?.let { "formation:$it" })
                // 대열 이탈은 그 차 자리에 핀을 꽂는다
                if (m.kind == "fall_behind" && m.lat != null && m.lng != null) addPin(m.kind, m.target ?: "", m.lat, m.lng)
            }
            is RoomMsg.Pos -> upsertCar(m.from) { it.copy(lat = m.lat, lng = m.lng, speed = m.speed) }
            is RoomMsg.Leave -> _room.update { s -> s.copy(cars = s.cars.filter { it.label != m.from }) }
            is RoomMsg.Route -> {
                // 선두의 대장 콜만 따른다
                if (m.from != label(1) || me == 1) return
                if (m.dest.lat == 0.0 && m.dest.lng == 0.0) return log("빈 대장 콜 무시")
                if (m == lastRoute) return log("같은 대장 콜, 다시 찾지 않음")
                lastRoute = m
                groupDest = m.dest.lat to m.dest.lng
                if (!navi.ready) log("내비 미연결, 대장 콜 경로 못 넣음: ${m.dest.name}")
                else runCatching { navi.routeWithWaypoints(m.dest.lat, m.dest.lng, m.dest.name, m.waypoints.map { Triple(it.lat, it.lng, it.name) }) }
                    .onSuccess { log("대장 콜 재탐색 요청: ${m.dest.name} (${m.dest.lat}, ${m.dest.lng}) 경유 ${m.waypoints.size}곳") }
                    .onFailure { log("대장 콜 재탐색 실패: ${it.message}") }
                val text = "선두가 경로를 바꿨습니다. ${m.dest.name}(으)로 다시 찾습니다"
                addRadio("대장 콜", text, "all", Mood.RX)
                speak(text, "guide")
            }
            is RoomMsg.Arrive -> {
                val text = "일행 ${m.cars}대가 모두 도착했습니다. 깃발 색으로 깜빡입니다"
                addRadio("뻐꾸기", text, "all", Mood.ARRIVE)
                speak("일행이 모두 도착했습니다", "guide")
                blinkFlag()
            }
            is RoomMsg.Signal -> {
                val sender = numOf(m.from)
                val lat = m.lat ?: _room.value.cars.find { it.label == m.from }?.lat
                val lng = m.lng ?: _room.value.cars.find { it.label == m.from }?.lng
                // 서버가 받는 차 기준 거리·앞뒤를 붙여 준다. 서버가 우리 위치를 아직 모르면 여기서 잰다
                val dist = m.gapM ?: if (lat != null && lng != null && myLat != null && myLng != null) Locator.haversineM(myLat!!, myLng!!, lat, lng) else null
                val ahead = m.ahead ?: (sender != null && me != null && sender < me) // 서버 판정이 없을 때만 번호 규칙
                if (lat != null && lng != null) addPin(m.kind, m.from, lat, lng)
                val text = Phrase.signal(m.kind, m.from, dist, ahead, m.value, m.distanceM)
                val mood = when (m.kind) {
                    "brake_hard" -> Mood.BRAKE
                    "airbag" -> Mood.EMERGENCY
                    "rain" -> Mood.RAIN
                    "speed_limit", "caution" -> Mood.CAMERA
                    else -> Mood.RX
                }
                addRadio(m.from, text, "all", mood)
                if (m.kind == "airbag") {
                    _room.update { it.copy(emergency = Emergency(m.from, text, lat, lng, System.currentTimeMillis())) }
                    val at = if (lat != null && lng != null) ", 위치 북위 ${"%.3f".format(lat)}, 동경 ${"%.3f".format(lng)}" else ""
                    speak("$text$at. 안전한 곳에 차를 세우고 확인하십시오", "guide")
                } else speak(text, "guide")
            }
            is RoomMsg.Say -> if (m.system) {
                // 꼬리 콜 등 서버 안내는 선두에게만 온다
                addRadio("꼬리 콜", m.text, "all", Mood.ALERT)
                speak(m.text, "guide")
            } else {
                val mood = when {
                    m.channel == "kids" -> Mood.KIDS
                    me != null && m.from == label(me) -> Mood.TX // 내가 보낸 무전
                    else -> Mood.RX
                }
                val who = listOfNotNull(m.from.takeIf { it != "server" } ?: "뻐꾸기", m.speaker?.takeIf { it.isNotBlank() } ?: m.seat?.let { SEAT_NAME[it] }).joinToString(" ")
                addRadio(who, m.text, m.channel, mood)
                // 내가 보낸 무전은 다시 읽지 않는다
                if (me == null || m.from != label(me)) speak("${m.from.takeIf { it != "server" } ?: "뻐꾸기"}, ${Phrase.shorten(m.text)}", m.channel)
            }
            is RoomMsg.Roll -> {
                val line = rollLine(m.from, m.seats)
                _room.update { it.copy(rolls = it.rolls + (m.from to line)) }
                addRadio(m.from, "점호: $line", "all", Mood.ROLLCALL)
                if (auto.leader) speak(line, "guide")
            }
            is RoomMsg.VoteOpen -> {
                _room.update { it.copy(vote = VoteUi(m.candidates, System.currentTimeMillis() + m.timeoutMs)) }
                val list = m.candidates.mapIndexed { i, c -> "${i + 1}번 ${c.name}" }.joinToString(", ")
                addRadio("쉬어 가", "투표를 엽니다. $list", "all", Mood.VOTE)
                speak("쉬어 가 투표. $list. 번호를 말하거나 누르세요", "guide")
            }
            is RoomMsg.VoteResult -> {
                _room.update { it.copy(vote = null) }
                val w = m.winner
                val text = "${w.name}, 총 ${m.totalPeople}명"
                if (w.lat != null && w.lng != null) addWaypoint(w.lat, w.lng, w.name)
                addRadio("쉬어 가", "$text · 경유지로 넣었습니다", "all", Mood.REST)
                speak(text, "guide")
            }
            is RoomMsg.Rejoin -> {
                val t = System.currentTimeMillis()
                // 서버는 이탈이 이어지는 동안 pos 마다 다시 보낼 수 있으므로 1분에 한 번만 따른다
                if (t - lastRejoinAt < 60_000) return
                lastRejoinAt = t
                addWaypoint(m.lat, m.lng, "선두 합류 지점")
                val text = "선두를 따라가는 경로로 바꿨습니다"
                addRadio("다시 붙기", text, "all", Mood.BASE)
                speak(text, "guide")
            }
            is RoomMsg.Error -> log("서버 오류: ${m.error}")
            is RoomMsg.Other -> log("처리하지 않는 메시지 ${m.type}")
        }
    }

    private fun onHello(m: RoomMsg.Hello) = upsertCar(m.from) { c -> c.copy(nickname = m.nickname, lat = m.lat ?: c.lat, lng = m.lng ?: c.lng) }

    private fun rollLine(from: String, seats: List<RoomMsg.Seat>): String {
        val on = seats.filter { it.occupied }
        val head = "$from ${on.size}명"
        val unknown = on.any { it.buckled == null }
        val unbuckled = on.filter { it.buckled == false }
        return when {
            unbuckled.isNotEmpty() -> "$head, " + unbuckled.joinToString(", ") { SEAT_NAME[it.id] ?: it.id } + " 벨트 미착용"
            unknown -> "$head, 벨트 확인 불가"
            else -> "$head 벨트 완료"
        }
    }

    private fun addWaypoint(lat: Double, lng: Double, name: String) {
        if (!navi.ready) return log("내비 미연결, 경유지 못 넣음: $name")
        runCatching { navi.addWaypoint(lat, lng, name) }
            .onSuccess { log("경유지 추가 요청: $name ($lat, $lng)") }
            .onFailure { log("경유지 추가 실패: ${it.message}") }
    }

    private fun addPin(kind: String, from: String, lat: Double, lng: Double) {
        val t = System.currentTimeMillis()
        _room.update { s -> s.copy(pins = s.pins.filter { t - it.at < PIN_TTL_MS } + Pin(kind, from, lat, lng, t)) }
    }

    private fun addRadio(from: String, text: String, channel: String, mood: Mood) {
        _room.update { it.copy(radios = (listOf(Radio(++radioId, from, text, channel, mood, System.currentTimeMillis())) + it.radios).take(100)) }
    }

    /** 채널별 오디오 존으로 읽는다. guide = 운전석 안내, all 도 운전석에 짧게 읽는다 */
    private fun speak(text: String, channel: String, key: String? = null) {
        val s = _seats.value
        val (zone, name) = when (channel) {
            "adult" -> s.adultZone to "어른 채널"
            "kids" -> s.kidsZone to "키즈 채널"
            else -> s.guideZone to null
        }
        val line = if (s.prefixChannel && name != null) "$name, $text" else text
        voice.speak(line, zone, key)
        log("TTS(존 $zone) $line")
    }

    // --- 받아 적기 ---

    fun talk() {
        if (_room.value.listening) { voice.stopListening(); _room.update { it.copy(listening = false) }; return }
        val ok = voice.listen { text, done ->
            _room.update { it.copy(heard = text, listening = !done) }
            if (done && text.isNotBlank()) onHeard(text)
        }
        if (!ok) addRadio("뻐꾸기", "음성 인식을 쓸 수 없습니다", "all", Mood.ALERT)
        _room.update { it.copy(listening = ok, heard = "") }
    }

    /** 투표 중이면 "1번" 을 표로, 아니면 무전으로 보낸다. 승객 화면 입력창도 여기로 온다 */
    fun onHeard(text: String) {
        val vote = _room.value.vote
        if (vote != null) Phrase.voteChoice(text, vote.candidates.size)?.let { return vote(it) }
        val s = _seats.value
        val msg = JSONObject().put("type", "say").put("text", Phrase.shorten(text)).put("channel", s.channel).put("seat", s.seat)
            .put("speaker", voice.lastSpeakerId ?: SEAT_NAME[s.seat])
        val ok = client.send(msg)
        log("무전(${s.channel}) ${if (ok) "보냄" else "못 보냄"}: $text")
    }

    fun vote(choice: Int) {
        val v = _room.value.vote ?: return
        if (client.send(JSONObject().put("type", "vote").put("choice", choice))) {
            _room.update { it.copy(vote = v.copy(myChoice = choice)) }
            log("투표: ${v.candidates.getOrNull(choice)?.name}")
        }
    }

    fun updateSeats(f: (Seats) -> Seats) = _seats.update(f)

    fun runDemo() {
        if (_demoRunning.value) return
        viewModelScope.launch(Dispatchers.Default) {
            _demoRunning.value = true
            runCatching { demo.run() }
                .onFailure { log("데모 오류: ${it.message}") }
            withContext(Dispatchers.Main) { _demoRunning.value = false }
        }
    }

    override fun onCleared() {
        super.onCleared()
        client.leave()
        RoomService.stop(getApplication())
        bridge.stop()
        locator.stop()
        navi.stop()
        voice.stop()
    }

    companion object {
        val SEAT_IDS = listOf(
            SeatValue.ROW_1_LEFT to "driver", SeatValue.ROW_1_RIGHT to "passenger",
            SeatValue.ROW_2_LEFT to "rear-l", SeatValue.ROW_2_RIGHT to "rear-r",
        )
        val SEAT_NAME = mapOf("driver" to "운전석", "passenger" to "조수석", "rear-l" to "뒷좌석 왼쪽", "rear-r" to "뒷좌석 오른쪽")
        /** 이슈 핀은 5분 동안 지도에 남는다 */
        const val PIN_TTL_MS = 5 * 60_000L
        /** 호차 색 1..6(ui/Theme.kt C.cars, 휴대폰 화면과 같은 순서). 서버가 보내는 깃발 색은 쓰지 않는다 */
        val FLAG = listOf(0xFFFF5A4EL, 0xFF2B8CFFL, 0xFFFFBF1FL, 0xFF7B55FFL, 0xFFFF3D8BL, 0xFF14B8D4L)
    }
}
