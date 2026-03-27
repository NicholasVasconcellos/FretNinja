import AVFoundation

class AudioCaptureManager: NSObject {
    private var engine: AVAudioEngine?
    private var isRunning = false

    func start(completion: @escaping (Error?) -> Void) {
        guard !isRunning else {
            completion(nil)
            return
        }

        let session = AVAudioSession.sharedInstance()

        session.requestRecordPermission { [weak self] granted in
            guard let self = self else { return }

            guard granted else {
                completion(NSError(domain: "PitchDetector", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Microphone permission denied"]))
                return
            }

            do {
                // Only reconfigure if not already .playAndRecord (coexist with expo-audio)
                if session.category != .playAndRecord {
                    try session.setCategory(.playAndRecord,
                        options: [.defaultToSpeaker, .allowBluetoothA2DP])
                }
                try session.setActive(true)

                let engine = AVAudioEngine()
                let inputNode = engine.inputNode
                let hwFormat = inputNode.outputFormat(forBus: 0)

                let desiredFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32,
                    sampleRate: hwFormat.sampleRate, channels: 1, interleaved: false)!

                let bridge = PitchDetectorBridge.shared()

                inputNode.installTap(onBus: 0, bufferSize: 2048, format: desiredFormat) { buffer, _ in
                    guard let floatData = buffer.floatChannelData else { return }
                    bridge.processAudioBuffer(floatData[0], frameCount: UInt32(buffer.frameLength))
                }

                try engine.start()

                self.engine = engine
                self.isRunning = true

                NotificationCenter.default.addObserver(self,
                    selector: #selector(self.handleInterruption(_:)),
                    name: AVAudioSession.interruptionNotification,
                    object: nil)

                completion(nil)
            } catch {
                completion(error)
            }
        }
    }

    func stop() {
        guard isRunning else { return }

        NotificationCenter.default.removeObserver(self,
            name: AVAudioSession.interruptionNotification, object: nil)

        engine?.inputNode.removeTap(onBus: 0)
        engine?.stop()
        engine = nil
        isRunning = false

        PitchDetectorBridge.shared().reset()
    }

    @objc private func handleInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }

        switch type {
        case .began:
            engine?.pause()
        case .ended:
            let options = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
            if AVAudioSession.InterruptionOptions(rawValue: options).contains(.shouldResume) {
                try? engine?.start()
            }
        @unknown default:
            break
        }
    }

    deinit {
        stop()
    }
}
