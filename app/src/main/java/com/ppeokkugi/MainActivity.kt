package com.ppeokkugi

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import com.ppeokkugi.ui.PpeokkugiTheme
import com.ppeokkugi.ui.AppScreen

class MainActivity : ComponentActivity() {
    private val vm: StatusViewModel by viewModels()

    private val permissions = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        vm.startLocation(hasGps = granted[Manifest.permission.ACCESS_FINE_LOCATION] == true || hasGps())
    }

    private fun hasGps() = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        permissions.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.RECORD_AUDIO, "pleos.car.permission.FUSED_LOCATION"))
        setContent {
            PpeokkugiTheme { AppScreen(vm) }
        }
    }
}
