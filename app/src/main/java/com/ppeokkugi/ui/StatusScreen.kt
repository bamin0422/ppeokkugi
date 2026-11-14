package com.ppeokkugi.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ppeokkugi.SdkState
import com.ppeokkugi.StatusViewModel

@Composable
fun StatusScreen(vm: StatusViewModel) {
    val logs by vm.logs.collectAsState()
    val sdk by vm.sdk.collectAsState()
    val demoRunning by vm.demoRunning.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(C.bg)
            .padding(horizontal = 28.dp, vertical = R_.md),
    ) {
        Text("뻐꾸기", style = T.brand)
        Spacer(Modifier.height(R_.md))

        SdkStateRow(sdk)
        Spacer(Modifier.height(R_.md))

        SoftButton(onClick = { vm.runDemo() }, enabled = !demoRunning, fill = C.accent, pressed = C.accentPressed, modifier = Modifier.fillMaxWidth().height(84.dp)) {
            Text(if (demoRunning) "데모 주행 중…" else "데모 주행", style = T.button.copy(color = if (demoRunning) C.ink2 else C.ink))
        }

        // 디버그 메뉴: 에뮬레이터가 지원하지 않는 신호를 흉내 낸다
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            DebugButton("에어백 전개 주입 (긴급 콜)", Modifier.weight(1f), vm::injectAirbag)
            DebugButton("깃발 조명 깜빡임 시험", Modifier.weight(1f), vm::blinkFlag)
        }

        Spacer(Modifier.height(R_.md))

        Text("이벤트 로그", style = T.sectionLabel)
        Spacer(Modifier.height(8.dp))

        // 최신 항목이 위에 오도록 이미 reverse 된 상태로 들어온다
        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .card(),
            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            items(logs) { entry ->
                Text(entry, style = T.note, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun DebugButton(text: String, modifier: Modifier, onClick: () -> Unit) {
    SoftButton(onClick = onClick, modifier = modifier.height(80.dp)) { Text(text, style = T.button) }
}

@Composable
private fun SdkStateRow(sdk: SdkState) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SdkChip("플랫폼", sdk.platform)
        SdkChip("내비", sdk.navi)
        SdkChip("위치", sdk.location)
        SdkChip("TTS", sdk.tts)
        SdkChip("STT", sdk.stt)
    }
}

@Composable
private fun SdkChip(label: String, ready: Boolean) {
    // 준비됨은 옅은 주황, 아직은 흰 바탕 회색 글자
    Tag(label, if (ready) C.accentWeak else C.paper, if (ready) C.accentInk else C.ink2)
}
