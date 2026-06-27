package com.entephoto.cameraselection

import android.content.Context
import android.content.Intent
import android.location.LocationManager
import android.net.wifi.WifiManager
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SystemWifiStateModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "SystemWifiState"

  @ReactMethod
  fun getState(promise: Promise) {
    try {
      val wifiManager =
        reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
      val locationManager =
        reactContext.applicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
      val state = Arguments.createMap()

      state.putBoolean("wifiEnabled", wifiManager.isWifiEnabled)
      state.putBoolean("hotspotEnabled", isHotspotEnabled(wifiManager))
      state.putBoolean("locationServicesEnabled", isLocationEnabled(locationManager))
      promise.resolve(state)
    } catch (error: Exception) {
      promise.reject("SYSTEM_WIFI_STATE_FAILED", error)
    }
  }

  @ReactMethod
  fun openWifiSettings(promise: Promise) {
    openSettings(Settings.ACTION_WIFI_SETTINGS, promise)
  }

  @ReactMethod
  fun openWirelessSettings(promise: Promise) {
    val action =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        Settings.Panel.ACTION_INTERNET_CONNECTIVITY
      } else {
        Settings.ACTION_WIRELESS_SETTINGS
      }

    openSettings(action, promise)
  }

  @ReactMethod
  fun openLocationSettings(promise: Promise) {
    openSettings(Settings.ACTION_LOCATION_SOURCE_SETTINGS, promise)
  }

  private fun openSettings(action: String, promise: Promise) {
    try {
      val intent = Intent(action).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("OPEN_WIFI_SETTINGS_FAILED", error)
    }
  }

  private fun isHotspotEnabled(wifiManager: WifiManager): Boolean {
    return try {
      val method = wifiManager.javaClass.getDeclaredMethod("getWifiApState")
      method.isAccessible = true
      val state = method.invoke(wifiManager) as Int
      state == WIFI_AP_STATE_ENABLED || state == WIFI_AP_STATE_ENABLING
    } catch (_: Exception) {
      false
    }
  }

  private fun isLocationEnabled(locationManager: LocationManager): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      locationManager.isLocationEnabled
    } else {
      locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
        locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
    }
  }

  companion object {
    private const val WIFI_AP_STATE_ENABLING = 12
    private const val WIFI_AP_STATE_ENABLED = 13
  }
}
