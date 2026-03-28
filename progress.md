# Progress

## Completed Tasks
- 001–012: Full app built — scaffolding, fretboard data layer, state management (MMKV), pitch detection, quiz engine, all screens (home, quiz, results, stats/mastery, settings), sound effects & visual polish.
- 013–021: Custom native pitch detection module replacing JS-based detection — C++ DSP core (YIN + NoteMapper), iOS audio capture (AVAudioEngine), Android audio capture (Oboe), JSI TurboModule binding, signal smoothing/latency validation, test suite, and swap into app.

## Architecture Notes

### Pitch Detection Pipeline
```
Settings UI (1–10 steppers) → settingsStore (MMKV)
  → quiz.tsx maps via utils/detectionMapping.ts
  → usePitchDetector({ minConfidence, nativeRmsThreshold, nativeMinConfidence })
  → PitchDetectorModule.configure() before start()
  → Swift/Kotlin Module → ObjC++/JNI Bridge → C++ YIN
```

- **Native module location**: `modules/pitch-detector/`
- **Shared C++ sources**: `modules/pitch-detector/cpp/` — iOS copies these into `ios/generated_cpp/` via podspec staging (CocoaPods can't resolve sources outside podspec root).
- **PitchResult.note** must be note name only (e.g. `"D"`, not `"D2"`). `octave` and `cents` are separate fields.
- **Ring buffer capacity**: 16384 samples (must exceed hardware buffer delivery size — 48kHz delivers ~4800 frames/tap).
- **Sample rate**: All pipeline components must use the hardware rate (typically 48kHz). YIN, HighPassFilter, and RingBuffer are configured at runtime via `configureSampleRate:`.
- **Stale detection clearing**: After 3 consecutive no-pitch frames, stored result resets to zero.

### iOS-Specific
- Audio session: always reconfigure `.playAndRecord` with `[.defaultToSpeaker, .allowBluetooth]` on every engine start (expo-audio can reconfigure the session during sound playback).
- Engine recovery: observers on `AVAudioEngineConfigurationChange` and `routeChangeNotification` trigger `restartEngine()`.
- Audio tap uses hardware native format (not forced mono); channel 0 extracted in callback.
- Podspec uses `FileUtils.cp` to stage C++ sources from `../cpp/` into `ios/generated_cpp/`.

### Android-Specific
- Oboe 1.9.0 via prefab, requires `c++_shared` STL (`-DANDROID_STL=c++_shared` in build.gradle cmake block).
- `InputPreset::Unprocessed` for low-latency capture. `onErrorAfterClose` auto-restarts stream.
- JNI returns pitch as 7-element float array.
- Test on physical device — emulator mic is unreliable for pitch detection.

### Expo/Build
- `ios/` is gitignored (managed by Expo prebuild).
- Autolinking: `expo.autolinking.nativeModulesDir` set in `package.json`.
- `inhibit_all_warnings!` in Podfile suppresses dependency warnings.
- expo-audio (not expo-av) for SDK 55.

### Configurable Detection Settings
| Setting | UI Range | Level 1 | Level 5 (default) | Level 10 |
|---------|----------|---------|--------------------|----------|
| Sensitivity → JS minConfidence | 1–10 | 0.97 | 0.85 | 0.50 |
| Sensitivity → Native MIN_CONFIDENCE | 1–10 | 0.80 | 0.50 | 0.15 |
| Noise Gate → RMS_SILENCE_THRESHOLD | 1–10 | 0.002 | 0.01 | 0.10 |

## Debug Instrumentation (remove before release)
- `AudioCaptureManager.swift`: NSLog of hwFormat, session, engine state, per-tap RMS
- `PitchDetectorBridge.mm`: NSLog of sample rate, YIN output, accepted notes; extra debug fields in `getLatestPitch` (`_dbgBuffers`, `_dbgDetects`, `_dbgRms`)
- `PitchDetector.ts`: console.log of raw poll results with debug counters
