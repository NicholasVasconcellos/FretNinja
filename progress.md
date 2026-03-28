# Progress

- [x] 001 - Project Scaffolding & Foundation
- [x] 002 - Fretboard Data Layer & Utility Functions
- [x] 003 - State Management & Persistence
- [x] 004 - Pitch Detection Integration
- [x] 005 - Quiz Engine
- [x] 006 - Home Screen
- [x] 007 - Quiz Screen UI & Components
- [x] 008 - Fretboard Diagram Component
- [x] 009 - Results Screen
- [x] 010 - Stats & Mastery Dashboard
- [x] 011 - Settings Screen
- [x] 012 - Sound Effects & Visual Polish
- [x] 013 - Audit Current Pitch Detection Implementation
- [x] 014 - Scaffold Expo Native Module
- [x] 015 - C++ DSP Core (YIN + Note Mapper)
- [x] 016 - iOS Audio Capture with AVAudioEngine
- [x] 017 - Android Audio Capture with Oboe
- [x] 018 - JSI TurboModule Binding & TypeScript API
- [x] 019 - Signal Smoothing, Edge Cases & Latency Validation
- [x] 020 - Testing Suite & Module Documentation
- [x] 021 - Swap Old Pitch Detection for New Module

## Build Fix Session (2026-03-26)

### Issue 1 — Missing pod source
Build error: `react-native-permissions/ios/RNPermissionsModule.mm` not found.

**Root Cause:** `react-native-permissions` was in Podfile/Podfile.lock but NOT in package.json and NOT imported anywhere in source code. Stale pod reference.

**Fix:**
1. Removed `react-native-permissions` from Podfile — deleted `require`/`setup_permissions` block. Microphone permission already in Info.plist.
2. Ran `pod install` — removed stale pods: `RNPermissions`, `Beethoven`, `Pitchy`, `react-native-pitch-detector`.

### Issue 2 — Undefined symbols for YIN/NoteMapper (linker error)
After fixing Issue 1, the build failed at link time with undefined symbols for `YIN::detect()` and `NoteMapper::mapToNote()`.

**Root Cause:** CocoaPods `source_files` globs are evaluated relative to the podspec directory (`modules/pitch-detector/ios/`). The shared C++ DSP sources live in `modules/pitch-detector/cpp/` (a parent-relative path). Two approaches were tried and failed:
- **Symlink** (`ios/cpp -> ../cpp`): Ruby's `Dir.glob` does not follow symlinks, so CocoaPods never saw the `.cpp` files.
- **Parent path in glob** (`../cpp/*.{h,hpp,cpp}`): CocoaPods silently ignores source files outside the podspec root directory.

**Fix — physical staging via `prepare_command`-style copy:**
Updated `PitchDetector.podspec` to copy shared C++ sources into `ios/generated_cpp/` at pod-evaluation time using `FileUtils.cp`. The podspec then compiles from `generated_cpp/` which is inside its own directory. Key changes:
1. Added `require 'fileutils'` and a staging block that copies `../cpp/*.{h,hpp,cpp}` into `ios/generated_cpp/`, excluding test files.
2. Changed `source_files` to `['*.{h,m,mm,swift}', 'generated_cpp/*.{h,hpp,cpp}']`.
3. Updated `HEADER_SEARCH_PATHS` to include `generated_cpp/`.
4. Removed the old `ios/cpp` symlink (no longer needed).

### Result
iOS build succeeds with zero errors. Both `yin.cpp` and `note_mapper.cpp` compile and link correctly into the PitchDetector pod.

## iOS Pitch Detection Debug Session (2026-03-26)

**Symptom:** Quiz screen shows "Hearing" label with "—" (no note) and "Listening" (mic active). No notes ever detected regardless of what is played. App does not crash.

### Root Cause Analysis (three issues found)

**Issue 1 — Sample rate mismatch between audio tap and YIN detector**
The previous commit (`e39be03`) fixed the audio tap to use the hardware sample rate (48000 Hz) instead of hardcoded 44100 Hz, preventing a format mismatch crash. However, the C++ YIN detector and HighPassFilter were still initialized with the default 44100 Hz. This would cause `frequency = 44100 / tau` instead of `48000 / tau` (~9% pitch error, every note maps wrong).

**Fix:** Added `configureSampleRate:` method to `PitchDetectorBridge` that reinitializes both `_yin` and `_highPass` with the actual hardware sample rate. Called from `AudioCaptureManager.swift` after reading `hwFormat.sampleRate`.

Files changed:
- `modules/pitch-detector/ios/PitchDetectorBridge.h` — added `configureSampleRate:` declaration
- `modules/pitch-detector/ios/PitchDetectorBridge.mm` — implemented `configureSampleRate:` method
- `modules/pitch-detector/ios/AudioCaptureManager.swift` — calls `bridge.configureSampleRate(Float(hwFormat.sampleRate))`

**Issue 2 — Audio session and tap format problems**
Two sub-issues prevented the audio tap from firing:

a) `loadSounds()` (expo-audio) calls `setAudioModeAsync({ allowsRecording: true })` which sets the session to `.playAndRecord` before our engine starts. The old code had `if session.category != .playAndRecord` which skipped reconfiguring, leaving expo-audio's options (which may not route the mic properly). Fix: always call `setCategory(.playAndRecord, options: [.defaultToSpeaker, .allowBluetooth])`.

b) The tap was installed with a forced-mono `desiredFormat` while the hardware provides stereo. On newer iOS versions, this format conversion can cause the tap to silently never fire. Fix: install the tap with `hwFormat` (native format) and extract channel 0 in the callback.

Also changed `.allowBluetoothA2DP` back to `.allowBluetooth` (A2DP is output-only, doesn't support mic input).

**Issue 3 — Ring buffer too small for 48 kHz buffer deliveries (THE MAIN BLOCKER)**
This was the actual reason `dets=0` (YIN never ran). The ring buffer capacity was 4096 samples, but the hardware at 48 kHz delivers **4800 frames per tap callback**. Each `write()` silently truncated because 4800 > 4096, and the ring buffer never accumulated the `FRAME_SIZE` (2048) samples needed to trigger YIN detection.

**Fix:** Increased `RingBuffer::CAPACITY` from 4096 to 16384 (enough for ~3 full buffer deliveries at 48 kHz).

Files changed:
- `modules/pitch-detector/cpp/ring_buffer.h` — CAPACITY 4096 → 16384
- `modules/pitch-detector/ios/generated_cpp/ring_buffer.h` — same change (staged copy)

### Debug instrumentation still in place (remove before release)
The following debug logging was added during investigation and remains in the codebase:

- **`AudioCaptureManager.swift`**: NSLog of hwFormat, session category, engine state, per-tap RMS (first 5 + every 100th)
- **`PitchDetectorBridge.mm`**: NSLog of configureSampleRate value, per-detection YIN output (first 10 + every 50th), accepted note logs. `getLatestPitch` returns extra `_dbgBuffers`, `_dbgDetects`, `_dbgRms` fields. Added `_bufferCallCount`, `_lastRms`, `_detectCallCount` ivars.
- **`PitchDetector.ts`**: console.log of raw poll results with debug counters (first 10 + every 60th). Added `pollCountRef`.

### Status (after initial fixes)
Issues 1–3 applied. Rebuilt and tested — `dets=428, bufs=92` confirmed YIN is running. However two new problems surfaced (see below).

### Key Gotcha for Future Reference
When changing audio sample rates on iOS, ALL components in the pipeline must agree: audio session → AVAudioEngine tap format → HighPassFilter → RingBuffer capacity → YIN detector. The ring buffer must be sized for the actual buffer delivery size at the hardware rate, not the old 44100 Hz assumptions.

## iOS Pitch Detection Follow-up (2026-03-26)

**Symptom:** After the three fixes above, `dets` and `bufs` are non-zero (detection IS running), but:
1. When nothing is played, a ghost **D2 (73.57 Hz, conf 0.87)** is detected from ambient electrical hum/noise.
2. `bufs` freezes at 92 (~9 seconds of audio) — the audio tap stops delivering buffers entirely.

### Issue 4 — Ghost note: stale detection result never cleared

`getLatestPitch` always returns the last *successful* detection. When the signal goes quiet (RMS < 0.01), YIN returns no-pitch, but the old result (D2 from initial mic noise) persists forever. The quiz then submits this ghost note.

**Fix:** Added `_noPitchCount` counter in `PitchDetectorBridge.mm`. After 3 consecutive frames with no valid pitch (~60ms), the stored result is cleared to `frequency=0, confidence=0, note=""`.

### Issue 5 — Audio engine tap dies after sound effect playback

The ghost D2 triggers a quiz answer → `playCorrectSound()` / `playWrongSound()` fires → expo-audio's `AudioPlayer.play()` reconfigures the `AVAudioSession` options under the hood (e.g. adding `duckOthers`, removing `defaultToSpeaker`). This disrupts the `AVAudioEngine` input tap, which silently stops delivering buffers. There was no recovery mechanism.

**Fix:** Refactored `AudioCaptureManager.swift`:
- Extracted engine setup into reusable `setupAndStartEngine()` (reconfigures session, reinstalls tap, restarts engine).
- Added observers for `AVAudioEngineConfigurationChange` and `AVAudioSession.routeChangeNotification`.
- On interruption end, always calls `restartEngine()` regardless of `shouldResume` flag.
- `restartEngine()` dispatches async with guard against concurrent restarts.
- Session reconfiguration (`setCategory(.playAndRecord, options: [.defaultToSpeaker, .allowBluetooth])`) happens on every engine start to reclaim control from expo-audio.

### Status
Both fixes applied. Rebuilt and confirmed YIN detection is running (`dets` and `bufs` incrementing, ACCEPTED notes logged). However detected notes were not reaching the UI (see Issue 6 below).

## iOS Pitch Detection — UI Not Updating (2026-03-26)

### Issue 6 — Note field included octave, mismatching the Note type

**Symptom:** Console logs `[PitchDebug] ACCEPTED note=D2 freq=73.6 conf=0.87` but the quiz UI never reacts — no correct/incorrect feedback, PitchIndicator stays blank.

**Root Cause:** `getLatestPitch` in `PitchDetectorBridge.mm` returned the `note` field as `"D2"` (note name + octave concatenated via `[NSString stringWithFormat:@"%s%d", ...]`). The TypeScript `PitchResult` type expects `note` to be just the note name (e.g. `"D"`), with `octave` and `cents` as separate numeric fields. The quiz screen casts `pitch.note` to the `Note` union type (`"C" | "C#" | "D" | ...`), so `"D2"` never matched any valid note and `submitDetectedNote` silently did nothing.

Additionally, the native return dictionary was missing the `octave` and `cents` fields entirely, so those were always `undefined` on the JS side.

**Fix:** Changed `getLatestPitch` to return:
- `note`: just the note name string (e.g. `"D"`, not `"D2"`)
- `octave`: integer octave number (e.g. `2`)
- `cents`: float cents offset from the nearest semitone

File changed: `modules/pitch-detector/ios/PitchDetectorBridge.mm`

## Configurable Detection Thresholds (2026-03-28)

Added user-facing controls for the pitch detection pipeline's key thresholds. Previously all values were hardcoded constants; now they're adjustable from the Settings screen via two 1–10 steppers (level 5 = original defaults).

### Parameters exposed

| Setting | UI Range | Maps to | Level 1 | Level 5 (default) | Level 10 |
|---------|----------|---------|---------|-------------------|----------|
| **Sensitivity** | 1–10 | JS `minConfidence` | 0.97 | 0.85 | 0.50 |
| | | Native `MIN_CONFIDENCE` | 0.80 | 0.50 | 0.15 |
| **Noise Gate** | 1–10 | `RMS_SILENCE_THRESHOLD` | 0.002 | 0.01 | 0.10 |

### Data flow

```
Settings UI (steppers) → settingsStore (MMKV)
  → quiz.tsx reads store, maps via utils/detectionMapping.ts
  → usePitchDetector({ minConfidence, nativeRmsThreshold, nativeMinConfidence })
  → hook calls PitchDetectorModule.configure() before start()
  → Swift Module → ObjC++ Bridge → C++ YIN member variables
```

### Files changed
- **types/index.ts** — added `detectionSensitivity`, `noiseGate` to `AppSettings`
- **stores/settingsStore.ts** — defaults (both 5)
- **utils/detectionMapping.ts** — NEW: lookup tables mapping 1–10 → technical values
- **modules/pitch-detector/ios/generated_cpp/yin.h** — `MIN_CONFIDENCE` and `RMS_SILENCE_THRESHOLD` replaced with member variables + setters
- **modules/pitch-detector/ios/generated_cpp/yin.cpp** — uses `rms_threshold_` / `min_confidence_` members
- **modules/pitch-detector/ios/PitchDetectorBridge.h/.mm** — added `configureRmsThreshold:nativeConfidence:` method
- **modules/pitch-detector/ios/PitchDetectorModule.swift** — added `configure(rmsThreshold, nativeConfidence)` function
- **modules/pitch-detector/src/PitchDetectorModule.ts** — added `configure()` to TS interface
- **modules/pitch-detector/src/types.ts** — added `nativeRmsThreshold`, `nativeMinConfidence` options
- **modules/pitch-detector/src/PitchDetector.ts** — calls `configure()` before `start()`
- **app/quiz.tsx** — reads settings, maps to thresholds, passes to hook
- **app/(tabs)/settings.tsx** — added "DETECTION" section with Sensitivity and Noise Gate steppers

## Android Build Session (2026-03-28)

### Environment Setup
Installed from scratch on macOS (no Android Studio):
- JDK 17 via `brew install openjdk@17`
- Android SDK via `brew install --cask android-commandlinetools`
- SDK components: platform-tools, platforms;android-35, build-tools;35.0.0, ndk;27.0.12077973, emulator, system-images;android-35;google_apis;arm64-v8a
- Created `android/local.properties` with `sdk.dir=/opt/homebrew/share/android-commandlinetools`
- AVD: FretNinja_Test (Pixel 6, API 35, arm64-v8a)

### Issue 1 — Oboe requires shared STL
**Error:** `CXX1212 ... User is using a static STL but library requires a shared STL [//oboe/oboe]`

**Root Cause:** Oboe 1.9.0 (via prefab) is built against `c++_shared`, but the pitch-detector module's CMake defaulted to `c++_static`.

**Fix:** Added `arguments "-DANDROID_STL=c++_shared"` to the cmake block in `modules/pitch-detector/android/build.gradle`.

### Issue 2 — getLatestPitch returns note+octave (same as iOS Issue 6)
**Root Cause:** `PitchDetectorModule.kt` returned `"$noteName$octave"` (e.g. `"D2"`) in the `note` field. TypeScript `PitchResult.note` expects just the note name (e.g. `"D"`), with `octave` as a separate numeric field.

**Fix:** Changed to return `noteName` (without octave) and added separate `"octave" to octave` entry in the result map.

### Result
Android build succeeds. App launches and renders all screens correctly in emulator (API 35, arm64-v8a). Only one build fix needed (shared STL) — significantly smoother than iOS.

### Emulator Mic/Audio Limitations
- **Microphone**: The pitch-detector module uses Oboe with `InputPreset::Unprocessed` for low-latency audio capture. The emulator does support virtual mic input but quality/latency is unreliable. **Recommendation: test pitch detection on a physical device.**
- **Audio permissions**: RECORD_AUDIO permission is declared in AndroidManifest.xml and requested at runtime via `PitchDetectorModule.kt`. The emulator auto-grants this in debug builds.
- **Sound effects**: expo-audio playback works in the emulator (tested with `-no-audio` flag which disables host audio but doesn't crash the app).

### Build Verification Script
`scripts/verify-android-build.sh` — automated 11-point check covering:
- Environment (JDK 17, SDK, NDK)
- Gradle assembleDebug success
- APK exists with correct native libs (libpitch-detector.so + liboboe.so for all 4 ABIs)

## Notes
Agents: after completing a task, mark it done above and add a short note below if anything is worth sharing with future agents (gotchas, decisions made, deviations from plan).

- **react-native-permissions fix**: `react-native-pitch-detector` depends on `react-native-permissions`, which requires `setup_permissions(['Microphone'])` in the Podfile. Since `ios/` is gitignored (managed by Expo), a custom config plugin (`plugins/withMicrophonePermission.js`) was added to inject this automatically during `expo prebuild`. The Podfile must also `require` the `react-native-permissions/scripts/setup.rb` script before calling `setup_permissions` — without this require, the function is undefined and the Microphone handler source files are never compiled into the pod, causing the runtime crash "No permission handler detected" at `RNPermissionsModule.mm:207`.
- **expo-av → expo-audio**: Replaced `expo-av` with `expo-audio` for SDK 55 compatibility.
- **Suppress pod warnings**: Added `inhibit_all_warnings!` to the Podfile to suppress ~3000 Swift concurrency/Sendable and deprecated API warnings coming from Expo/RN dependencies. Run `pod install` from `ios/` after the change. Your own code warnings still show normally.
- **014 — Expo module autolinking**: Added `expo.autolinking.nativeModulesDir` to `package.json` (unlisted file) to enable autolinking for local modules in `modules/`. The iOS side requires a podspec at `modules/pitch-detector/ios/PitchDetector.podspec`. The plugin `tsconfig.json` needs `noEmit: false` to override the expo base config. Android `build.gradle` configures CMake with C++17 and a stub `stub.cpp` until task 015 adds real sources. Import `requireNativeModule` from `"expo"` (not `"expo-modules-core"`) per SDK 55 docs. Only apply `org.jetbrains.kotlin.android` in build.gradle (not the redundant `kotlin-android` alias).
- **016 — iOS audio capture**: Updated podspec to include `../cpp/` sources with `public_header_files` limited to `PitchDetectorBridge.h` (keeps C++ headers out of the Swift umbrella). Audio session checks for existing `.playAndRecord` category before reconfiguring (expo-audio coexistence). `start()` is now `AsyncFunction` (returns Promise) — TS type in `PitchDetectorModule.ts` still says `void`, needs updating in task 018.
- **019 — Signal smoothing & latency**: EMA smoothing (alpha 0.35) with auto-reset on >1 semitone jumps, silence, or low confidence. High-pass filter (60Hz IIR) applied before buffering on both platforms. RMS silence detection skips YIN. Clipping flagged in PitchResult. `getLatencyMs()` exposed on both platforms via `std::chrono::steady_clock` timestamps. `usePitchDetector` accepts `debug: true` to include latency in return. Unlisted files touched: `pitch_result.h`, `PitchDetectorBridge.h/.mm`, `OboeAudioCapture.h`, `pitch-detector-jni.cpp`, `PitchDetectorModule.kt`, `types.ts`.
- **017 — Android audio capture**: Oboe 1.9.0 via prefab. `OboeAudioCapture` uses low-latency exclusive mode with `InputPreset::Unprocessed`. JNI returns pitch data as a 7-element float array (frequency, confidence, cents, octave, note chars). `onErrorAfterClose` auto-restarts the stream for audio focus recovery. `start()` is `AsyncFunction` (handles RECORD_AUDIO permission). The old `stub.cpp` is no longer needed — CMakeLists now compiles real sources.
