package com.ppeokkugi

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.util.Log

/**
 * 무전방에 있는 동안 앱을 포그라운드 서비스로 둔다. 내비가 앞으로 나오면 앱은 캐시 상태가 되어
 * 시스템이 얼리고(cached apps freezer) 바인더 호출이 오면 죽인다. 그러면 뒤에서 오는 무전을 못 듣는다.
 * 서비스는 알림만 띄우고, 방 연결·위치·음성은 그대로 ViewModel 이 맡는다.
 */
class RoomService : Service() {
    override fun onBind(intent: Intent?) = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "무전방", NotificationManager.IMPORTANCE_LOW))
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        val n = Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("뻐꾸기 무전 중")
            .setContentText(intent?.getStringExtra(EXTRA_CODE)?.let { "채널 $it" } ?: "")
            .setContentIntent(open)
            .setOngoing(true)
            .build()
        // 위치를 2초마다 일행에게 보내므로 위치 유형이다. 위치 권한이 없으면 시작할 수 없어 서비스 없이 둔다
        runCatching {
            if (Build.VERSION.SDK_INT >= 29) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION) else startForeground(1, n)
        }.onFailure { Log.d("Ppeokkugi", "포그라운드 서비스 시작 실패: ${it.message}"); stopSelf() }
        return START_NOT_STICKY
    }

    companion object {
        private const val CHANNEL = "room"
        private const val EXTRA_CODE = "code"

        fun start(ctx: Context, code: String) {
            runCatching { ctx.startForegroundService(Intent(ctx, RoomService::class.java).putExtra(EXTRA_CODE, code)) }
                .onFailure { Log.d("Ppeokkugi", "포그라운드 서비스 요청 실패: ${it.message}") }
        }

        fun stop(ctx: Context) = ctx.stopService(Intent(ctx, RoomService::class.java))
    }
}
