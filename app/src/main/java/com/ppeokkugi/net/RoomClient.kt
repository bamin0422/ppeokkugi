package com.ppeokkugi.net

import android.os.Handler
import android.os.Looper
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/** 서버가 보내는 메시지. 형식은 server/src/room.js 와 같다 */
sealed interface RoomMsg {
    /** token 은 다시 붙을 때 같은 호차로 앉는 재입장 토큰. rejoined 는 그 토큰으로 예전 번호를 돌려받았는지 */
    data class Welcome(val carNum: Int, val carLabel: String, val flagColor: String?, val cars: List<Hello> = emptyList(), val token: String? = null, val rejoined: Boolean = false) : RoomMsg
    /** lat·lng 는 welcome.cars 에만 온다(먼저 들어온 차의 마지막 위치) */
    data class Hello(val from: String, val nickname: String, val flagColor: String?, val lat: Double? = null, val lng: Double? = null) : RoomMsg
    data class Pos(val from: String, val lat: Double, val lng: Double, val heading: Double, val speed: Double) : RoomMsg
    /** gapM·ahead 는 서버가 받는 차마다 붙인 보낸 차와의 거리와 앞뒤(목적지까지 남은 거리 기준) */
    data class Signal(val from: String, val kind: String, val lat: Double?, val lng: Double?, val value: Int?, val distanceM: Int?, val gapM: Double? = null, val ahead: Boolean? = null) : RoomMsg
    /** 각자 위치 알림: fall_behind·catch_up·place·long_stop·summary. text 는 받는 차 기준으로 서버가 만든다 */
    data class Notice(val kind: String, val target: String?, val lat: Double?, val lng: Double?, val text: String) : RoomMsg
    data class Say(val from: String, val seat: String?, val speaker: String?, val channel: String, val text: String, val system: Boolean) : RoomMsg
    data class Seat(val id: String, val occupied: Boolean, val buckled: Boolean?)
    data class Roll(val from: String, val seats: List<Seat>) : RoomMsg
    data class Candidate(val id: String, val name: String, val lat: Double?, val lng: Double?)
    data class VoteOpen(val reason: String, val candidates: List<Candidate>, val timeoutMs: Long) : RoomMsg
    data class VoteResult(val winner: Candidate, val totalPeople: Int) : RoomMsg
    data class Rejoin(val target: String, val lat: Double, val lng: Double) : RoomMsg
    data class Leave(val from: String) : RoomMsg
    data class Place(val lat: Double, val lng: Double, val name: String)
    /** 대장 콜: 선두가 바꾼 목적지와 경유지(최대 2곳) */
    data class Route(val from: String, val dest: Place, val waypoints: List<Place>) : RoomMsg
    /** 일행이 모두 150m 안에서 P 로 섰다 */
    data class Arrive(val cars: Int) : RoomMsg
    data class Error(val error: String) : RoomMsg
    /** 아직 처리하지 않는 메시지 */
    data class Other(val type: String, val raw: String) : RoomMsg
}

enum class Link { OFF, CONNECTING, ON }

/**
 * 방 하나에 붙는 WebSocket. 끊기면 1·2·4…30초 간격으로 다시 붙고 매번 hello 를 보낸다.
 * 서버가 welcome 에 준 재입장 토큰을 hello 에 실어 다시 붙어도 같은 호차 번호를 받는다.
 * 콜백은 모두 메인 스레드에서 부른다. send 는 어느 스레드에서 불러도 된다.
 */
class RoomClient(
    private val baseUrl: String,
    private val onMessage: (RoomMsg) -> Unit,
    private val onLink: (Link) -> Unit,
    private val log: (String) -> Unit,
) {
    private val http = OkHttpClient.Builder().pingInterval(20, TimeUnit.SECONDS).build()
    private val main = Handler(Looper.getMainLooper())
    private var ws: WebSocket? = null
    private var code: String? = null
    private var hello: JSONObject? = null
    private var retry = 0

    /** POST /api/rooms 로 새 방 코드를 받는다 */
    fun createRoom(done: (String?) -> Unit) {
        val req = Request.Builder().url("$baseUrl/api/rooms").post("".toRequestBody()).build()
        http.newCall(req).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                log("방 만들기 실패: ${e.message}")
                main.post { done(null) }
            }
            override fun onResponse(call: Call, response: Response) {
                val c = response.use { r -> runCatching { JSONObject(r.body!!.string()).getString("code") }.getOrNull() }
                main.post { done(c) }
            }
        })
    }

    fun join(roomCode: String, helloMsg: JSONObject) {
        leave()
        code = roomCode
        hello = helloMsg.put("type", "hello")
        retry = 0
        connect()
    }

    fun leave() {
        code = null
        main.removeCallbacksAndMessages(null)
        ws?.close(1000, "bye")
        ws = null
        onLink(Link.OFF)
    }

    fun send(msg: JSONObject): Boolean = ws?.send(msg.toString()) ?: false

    private fun connect() {
        val c = code ?: return
        onLink(Link.CONNECTING)
        val req = Request.Builder().url("$baseUrl/api/rooms/$c/ws").build()
        ws = http.newWebSocket(req, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                retry = 0
                hello?.let { webSocket.send(it.toString()) }
                main.post { onLink(Link.ON) }
            }
            override fun onMessage(webSocket: WebSocket, text: String) {
                val m = runCatching { parse(text) }.getOrElse { log("메시지 해석 실패: ${it.message}"); return }
                main.post {
                    // 다음 재접속 hello 에 토큰을 실어 같은 호차 번호를 돌려받는다
                    if (m is RoomMsg.Welcome) m.token?.let { hello?.put("token", it) }
                    onMessage(m)
                }
            }
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) = reconnect(webSocket, "끊김: ${t.message}")
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) = reconnect(webSocket, "닫힘 $code")
        })
    }

    private fun reconnect(from: WebSocket, why: String) {
        main.post {
            if (from !== ws || code == null) return@post // 이미 떠났거나 새 연결로 바뀜
            val delay = (1000L shl retry.coerceAtMost(5)).coerceAtMost(30_000L)
            retry++
            log("서버 $why, ${delay / 1000}초 뒤 재접속")
            onLink(Link.CONNECTING)
            main.postDelayed({ connect() }, delay)
        }
    }

    companion object {
        fun parse(text: String): RoomMsg {
            val o = JSONObject(text)
            val from = o.optString("from")
            return when (val type = o.optString("type")) {
                "welcome" -> RoomMsg.Welcome(o.getInt("carNum"), o.optString("carLabel"), o.optStr("flagColor"), (o.optJSONArray("cars") ?: JSONArray()).let { a ->
                    (0 until a.length()).map { i -> a.getJSONObject(i).let { c -> RoomMsg.Hello(c.optString("from"), c.optString("nickname"), c.optStr("flagColor"), c.optNum("lat"), c.optNum("lng")) } }
                }, o.optStr("token"), o.optBoolean("rejoined"))
                "hello" -> RoomMsg.Hello(from, o.optString("nickname"), o.optStr("flagColor"))
                "pos" -> RoomMsg.Pos(from, o.getDouble("lat"), o.getDouble("lng"), o.optDouble("heading", 0.0), o.optDouble("speed", 0.0))
                "signal" -> RoomMsg.Signal(from, o.getString("kind"), o.optNum("lat"), o.optNum("lng"), o.optNum("value")?.toInt(), o.optNum("distanceM")?.toInt(), o.optNum("gapM"), if (o.has("ahead")) o.optBoolean("ahead") else null)
                "notice" -> RoomMsg.Notice(o.optString("kind"), o.optStr("target"), o.optNum("lat"), o.optNum("lng"), o.optString("text"))
                "say" -> RoomMsg.Say(from, o.optStr("seat"), o.optStr("speaker"), o.optString("channel", "all"), o.optString("text"), o.optBoolean("system"))
                "roll" -> RoomMsg.Roll(from, (o.optJSONArray("seats") ?: JSONArray()).let { a ->
                    (0 until a.length()).map { i ->
                        val s = a.getJSONObject(i)
                        RoomMsg.Seat(s.optString("id"), s.optBoolean("occupied"), if (s.isNull("buckled")) null else s.optBoolean("buckled"))
                    }
                })
                "vote_open" -> RoomMsg.VoteOpen(o.optString("reason"), o.getJSONArray("candidates").let { a ->
                    (0 until a.length()).map { candidate(a.getJSONObject(it)) }
                }, o.optLong("timeoutMs", 30_000))
                "vote_result" -> RoomMsg.VoteResult(candidate(o.getJSONObject("winner")), o.optInt("totalPeople"))
                "rejoin" -> o.getJSONObject("waypoint").let { RoomMsg.Rejoin(o.optString("target"), it.getDouble("lat"), it.getDouble("lng")) }
                "leave" -> RoomMsg.Leave(from)
                "route" -> RoomMsg.Route(from, place(o.getJSONObject("dest")), (o.optJSONArray("waypoints") ?: JSONArray()).let { a ->
                    (0 until a.length()).map { place(a.getJSONObject(it)) }
                })
                "arrive" -> RoomMsg.Arrive(o.optInt("cars"))
                "error" -> RoomMsg.Error(o.optString("error"))
                else -> RoomMsg.Other(type, text)
            }
        }

        private fun place(p: JSONObject) = RoomMsg.Place(p.getDouble("lat"), p.getDouble("lng"), p.optString("name", "목적지"))
        private fun candidate(c: JSONObject) = RoomMsg.Candidate(c.optString("id"), c.optString("name"), c.optNum("lat"), c.optNum("lng"))
        private fun JSONObject.optStr(k: String): String? = if (isNull(k)) null else optString(k)
        private fun JSONObject.optNum(k: String): Double? = if (isNull(k)) null else optDouble(k).takeIf { !it.isNaN() }
    }
}
