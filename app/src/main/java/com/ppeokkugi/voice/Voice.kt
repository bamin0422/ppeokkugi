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

    // Pleos TTS 는 새 speak 가 앞 발화를 끊으므로 하나씩 차례로 읽는다
    private val queue = ArrayDeque<Pair<String, Int?>>()
    private var speaking = false
    private val next = Runnable { speaking = false; drain() }

    /** [audioZoneId] 가 있으면 setAudioZoneId 를 먼저 호출한다(좌석 채널용). 메인 스레드에서 부른다 */
    fun speak(text: String, audioZoneId: Int? = null) {
        if (pleosTts == null) {
            androidTts?.speak(text, android.speech.tts.TextToSpeech.QUEUE_ADD, null, "ppeokkugi")
            return
        }
        queue.addLast(text to audioZoneId)
        drain()
    }

    private fun drain() {
        val t = pleosTts ?: return
        if (speaking) return
        val (text, zone) = queue.removeFirstOrNull() ?: return
        speaking = true
        zone?.let { zoneId ->
            runCatching { t.setAudioZoneId(zoneId) }
                .onFailure { log("TTS 오디오존 $zoneId 실패: ${it.message}") }
        }
        t.speak(text)
        // onDone 이 오지 않을 때를 대비해 글 길이로 잡은 시간 뒤에는 다음으로 넘어간다
        main.postDelayed(next, 3000L + text.length * 250L)
    }

    private val ttsEvents = object : EventListener {
        override fun onStart() = Unit
        override fun onReady() = Unit
        override fun onDone() = done()
        override fun onError(errorType: TtsError) = done()
        override fun onStop() = done()
        override fun onUpdatedRms(rms: Double) = Unit
        private fun done() { main.removeCallbacks(next); main.post(next) }
    }

    fun listen(onText: (String, Boolean) -> Unit): Boolean {
        val s = stt ?: return false
        this.onText = onText
        s.request()
        return true
    }

    fun stopListening() {
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
        override fun onEndedRecognition() { _level.value = 0f }
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

    private companion object { const val RMS_MAX = 10.0 }
}
