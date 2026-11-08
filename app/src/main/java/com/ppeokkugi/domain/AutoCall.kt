package com.ppeokkugi.domain

import com.ppeokkugi.car.TurnSignalState

/** 서버로 보낼 자동 콜 한 건. kind 는 서버 VALID_SIGNALS 와 같다 */
data class Outgoing(val kind: String, val value: Int? = null, val distanceM: Int? = null)

/**
 * 자동 콜 판정 규칙(계획서 §6.1). 안드로이드 API 를 쓰지 않으므로 JVM 단위 테스트로 검증한다.
 * 모든 함수는 시각 [t](ms)를 받아 시계에 기대지 않는다. 단속 카메라는 다루지 않는다.
 */
class AutoCall {
    /** 1호차(선두)일 때만 회전·제한속도·주의 구간 콜을 낸다 */
    var leader = false

    private var brakePressed = false
    private val speeds = ArrayDeque<Pair<Long, Double>>()
    private var lastBrakeAt = Long.MIN_VALUE / 2
    private var wiperOn = false
    private var lastRainAt = Long.MIN_VALUE / 2
    private var tbtDir: TurnSignalState? = null
    private var tbtDistM = Double.MAX_VALUE
    private var lastTurn = TurnSignalState.OFF
    private var speedLimit = 0
    private val cautionSeen = mutableSetOf<String>()
    private var lastAirbagAt = Long.MIN_VALUE / 2

    fun brake(pressed: Boolean, t: Long): Outgoing? {
        brakePressed = pressed
        return if (pressed) checkBrake(t) else null
    }

    fun speed(kmh: Double, t: Long): Outgoing? {
        speeds.addLast(t to kmh)
        while (speeds.first().first < t - BRAKE_WINDOW_MS) speeds.removeFirst()
        return if (brakePressed) checkBrake(t) else null
    }

    /** 브레이크를 밟은 채 2초 안에 15km/h 이상 떨어지면 급제동. 20초 안에는 다시 내지 않는다 */
    private fun checkBrake(t: Long): Outgoing? {
        val window = speeds.filter { it.first >= t - BRAKE_WINDOW_MS }
        if (window.isEmpty() || t - lastBrakeAt < BRAKE_DEBOUNCE_MS) return null
        if (window.maxOf { it.second } - window.last().second < BRAKE_DROP_KMH) return null
        lastBrakeAt = t
        return Outgoing("brake_hard")
    }

    /** 꺼짐 → 켜짐 순간에만, 10분에 한 번 */
    fun wiper(on: Boolean, t: Long): Outgoing? {
        val rising = on && !wiperOn
        wiperOn = on
        if (!rising || t - lastRainAt < RAIN_DEBOUNCE_MS) return null
        lastRainAt = t
        return Outgoing("rain")
    }

    /** 내비 다음 회전. dir 은 좌·우 회전이 아니면 null */
    fun tbt(dir: TurnSignalState?, distanceM: Double) {
        tbtDir = dir
        tbtDistM = distanceM
    }

    /** 선두이고 500m 안에 같은 방향 회전 안내가 있을 때만. 차선 변경 방향지시등은 여기서 걸러진다 */
    fun turnSignal(state: TurnSignalState): Outgoing? {
        val changed = state != lastTurn
        lastTurn = state
        if (!changed || state == TurnSignalState.OFF || !leader) return null
        if (tbtDir != state || tbtDistM > TURN_RANGE_M) return null
        return Outgoing(if (state == TurnSignalState.LEFT) "turn_left" else "turn_right", distanceM = tbtDistM.toInt())
    }

    fun speedLimit(kmh: Int): Outgoing? {
        val changed = speedLimit != 0 && kmh != speedLimit
        speedLimit = kmh
        return if (changed && leader) Outgoing("speed_limit", value = kmh) else null
    }

    fun caution(id: String, remainM: Int?): Outgoing? {
        if (!leader || !cautionSeen.add(id)) return null
        return Outgoing("caution", distanceM = remainM)
    }

    fun airbag(t: Long): Outgoing? {
        if (t - lastAirbagAt < AIRBAG_DEBOUNCE_MS) return null
        lastAirbagAt = t
        return Outgoing("airbag")
    }

    companion object {
        const val BRAKE_WINDOW_MS = 2_000L
        const val BRAKE_DROP_KMH = 15.0
        const val BRAKE_DEBOUNCE_MS = 20_000L
        const val RAIN_DEBOUNCE_MS = 10 * 60_000L
        const val TURN_RANGE_M = 500.0
        const val AIRBAG_DEBOUNCE_MS = 60_000L
    }
}

/** 받은 콜·무전을 읽을 문장. from 은 "2호차" 같은 레이블, distM 은 보낸 차까지 거리 */
object Phrase {
    /** 서버 distText 와 같다: 1km 미만 100m 단위, 10km 미만 소수 한 자리, 그 위는 정수 km */
    fun distance(m: Double): String = when {
        m < 1000 -> "${(m / 100).toInt() * 100}m"
        m < 10_000 -> "%.1f".format(java.util.Locale.ROOT, Math.round(m / 100) / 10.0).removeSuffix(".0") + "km"
        else -> "${Math.round(m / 1000)}km"
    }

    fun signal(kind: String, from: String, distM: Double?, ahead: Boolean, value: Int?, signalDistM: Int?): String {
        val where = distM?.let { "${distance(it)} ${if (ahead) "앞" else "뒤"}" }
        return when (kind) {
            "brake_hard" -> listOfNotNull(from, where).joinToString(", ") + " 급제동, 감속하세요"
            "rain" -> listOfNotNull(from, where?.let { "${it}부터" }).joinToString(", ") + " 비"
            "turn_left", "turn_right" -> {
                val dir = if (kind == "turn_left") "좌회전" else "우회전"
                "선두, " + (signalDistM?.let { "${distance(it.toDouble())} 앞 " } ?: "") + dir
            }
            "speed_limit" -> "선두, 제한속도 ${value ?: "?"}으로 바뀜"
            "caution" -> "선두, " + (signalDistM?.let { "${distance(it.toDouble())} 앞 " } ?: "") + "주의 구간"
            "airbag" -> "긴급, ${from} 에어백 전개" + (where?.let { ", $it" } ?: "")
            else -> "$from $kind"
        }
    }

    const val SHORT_MAX = 40
    /** 말버릇. 혼자 떨어진 낱말일 때만 지운다 */
    private val FILLER = Regex("(^|\\s)(음+|어+|아+|저기요?|그러니까|그니까|있잖아|혹시|일단|그냥|약간|진짜|막|좀)(?=[\\s,.!?]|$)")
    /** 운전 중 무전의 핵심: 곳·숫자·길 상황·요청 */
    private val KEY = Regex("휴게소|IC|JC|톨게이트|주유|충전|화장실|출구|차선|사고|고장|정체|막혀|공사|단속|경찰|긴급|위험|조심|천천히|멈춰|세워|기다려|먼저|\\d+")
    private val REQUEST = Regex("(자|요|줘|세요|해|라)[.!?]?$")

    /**
     * 40자를 넘는 무전을 줄인다. 말버릇을 지우고, 그래도 길면 곳·숫자·길 상황·요청이 많은 문장부터
     * 40자 안에서 골라 원래 순서로 잇는다. 핵심이 없으면 첫 문장만, 한 문장뿐이면 말버릇만 지운 채 보낸다. LLM 은 쓰지 않는다
     */
    fun shorten(text: String): String {
        val t = text.trim()
        if (t.length <= SHORT_MAX) return t
        val clean = t.replace(FILLER, " ").replace(Regex("\\s+"), " ").replace(Regex(" ([,.!?])"), "$1").trim()
        if (clean.length <= SHORT_MAX) return clean
        val parts = Regex("[^.?!\\n]+[.?!]?").findAll(clean).map { it.value.trim() }.filter { it.isNotEmpty() }.toList()
        if (parts.size < 2) return clean
        fun score(s: String) = KEY.findAll(s).count() + if (REQUEST.containsMatchIn(s)) 1 else 0
        val keep = sortedSetOf<Int>()
        var len = 0
        // 점수가 같으면 앞 문장이 먼저(정렬이 안정적이다). 핵심이 없는 문장은 남는 칸이 있어도 넣지 않는다
        for (i in parts.indices.sortedByDescending { score(parts[it]) }) {
            if (keep.isNotEmpty() && score(parts[i]) == 0) break
            val add = parts[i].length + if (keep.isEmpty()) 0 else 1
            if (keep.isEmpty() || len + add <= SHORT_MAX) { keep += i; len += add }
        }
        return keep.joinToString(" ") { parts[it] }
    }

    /** STT 로 들은 "1번", "이 번" 을 0부터 시작하는 후보 번호로 */
    fun voteChoice(text: String, count: Int): Int? {
        val m = Regex("([1-9]|일|이|삼)\\s*번").find(text) ?: return null
        val n = when (val d = m.groupValues[1]) { "일" -> 1; "이" -> 2; "삼" -> 3; else -> d.toInt() }
        return (n - 1).takeIf { it in 0 until count }
    }
}
