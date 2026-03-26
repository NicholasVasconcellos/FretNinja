import ExpoModulesCore

public class PitchDetectorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PitchDetector")

    Function("start") {
      // Stub — will be implemented in task 016
    }

    Function("stop") {
      // Stub — will be implemented in task 016
    }

    Function("getLatestPitch") { () -> [String: Any] in
      return [
        "frequency": 440.0,
        "note": "A4",
        "confidence": 0.0
      ]
    }
  }
}
