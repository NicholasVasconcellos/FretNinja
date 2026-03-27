import AVFoundation

class AudioCaptureManager: NSObject {
    private var engine: AVAudioEngine?
    private var isRunning = false
    private var isRestarting = false

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
                try self.setupAndStartEngine()
                self.isRunning = true

                // Session-level observers (added once, removed in stop)
                NotificationCenter.default.addObserver(self,
                    selector: #selector(self.handleInterruption(_:)),
                    name: AVAudioSession.interruptionNotification,
                    object: nil)
                NotificationCenter.default.addObserver(self,
                    selector: #selector(self.handleRouteChange(_:)),
                    name: AVAudioSession.routeChangeNotification,
                    object: nil)

                completion(nil)
            } catch {
                completion(error)
            }
        }
    }

    // MARK: - Engine lifecycle

    /// Configure audio session, install tap, and start engine.
    /// Safe to call for initial setup or to restart after disruption.
    private func setupAndStartEngine() throws {
        let session = AVAudioSession.sharedInstance()

        // Always reconfigure — expo-audio sound playback may have changed
        // the session options (e.g. added duckOthers, removed defaultToSpeaker).
        try session.setCategory(.playAndRecord,
            options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true)

        // Tear down previous engine if restarting
        if let old = engine {
            NotificationCenter.default.removeObserver(self,
                name: .AVAudioEngineConfigurationChange, object: old)
            old.inputNode.removeTap(onBus: 0)
            old.stop()
        }

        let newEngine = AVAudioEngine()
        let inputNode = newEngine.inputNode
        let hwFormat = inputNode.outputFormat(forBus: 0)

        guard hwFormat.sampleRate > 0 && hwFormat.channelCount > 0 else {
            throw NSError(domain: "PitchDetector", code: 3,
                userInfo: [NSLocalizedDescriptionKey: "Input node has invalid format"])
        }

        let bridge = PitchDetectorBridge.shared()
        bridge.configureSampleRate(Float(hwFormat.sampleRate))

        // Use the hardware's native format to avoid silent tap failures
        // from format conversion on newer iOS versions.
        inputNode.installTap(onBus: 0, bufferSize: 2048, format: hwFormat) { buffer, _ in
            guard let floatData = buffer.floatChannelData else { return }
            bridge.processAudioBuffer(floatData[0], frameCount: UInt32(buffer.frameLength))
        }

        try newEngine.start()
        self.engine = newEngine

        // Per-engine observer — detects hardware config changes (sample rate, channel count)
        NotificationCenter.default.addObserver(self,
            selector: #selector(handleConfigurationChange(_:)),
            name: .AVAudioEngineConfigurationChange,
            object: newEngine)
    }

    private func restartEngine() {
        guard isRunning, !isRestarting else { return }
        isRestarting = true

        // Dispatch off the notification's thread to avoid deadlock
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self, self.isRunning else {
                self?.isRestarting = false
                return
            }
            do {
                try self.setupAndStartEngine()
                NSLog("[PitchDetector] engine restarted successfully")
            } catch {
                NSLog("[PitchDetector] restart failed: %@", error.localizedDescription)
            }
            self.isRestarting = false
        }
    }

    func stop() {
        guard isRunning else { return }
        isRunning = false

        NotificationCenter.default.removeObserver(self)

        engine?.inputNode.removeTap(onBus: 0)
        engine?.stop()
        engine = nil

        PitchDetectorBridge.shared().reset()
    }

    // MARK: - Notification handlers

    @objc private func handleConfigurationChange(_ notification: Notification) {
        // Engine hardware config changed (e.g. sample rate, channel layout).
        // The engine has already stopped — must reinstall tap and restart.
        guard isRunning else { return }
        restartEngine()
    }

    @objc private func handleRouteChange(_ notification: Notification) {
        // Audio route changed (headphones, Bluetooth, etc.).
        // Only restart if the engine actually stopped.
        guard isRunning, engine?.isRunning != true else { return }
        restartEngine()
    }

    @objc private func handleInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }

        switch type {
        case .began:
            engine?.pause()
        case .ended:
            // Always attempt restart regardless of shouldResume flag —
            // expo-audio sound effects can trigger interruptions that
            // don't set the shouldResume option.
            restartEngine()
        @unknown default:
            break
        }
    }

    deinit {
        stop()
    }
}
