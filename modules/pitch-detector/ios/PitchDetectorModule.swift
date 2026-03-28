import ExpoModulesCore

public class PitchDetectorModule: Module {
    private lazy var audioCaptureManager = AudioCaptureManager()

    public func definition() -> ModuleDefinition {
        Name("PitchDetector")

        AsyncFunction("start") { (promise: Promise) in
            self.audioCaptureManager.start { error in
                if let error = error {
                    promise.reject("ERR_PITCH_START", error.localizedDescription)
                } else {
                    promise.resolve(nil)
                }
            }
        }

        Function("stop") {
            self.audioCaptureManager.stop()
        }

        Function("getLatestPitch") { () -> [String: Any] in
            return PitchDetectorBridge.shared().getLatestPitch() as [String: Any]
        }

        Function("configure") { (rmsThreshold: Double, nativeConfidence: Double) in
            PitchDetectorBridge.shared().configureRmsThreshold(
                Float(rmsThreshold),
                nativeConfidence: Float(nativeConfidence)
            )
        }

        Function("getLatencyMs") { () -> Double in
            return PitchDetectorBridge.shared().getLatencyMs()
        }
    }
}
