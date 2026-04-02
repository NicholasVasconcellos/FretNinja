package expo.modules.pitchdetector

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.interfaces.permissions.PermissionsStatus

class PitchDetectorModule : Module() {
  companion object {
    init {
      System.loadLibrary("pitch-detector")
    }
  }

  private external fun nativeStart(): Boolean
  private external fun nativeStop()
  private external fun nativeConfigure(rmsThreshold: Float, nativeConfidence: Float)
  private external fun nativeGetLatestPitch(): FloatArray
  private external fun nativeGetLatencyMs(): Double

  override fun definition() = ModuleDefinition {
    Name("PitchDetector")

    AsyncFunction("start") { promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("ERR_NO_CONTEXT", "React context not available", null)
        return@AsyncFunction
      }

      val permission = Manifest.permission.RECORD_AUDIO
      if (ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED) {
        val success = nativeStart()
        if (success) {
          promise.resolve(null)
        } else {
          promise.reject("ERR_AUDIO_START", "Failed to start Oboe audio stream", null)
        }
        return@AsyncFunction
      }

      // Request permission, then start stream in the callback
      val pm = appContext.permissions
      if (pm == null) {
        promise.reject("ERR_NO_PERMISSIONS", "Permissions manager not available", null)
        return@AsyncFunction
      }

      pm.askForPermissions(
        { results ->
          val granted = results.values.any { it.status == PermissionsStatus.GRANTED }
          if (granted) {
            val success = nativeStart()
            if (success) {
              promise.resolve(null)
            } else {
              promise.reject("ERR_AUDIO_START", "Failed to start Oboe audio stream", null)
            }
          } else {
            promise.reject("ERR_PERMISSION_DENIED", "Microphone permission denied", null)
          }
        },
        permission
      )
    }

    Function("stop") {
      nativeStop()
    }

    Function("getLatestPitch") {
      val raw = nativeGetLatestPitch()
      val noteName = buildString {
        val c0 = raw[4].toInt().toChar()
        val c1 = raw[5].toInt().toChar()
        val c2 = raw[6].toInt().toChar()
        if (c0.code != 0) append(c0)
        if (c1.code != 0) append(c1)
        if (c2.code != 0) append(c2)
      }

      mapOf(
        "frequency" to raw[0].toDouble(),
        "confidence" to raw[1].toDouble(),
        "note" to noteName,
        "octave" to raw[3].toInt(),
        "cents" to raw[2].toDouble(),
        "_dbgBuffers" to raw[7].toInt(),
        "_dbgDetects" to raw[8].toInt(),
        "_dbgRms" to raw[9].toDouble()
      )
    }

    Function("configure") { rmsThreshold: Double, nativeConfidence: Double ->
      nativeConfigure(rmsThreshold.toFloat(), nativeConfidence.toFloat())
    }

    Function("getLatencyMs") {
      nativeGetLatencyMs()
    }
  }
}
