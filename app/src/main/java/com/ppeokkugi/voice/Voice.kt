package com.ppeokkugi.voice

import ai.pleos.playground.stt.SpeechToText
import ai.pleos.playground.stt.data.RecognitionFinalResult
import ai.pleos.playground.stt.listener.AmbientAiRecognitionResultListener
import ai.pleos.playground.stt.listener.ResultListener
import ai.pleos.playground.tts.TextToSpeech
import ai.pleos.playground.tts.listener.EventListener
import ai.pleos.playground.tts.listener.OnInitializeListener
import android.content.Context
import android.os.Handler
import android.os.Looper
import java.util.Locale
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import ai.pleos.playground.stt.constant.ErrorType as SttError
import ai.pleos.playground.stt.listener.OnInitializeListener as SttInit
import ai.pleos.playground.tts.constant.ErrorType as TtsError

/**
 * Pleos TTS/STT. TTS 가 안 되면 안드로이드 기본 TTS 로 읽는다.
 * [speak] 에 [audioZoneId] 를 넘기면 setAudioZoneId 를 호출한 뒤 발화한다(좌석 채널 §6.3).
 */
class Voice(context: Context, private val log: (String) -> Unit) {
    private val _level = MutableStateFlow(0f)
    /** 받아 적는 동안 마이크 크기 0..1 (무전 버튼 레벨 미터) */
    val level: StateFlow<Float> = _level

    private val app = context.applicationContext
    private val main = Handler(Looper.getMainLooper())
    private var pleosTts: TextToSpeech? = null
    private var androidTts: android.speech.tts.TextToSpeech? = null
    private var stt: SpeechToText? = null
    var ttsReady = false; private set
    var sttReady = false; private set

    private var onText: ((String, Boolean) -> Unit)? = null

    /** AmbientAiApi 가 알려 준 마지막 화자 id. 에뮬레이터에서는 오지 않을 수 있다 */
    @Volatile var lastSpeakerId: String? = null; private set

    fun start() {
        runCatching {
            val t = TextToSpeech(app)
            t.initialize(object : OnInitializeListener {
                override fun onSuccess() {
                    t.setLocale(Locale.KOREA)
                    t.addEventListener(ttsEvents)
                    pleosTts = t
                    ttsReady = true
                    log("Pleos TTS 연결")
                    probeAudioZones(t)
                }
                override fun onFailure(errorType: TtsError) = fallbackTts("Pleos TTS 실패 $errorType")
            })
        }.onFailure { fallbackTts("Pleos TTS 없음 ${it.message}") }

        runCatching {
            val s = SpeechToText(app)
            s.initialize(object : SttInit {
                override fun onSuccess() {
                    s.addListener(listener)
                    stt = s
                    sttReady = true
                    log("Pleos STT 연결")
                    // 화자 식별은 표준 ResultListener 에 없어 AmbientAiApi 최종 결과에서 받는다. 오지 않으면 화면에서 고른 좌석을 쓴다
                    runCatching { s.getAmbientAi().setRecognitionResultListener(ambientListener) }
                        .onSuccess { log("STT 화자 식별 리스너 등록") }
                        .onFailure { log("STT 화자 식별 없음: ${it.message}") }
                }
                override fun onFailure(errorType: SttError) = log("Pleos STT 실패 $errorType")
            })
        }.onFailure { log("Pleos STT 없음 ${it.message}") }
    }

    /** TTS 오디오존 0~3 지원 여부를 탐색해 로그에 남긴다 */
    private fun probeAudioZones(t: TextToSpeech) {
        for (zoneId in 0..3) {
            runCatching { t.setAudioZoneId(zoneId) }
                .onSuccess { log("TTS 오디오존 $zoneId: 지원") }
                .onFailure { log("TTS 오디오존 $zoneId 실패: ${it.message}") }
        }
        // 탐색 후 기본값(0)으로 복원
        runCatching { t.setAudioZoneId(0) }
    }

    private fun fallbackTts(why: String) {
        log("$why → 기본 TTS")
        androidTts = android.speech.tts.TextToSpeech(app) { status ->
            if (status == android.speech.tts.TextToSpeech.SUCCESS) {
                androidTts?.language = Locale.KOREA
                ttsReady = true
            }
        }
    }

    /** 읽을 줄 하나. [key] 가 같은 줄이 아직 대기 중이면 새 줄로 바꾼다(같은 차의 처짐·다시 붙음은 마지막 것만) */
    private class Line(val text: String, val zone: Int?, val key: String?)

    // Pleos TTS 는 새 speak 가 앞 발화를 끊으므로 하나씩 차례로 읽는다
    private val queue = ArrayDeque<Line>()
    private var speaking = false
    private var seq = 0
    private val next = Runnable { speaking = false; drain() }
    private val timeout = Runnable { log("TTS #$seq 응답 없음, 다음 줄로"); next.run() }

    /**
     * [audioZoneId] 가 있으면 setAudioZoneId 를 먼저 호출한다(좌석 채널용). 메인 스레드에서 부른다.
     * [key] 를 주면 같은 key 로 대기 중인 줄을 지우고 맨 뒤에 넣는다. 경고(급제동·에어백 등)는 key 없이 넘겨 지워지지 않게 한다
     */
    fun speak(text: String, audioZoneId: Int? = null, key: String? = null) {
        if (pleosTts == null) {
            androidTts?.speak(text, android.speech.tts.TextToSpeech.QUEUE_ADD, null, "ppeokkugi")
            return
        }
        if (key != null && queue.removeAll { it.key == key }) log("TTS 대기 중인 같은 줄 교체: $key")
        queue.addLast(Line(text, audioZoneId, key))
        drain()
    }

    private fun drain() {
        val t = pleosTts ?: return
        if (speaking) return
        val line = queue.removeFirstOrNull() ?: return
        speaking = true
        line.zone?.let { zoneId ->
            runCatching { t.setAudioZoneId(zoneId) }
                .onFailure { log("TTS 오디오존 $zoneId 실패: ${it.message}") }
        }
        log("TTS 시작 #${++seq} (대기 ${queue.size}) ${line.text}")
        t.speak(line.text)
        // 다음 줄은 onDone·onStop·onError 를 받고 넘어간다. 이 타이머는 콜백이 끝내 오지 않을 때만 쓴다.
        // 받아 적기(STT)를 쓴 뒤에는 TTS 모델을 다시 올리느라 소리가 5초 넘게 늦게 나온다(에뮬레이터 실측 5.3초).
        // 타이머가 짧으면 다음 speak 가 아직 소리도 안 난 줄을 끊어 버려 줄줄이 무음이 된다
        main.postDelayed(timeout, WATCHDOG_MS + line.text.length * 300L)
    }

    private val ttsEvents = object : EventListener {
        override fun onStart() = log("TTS onStart #$seq")
        override fun onReady() = Unit
        override fun onDone() = done("onDone")
        override fun onError(errorType: TtsError) = done("onError $errorType")
        override fun onStop() = done("onStop")
        override fun onUpdatedRms(rms: Double) = Unit
        // 콜백은 바인더 스레드에서 온다. 읽는 줄이 없을 때 온 늦은 콜백은 버린다
        private fun done(why: String) {
            main.post {
                log("TTS $why #$seq")
                if (!speaking) return@post
                main.removeCallbacks(timeout)
                next.run()
            }
        }
    }

    fun listen(onText: (String, Boolean) -> Unit): Boolean {
        val s = stt ?: return false
        this.onText = onText
        s.request()
        return true
    }

    fun stopListening() {
        log("STT stop")
        stt?.stop()
        onText = null
        _level.value = 0f
    }

    private val listener = object : ResultListener {
        override fun onReady() = Unit
        override fun onStartedRecognition() = Unit
        override fun onUpdated(stt: String, completed: Boolean) {
            val cb = onText ?: return
            main.post {
                cb(stt, completed)
                if (completed) onText = null
            }
        }
        override fun onUpdatedEpdData(on: Long, off: Long) = Unit
        // ponytail: RMS 범위를 0..RMS_MAX 로 가정했다. 실차에서 미터가 늘 바닥이거나 꼭대기면 RMS_MAX 를 맞춘다
        override fun onUpdatedRms(rms: Double) { _level.value = (rms / RMS_MAX).toFloat().coerceIn(0f, 1f) }
        override fun onEndedRecognition() { log("STT onEndedRecognition"); _level.value = 0f }
        override fun onError(errorType: SttError) {
            log("STT 오류 $errorType")
            main.post { onText?.invoke("", true); onText = null }
        }
    }

    private val ambientListener = object : AmbientAiRecognitionResultListener {
        override fun onUpdated(p0: String, p1: String, p2: Boolean) = Unit
        override fun onUpdatedEpdState(p0: Int) = Unit
        override fun onUpdatedConversationInfo(p0: String, p1: String) = Unit
        override fun onError(p0: SttError) = Unit
        override fun onReadyToSendBuffer() = Unit
        override fun onUpdateRecognitionFinalResult(p0: RecognitionFinalResult) {
            p0.speaker?.speakerId?.takeIf { it.isNotBlank() }?.let {
                lastSpeakerId = it
                log("STT 화자 $it")
            }
        }
    }

    fun stop() {
        runCatching { stt?.removeListener(listener); stt?.release() }
        runCatching { pleosTts?.release() }
        androidTts?.shutdown()
    }

    private companion object {
        const val RMS_MAX = 10.0
        /** 콜백이 오지 않을 때 다음 줄로 넘어가기까지 기다리는 기본 시간(글자당 0.3초를 더한다) */
        const val WATCHDOG_MS = 20_000L
    }
}
