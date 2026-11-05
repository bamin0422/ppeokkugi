package com.ppeokkugi.domain

import com.ppeokkugi.car.TurnSignalState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class AutoCallTest {

    @Test fun brakeDropWithinTwoSecondsFires() {
        val a = AutoCall()
        assertNull(a.speed(100.0, 0))
        assertNull(a.brake(true, 100))
        assertNull(a.speed(92.0, 1000))
        assertEquals("brake_hard", a.speed(84.0, 1900)?.kind)
    }

    @Test fun slowDropOverLongerWindowDoesNotFire() {
        val a = AutoCall()
        a.brake(true, 0)
        assertNull(a.speed(100.0, 0))
        assertNull(a.speed(92.0, 1500))
        assertNull(a.speed(86.0, 3000)) // 2초 창에서는 6km/h 감소
        assertNull(a.speed(80.0, 4500))
    }

    @Test fun dropWithoutBrakeDoesNotFire() {
        val a = AutoCall()
        a.speed(100.0, 0)
        assertNull(a.speed(70.0, 1000))
    }

    @Test fun brakePressAfterDropFires() {
        val a = AutoCall()
        a.speed(100.0, 0)
        a.speed(80.0, 1000)
        assertEquals("brake_hard", a.brake(true, 1200)?.kind)
    }

    @Test fun brakeDebounce20s() {
        val a = AutoCall()
        a.brake(true, 0)
        a.speed(100.0, 0)
        assertNotNull(a.speed(80.0, 1000))
        a.speed(100.0, 10_000)
        assertNull(a.speed(80.0, 11_000))      // 10초 뒤: 막힘
        a.speed(100.0, 21_500)
        assertNotNull(a.speed(80.0, 22_000))   // 21초 뒤: 다시 낸다
    }

    @Test fun rainOnRisingEdgeWithTenMinuteDebounce() {
        val a = AutoCall()
        assertNull(a.wiper(false, 0))
        assertEquals("rain", a.wiper(true, 1000)?.kind)
        assertNull(a.wiper(true, 2000))        // 계속 켜짐
        a.wiper(false, 3000)
        assertNull(a.wiper(true, 5 * 60_000))  // 5분 뒤 다시 켬
        a.wiper(false, 6 * 60_000)
        assertNotNull(a.wiper(true, 11 * 60_000 + 1000))
    }

    @Test fun turnOnlyWhenLeaderAndTbtMatches() {
        val a = AutoCall()
        a.tbt(TurnSignalState.RIGHT, 300.0)
        assertNull(a.turnSignal(TurnSignalState.RIGHT)) // 선두 아님
        a.turnSignal(TurnSignalState.OFF)

        a.leader = true
        val out = a.turnSignal(TurnSignalState.RIGHT)
        assertEquals("turn_right", out?.kind)
        assertEquals(300, out?.distanceM)
    }

    @Test fun turnFilteredWhenTbtFarOrOtherDirection() {
        val a = AutoCall().apply { leader = true }
        a.tbt(TurnSignalState.RIGHT, 800.0)
        assertNull(a.turnSignal(TurnSignalState.RIGHT)) // 500m 밖
        a.turnSignal(TurnSignalState.OFF)
        a.tbt(TurnSignalState.RIGHT, 200.0)
        assertNull(a.turnSignal(TurnSignalState.LEFT))  // 차선 변경
        a.turnSignal(TurnSignalState.OFF)
        a.tbt(null, 100.0)
        assertNull(a.turnSignal(TurnSignalState.RIGHT)) // 회전 안내 없음
    }

    @Test fun speedLimitOnlyOnChangeAndLeader() {
        val a = AutoCall().apply { leader = true }
        assertNull(a.speedLimit(100))       // 첫 값은 기준
        assertNull(a.speedLimit(100))
        assertEquals(50, a.speedLimit(50)?.value)
        a.leader = false
        assertNull(a.speedLimit(80))
    }

    @Test fun phrases() {
        assertEquals("2호차, 5.2km 앞부터 비", Phrase.signal("rain", "2호차", 5200.0, true, null, null))
        assertEquals("2호차, 1.2km 앞 급제동, 감속하세요", Phrase.signal("brake_hard", "2호차", 1234.0, true, null, null))
        assertEquals("3호차, 800m 뒤 급제동, 감속하세요", Phrase.signal("brake_hard", "3호차", 870.0, false, null, null))
        assertEquals("선두, 300m 앞 우회전", Phrase.signal("turn_right", "1호차", null, true, null, 320))
        assertEquals("가자.", Phrase.shorten("가자. " + "가".repeat(40)))
        assertEquals(1, Phrase.voteChoice("이 번이요", 3))
        assertEquals(0, Phrase.voteChoice("1번", 3))
        assertNull(Phrase.voteChoice("5번", 3))
    }

    @Test fun distanceMatchesServer() {
        // server/src/logic.js distText 와 같은 값
        assertEquals("800m", Phrase.distance(850.0))
        assertEquals("1.2km", Phrase.distance(1234.0))
        assertEquals("2km", Phrase.distance(2000.0))
        assertEquals("10km", Phrase.distance(9960.0))
        assertEquals("15km", Phrase.distance(15400.0))
    }

    @Test fun parsesServerGapAndNotice() {
        val sig = com.ppeokkugi.net.RoomClient.parse("""{"type":"signal","kind":"brake_hard","from":"2호차","lat":37.2,"lng":127.1,"gapM":1234,"ahead":true}""") as com.ppeokkugi.net.RoomMsg.Signal
        assertEquals(1234.0, sig.gapM!!, 0.0)
        assertEquals(true, sig.ahead)
        val n = com.ppeokkugi.net.RoomClient.parse("""{"type":"notice","kind":"fall_behind","target":"3호차","lat":37.1,"lng":127.0,"text":"3호차, 2.5km 뒤, 대열에서 처졌습니다"}""") as com.ppeokkugi.net.RoomMsg.Notice
        assertEquals("fall_behind", n.kind)
        assertEquals("3호차", n.target)
    }
}
