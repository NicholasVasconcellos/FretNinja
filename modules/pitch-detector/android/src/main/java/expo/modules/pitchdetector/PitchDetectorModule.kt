package expo.modules.pitchdetector

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PitchDetectorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PitchDetector")

    Function("start") {
      // Stub — will be implemented in task 017
    }

    Function("stop") {
      // Stub — will be implemented in task 017
    }

    Function("getLatestPitch") {
      mapOf(
        "frequency" to 440.0,
        "note" to "A4",
        "confidence" to 0.0
      )
    }
  }
}
