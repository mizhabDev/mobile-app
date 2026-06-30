package com.entephoto.cameraselection

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.nio.ByteBuffer
import java.nio.ByteOrder

class UsbCameraModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private var permissionPromise: Promise? = null
  private var permissionReceiver: BroadcastReceiver? = null

  override fun getName(): String = "UsbCamera"

  @ReactMethod
  fun isUsbHostSupported(promise: Promise) {
    val supported =
      reactContext.packageManager.hasSystemFeature(PackageManager.FEATURE_USB_HOST)
    promise.resolve(supported)
  }

  @ReactMethod
  fun detectCamera(promise: Promise) {
    val device = findPtpCameraDevice()
    if (device == null) {
      promise.resolve(null)
      return
    }

    promise.resolve(deviceToMap(device))
  }

  @ReactMethod
  fun requestPermission(deviceName: String, promise: Promise) {
    val device = findDevice(deviceName)
    if (device == null) {
      promise.resolve(false)
      return
    }

    val usbManager = getUsbManager()
    if (usbManager.hasPermission(device)) {
      promise.resolve(true)
      return
    }

    if (permissionPromise != null) {
      promise.reject("USB_PERMISSION_IN_PROGRESS", "A USB permission request is already active.")
      return
    }

    val intent = PendingIntent.getBroadcast(
      reactContext,
      0,
      Intent(ACTION_USB_PERMISSION).setPackage(reactContext.packageName),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
    )

    permissionPromise = promise
    permissionReceiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_USB_PERMISSION) {
          return
        }

        val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
        permissionPromise?.resolve(granted)
        clearPermissionReceiver()
      }
    }

    val filter = IntentFilter(ACTION_USB_PERMISSION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      reactContext.registerReceiver(permissionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      reactContext.registerReceiver(permissionReceiver, filter)
    }

    usbManager.requestPermission(device, intent)
  }

  @ReactMethod
  fun supportsPtp(deviceName: String, promise: Promise) {
    val device = findDevice(deviceName)
    promise.resolve(device?.let(::isPtpDevice) ?: false)
  }

  @ReactMethod
  fun openPtpSession(deviceName: String, promise: Promise) {
    val device = findDevice(deviceName)
    if (device == null) {
      promise.resolve(false)
      return
    }

    val transport = openTransport(device)
    if (transport == null) {
      promise.resolve(false)
      return
    }

    try {
      val sessionId = 1
      val opened = executeCommand(transport, PTP_OC_OPEN_SESSION, listOf(sessionId)).responseCode == PTP_RC_OK
      promise.resolve(opened)
    } catch (error: Exception) {
      promise.reject("PTP_OPEN_SESSION_FAILED", error)
    } finally {
      transport.close()
    }
  }

  @ReactMethod
  fun readStorage(deviceName: String, promise: Promise) {
    val device = findDevice(deviceName)
    if (device == null) {
      promise.resolve(false)
      return
    }

    val transport = openTransport(device)
    if (transport == null) {
      promise.resolve(false)
      return
    }

    try {
      val sessionId = 1
      val opened = executeCommand(transport, PTP_OC_OPEN_SESSION, listOf(sessionId)).responseCode == PTP_RC_OK
      if (!opened) {
        promise.resolve(false)
        return
      }

      val storageIds = readStorageIds(transport)
      promise.resolve(storageIds.isNotEmpty())
    } catch (error: Exception) {
      promise.reject("PTP_READ_STORAGE_FAILED", error)
    } finally {
      transport.close()
    }
  }

  @ReactMethod
  fun readStorageIds(deviceName: String, promise: Promise) {
    val device = findDevice(deviceName)
    val transport = device?.let(::openTransport)
    if (transport == null) {
      promise.resolve(Arguments.createArray())
      return
    }

    try {
      executeCommand(transport, PTP_OC_OPEN_SESSION, listOf(DEFAULT_SESSION_ID))
      val result = Arguments.createArray()
      readStorageIds(transport).forEach { storageId -> result.pushInt(storageId) }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("PTP_READ_STORAGE_IDS_FAILED", error)
    } finally {
      transport.close()
    }
  }

  @ReactMethod
  fun enumerateObjects(deviceName: String, storageIds: ReadableArray?, promise: Promise) {
    val device = findDevice(deviceName)
    val transport = device?.let(::openTransport)
    if (transport == null) {
      promise.resolve(Arguments.createArray())
      return
    }

    try {
      executeCommand(transport, PTP_OC_OPEN_SESSION, listOf(DEFAULT_SESSION_ID))
      val requestedStorageIds = readableArrayToIntList(storageIds)
      val resolvedStorageIds =
        if (requestedStorageIds.isEmpty()) readStorageIds(transport) else requestedStorageIds
      promise.resolve(enumerateObjects(transport, resolvedStorageIds))
    } catch (error: Exception) {
      promise.reject("PTP_ENUMERATE_OBJECTS_FAILED", error)
    } finally {
      transport.close()
    }
  }

  @ReactMethod
  fun readMetadata(deviceName: String, objectHandle: Int, promise: Promise) {
    val device = findDevice(deviceName)
    val transport = device?.let(::openTransport)
    if (transport == null) {
      promise.resolve(null)
      return
    }

    try {
      executeCommand(transport, PTP_OC_OPEN_SESSION, listOf(DEFAULT_SESSION_ID))
      promise.resolve(readObjectInfo(transport, objectHandle))
    } catch (error: Exception) {
      promise.reject("PTP_READ_METADATA_FAILED", error)
    } finally {
      transport.close()
    }
  }

  @ReactMethod
  fun readThumbnail(deviceName: String, objectHandle: Int, promise: Promise) {
    readObjectBase64(deviceName, objectHandle, PTP_OC_GET_THUMB, "PTP_READ_THUMBNAIL_FAILED", promise)
  }

  @ReactMethod
  fun readImage(deviceName: String, objectHandle: Int, promise: Promise) {
    readObjectBase64(deviceName, objectHandle, PTP_OC_GET_OBJECT, "PTP_READ_IMAGE_FAILED", promise)
  }

  @ReactMethod
  fun closePtpSession(deviceName: String, promise: Promise) {
    promise.resolve(true)
  }

  @ReactMethod
  fun loadPhotoList(deviceName: String, promise: Promise) {
    val device = findDevice(deviceName)
    if (device == null) {
      promise.resolve(Arguments.createArray())
      return
    }

    val transport = openTransport(device)
    if (transport == null) {
      promise.resolve(Arguments.createArray())
      return
    }

    try {
      val opened = executeCommand(transport, PTP_OC_OPEN_SESSION, listOf(DEFAULT_SESSION_ID)).responseCode == PTP_RC_OK
      if (!opened) {
        promise.resolve(Arguments.createArray())
        return
      }

      val storageIds = readStorageIds(transport)
      promise.resolve(enumerateObjects(transport, storageIds))
    } catch (error: Exception) {
      promise.reject("PTP_LOAD_PHOTO_LIST_FAILED", error)
    } finally {
      transport.close()
    }
  }

  private fun getUsbManager(): UsbManager =
    reactContext.getSystemService(Context.USB_SERVICE) as UsbManager

  private fun findPtpCameraDevice(): UsbDevice? =
    getUsbManager().deviceList.values.firstOrNull(::isPtpDevice)

  private fun findDevice(deviceName: String): UsbDevice? =
    getUsbManager().deviceList.values.firstOrNull { it.deviceName == deviceName }

  private fun isPtpDevice(device: UsbDevice): Boolean {
    if (device.deviceClass == UsbConstants.USB_CLASS_STILL_IMAGE) {
      return true
    }

    for (interfaceIndex in 0 until device.interfaceCount) {
      val usbInterface = device.getInterface(interfaceIndex)
      if (
        usbInterface.interfaceClass == UsbConstants.USB_CLASS_STILL_IMAGE &&
        usbInterface.interfaceSubclass == PTP_SUBCLASS &&
        usbInterface.interfaceProtocol == PTP_PROTOCOL
      ) {
        return true
      }
    }

    return false
  }

  private fun openTransport(device: UsbDevice): PtpTransport? {
    val usbManager = getUsbManager()
    if (!usbManager.hasPermission(device)) {
      return null
    }

    val ptpInterface = findPtpInterface(device) ?: return null
    val bulkIn = findEndpoint(ptpInterface, UsbConstants.USB_DIR_IN) ?: return null
    val bulkOut = findEndpoint(ptpInterface, UsbConstants.USB_DIR_OUT) ?: return null
    val connection = usbManager.openDevice(device) ?: return null

    if (!connection.claimInterface(ptpInterface, true)) {
      connection.close()
      return null
    }

    return PtpTransport(connection, ptpInterface, bulkIn, bulkOut)
  }

  private fun findPtpInterface(device: UsbDevice): UsbInterface? {
    for (interfaceIndex in 0 until device.interfaceCount) {
      val usbInterface = device.getInterface(interfaceIndex)
      if (
        usbInterface.interfaceClass == UsbConstants.USB_CLASS_STILL_IMAGE &&
        usbInterface.interfaceSubclass == PTP_SUBCLASS &&
        usbInterface.interfaceProtocol == PTP_PROTOCOL
      ) {
        return usbInterface
      }
    }

    return null
  }

  private fun findEndpoint(usbInterface: UsbInterface, direction: Int): UsbEndpoint? {
    for (endpointIndex in 0 until usbInterface.endpointCount) {
      val endpoint = usbInterface.getEndpoint(endpointIndex)
      if (
        endpoint.type == UsbConstants.USB_ENDPOINT_XFER_BULK &&
        endpoint.direction == direction
      ) {
        return endpoint
      }
    }

    return null
  }

  private fun readStorageIds(transport: PtpTransport): List<Int> {
    val result = executeCommand(transport, PTP_OC_GET_STORAGE_IDS)
    if (result.responseCode != PTP_RC_OK || result.data.size < PTP_DATA_OFFSET + 4) {
      return emptyList()
    }

    return readUInt32Array(result.data, PTP_DATA_OFFSET)
  }

  private fun readObjectHandles(transport: PtpTransport, storageId: Int): List<Int> {
    val result = executeCommand(
      transport,
      PTP_OC_GET_OBJECT_HANDLES,
      listOf(storageId, 0, 0),
    )
    if (result.responseCode != PTP_RC_OK || result.data.size < PTP_DATA_OFFSET + 4) {
      return emptyList()
    }

    return readUInt32Array(result.data, PTP_DATA_OFFSET)
  }

  private fun enumerateObjects(transport: PtpTransport, storageIds: List<Int>) =
    Arguments.createArray().apply {
      storageIds.forEach { storageId ->
        readObjectHandles(transport, storageId).forEach { objectHandle ->
          val photo = readObjectInfo(transport, objectHandle, storageId)
          if (photo != null) {
            pushMap(photo)
          }
        }
      }
    }

  private fun readObjectInfo(
    transport: PtpTransport,
    objectHandle: Int,
    storageId: Int? = null,
  ) =
    executeCommand(transport, PTP_OC_GET_OBJECT_INFO, listOf(objectHandle)).let { result ->
      if (
        result.responseCode != PTP_RC_OK ||
        result.data.size < PTP_DATA_OFFSET + PTP_OBJECT_INFO_FILENAME_OFFSET + 1
      ) {
        return@let null
      }

      val objectInfo = result.data
      val objectFormat = readUInt16(objectInfo, PTP_DATA_OFFSET + 4)
      if (!isImageObjectFormat(objectFormat)) {
        return@let null
      }

      val filenameOffset = PTP_DATA_OFFSET + PTP_OBJECT_INFO_FILENAME_OFFSET
      val filename = readPtpString(objectInfo, filenameOffset)
      val captureDateOffset = skipPtpString(objectInfo, filenameOffset)
      val captureDate = readPtpString(objectInfo, captureDateOffset)
      Arguments.createMap().apply {
        putString("id", objectHandle.toString())
        putString("name", filename.ifBlank { "IMG_$objectHandle" })
        putDouble("size", readUInt32(objectInfo, PTP_DATA_OFFSET + 8).toDouble())
        putString("captureDate", if (captureDate.isBlank()) null else captureDate)
        putString("thumbnailBase64", null)
        storageId?.let { putInt("storageId", it) }
        putInt("objectHandle", objectHandle)
        putString("uri", null)
      }
    }

  private fun readObjectBase64(
    deviceName: String,
    objectHandle: Int,
    operationCode: Int,
    errorCode: String,
    promise: Promise,
  ) {
    val device = findDevice(deviceName)
    val transport = device?.let(::openTransport)
    if (transport == null) {
      promise.resolve(null)
      return
    }

    try {
      executeCommand(transport, PTP_OC_OPEN_SESSION, listOf(DEFAULT_SESSION_ID))
      val result = executeCommand(transport, operationCode, listOf(objectHandle))
      if (result.responseCode != PTP_RC_OK || result.data.size <= PTP_DATA_OFFSET) {
        promise.resolve(null)
        return
      }

      val payload = result.data.copyOfRange(PTP_DATA_OFFSET, result.data.size)
      promise.resolve(Base64.encodeToString(payload, Base64.NO_WRAP))
    } catch (error: Exception) {
      promise.reject(errorCode, error)
    } finally {
      transport.close()
    }
  }

  private fun readableArrayToIntList(readableArray: ReadableArray?): List<Int> {
    if (readableArray == null) {
      return emptyList()
    }

    val values = mutableListOf<Int>()
    for (index in 0 until readableArray.size()) {
      values.add(readableArray.getInt(index))
    }
    return values
  }

  private fun executeCommand(
    transport: PtpTransport,
    operationCode: Int,
    params: List<Int> = emptyList(),
  ): PtpResult {
    val transactionId = transport.nextTransactionId()
    val command = createPtpContainer(
      PTP_CONTAINER_COMMAND,
      operationCode,
      transactionId,
      params,
    )

    val written = transport.connection.bulkTransfer(
      transport.bulkOut,
      command,
      command.size,
      USB_TIMEOUT_MS,
    )
    if (written != command.size) {
      throw IllegalStateException("Could not send PTP command.")
    }

    val firstContainer = readPtpContainer(transport)
    if (firstContainer.containerType == PTP_CONTAINER_DATA) {
      val response = readPtpContainer(transport)
      return PtpResult(firstContainer.operationCode, firstContainer.bytes, response.operationCode)
    }

    return PtpResult(operationCode, ByteArray(0), firstContainer.operationCode)
  }

  private fun readPtpContainer(transport: PtpTransport): PtpContainer {
    val buffer = ByteArray(MAX_PTP_CONTAINER_BYTES)
    var totalRead = 0
    var expectedLength = 0

    while (totalRead < buffer.size) {
      val read = transport.connection.bulkTransfer(
        transport.bulkIn,
        buffer,
        totalRead,
        buffer.size - totalRead,
        USB_TIMEOUT_MS,
      )
      if (read <= 0) {
        break
      }

      totalRead += read
      if (expectedLength == 0 && totalRead >= 4) {
        expectedLength = readUInt32(buffer, 0)
      }
      if (expectedLength > 0 && totalRead >= expectedLength) {
        break
      }
    }

    if (totalRead < PTP_HEADER_BYTES) {
      throw IllegalStateException("Invalid PTP response.")
    }

    val bytes = buffer.copyOf(totalRead)
    return PtpContainer(
      containerType = readUInt16(bytes, 4),
      operationCode = readUInt16(bytes, 6),
      bytes = bytes,
    )
  }

  private fun createPtpContainer(
    containerType: Int,
    operationCode: Int,
    transactionId: Int,
    params: List<Int>,
  ): ByteArray {
    val length = PTP_HEADER_BYTES + params.size * 4
    val buffer = ByteBuffer.allocate(length).order(ByteOrder.LITTLE_ENDIAN)
    buffer.putInt(length)
    buffer.putShort(containerType.toShort())
    buffer.putShort(operationCode.toShort())
    buffer.putInt(transactionId)
    params.forEach { param -> buffer.putInt(param) }
    return buffer.array()
  }

  private fun readUInt32Array(bytes: ByteArray, offset: Int): List<Int> {
    val count = readUInt32(bytes, offset)
    val values = mutableListOf<Int>()
    for (valueIndex in 0 until count) {
      val valueOffset = offset + 4 + valueIndex * 4
      if (valueOffset + 4 > bytes.size) {
        break
      }
      values.add(readUInt32(bytes, valueOffset))
    }

    return values
  }

  private fun readPtpString(bytes: ByteArray, offset: Int): String {
    if (offset >= bytes.size) {
      return ""
    }

    val characterCount = bytes[offset].toInt() and 0xff
    if (characterCount <= 1) {
      return ""
    }

    val chars = CharArray(characterCount - 1)
    for (charIndex in 0 until characterCount - 1) {
      val charOffset = offset + 1 + charIndex * 2
      if (charOffset + 1 >= bytes.size) {
        break
      }
      chars[charIndex] = readUInt16(bytes, charOffset).toChar()
    }

    return String(chars).trimEnd('\u0000')
  }

  private fun skipPtpString(bytes: ByteArray, offset: Int): Int {
    if (offset >= bytes.size) {
      return bytes.size
    }

    val characterCount = bytes[offset].toInt() and 0xff
    return offset + 1 + characterCount * 2
  }

  private fun isImageObjectFormat(objectFormat: Int): Boolean =
    objectFormat in PTP_IMAGE_FORMAT_START..PTP_IMAGE_FORMAT_END

  private fun readUInt16(bytes: ByteArray, offset: Int): Int =
    ByteBuffer.wrap(bytes, offset, 2).order(ByteOrder.LITTLE_ENDIAN).short.toInt() and 0xffff

  private fun readUInt32(bytes: ByteArray, offset: Int): Int =
    ByteBuffer.wrap(bytes, offset, 4).order(ByteOrder.LITTLE_ENDIAN).int

  private fun deviceToMap(device: UsbDevice) =
    Arguments.createMap().apply {
      putInt("deviceId", device.deviceId)
      putString("deviceName", device.deviceName)
      putString("manufacturerName", device.manufacturerName)
      putString("productName", device.productName)
      putInt("vendorId", device.vendorId)
      putInt("productId", device.productId)
    }

  private fun clearPermissionReceiver() {
    permissionReceiver?.let { receiver ->
      try {
        reactContext.unregisterReceiver(receiver)
      } catch (_: IllegalArgumentException) {
      }
    }
    permissionReceiver = null
    permissionPromise = null
  }

  companion object {
    private const val ACTION_USB_PERMISSION = "com.entephoto.cameraselection.USB_PERMISSION"
    private const val PTP_SUBCLASS = 1
    private const val PTP_PROTOCOL = 1
    private const val USB_TIMEOUT_MS = 5000
    private const val MAX_PTP_CONTAINER_BYTES = 1024 * 1024
    private const val PTP_HEADER_BYTES = 12
    private const val PTP_DATA_OFFSET = 12
    private const val PTP_OBJECT_INFO_FILENAME_OFFSET = 52
    private const val DEFAULT_SESSION_ID = 1
    private const val PTP_CONTAINER_COMMAND = 1
    private const val PTP_CONTAINER_DATA = 2
    private const val PTP_OC_OPEN_SESSION = 0x1002
    private const val PTP_OC_CLOSE_SESSION = 0x1003
    private const val PTP_OC_GET_STORAGE_IDS = 0x1004
    private const val PTP_OC_GET_OBJECT_HANDLES = 0x1007
    private const val PTP_OC_GET_OBJECT_INFO = 0x1008
    private const val PTP_OC_GET_OBJECT = 0x1009
    private const val PTP_OC_GET_THUMB = 0x100a
    private const val PTP_RC_OK = 0x2001
    private const val PTP_IMAGE_FORMAT_START = 0x3800
    private const val PTP_IMAGE_FORMAT_END = 0x38ff
  }
}

private data class PtpTransport(
  val connection: UsbDeviceConnection,
  val usbInterface: UsbInterface,
  val bulkIn: UsbEndpoint,
  val bulkOut: UsbEndpoint,
) {
  private var transactionId = 0

  fun nextTransactionId(): Int {
    transactionId += 1
    return transactionId
  }

  fun close() {
    connection.releaseInterface(usbInterface)
    connection.close()
  }
}

private data class PtpContainer(
  val containerType: Int,
  val operationCode: Int,
  val bytes: ByteArray,
)

private data class PtpResult(
  val operationCode: Int,
  val data: ByteArray,
  val responseCode: Int,
)
