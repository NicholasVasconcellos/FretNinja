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

## Notes
Agents: after completing a task, mark it done above and add a short note below if anything is worth sharing with future agents (gotchas, decisions made, deviations from plan).

- **react-native-permissions fix**: `react-native-pitch-detector` depends on `react-native-permissions`, which requires `setup_permissions(['Microphone'])` in the Podfile. Since `ios/` is gitignored (managed by Expo), a custom config plugin (`plugins/withMicrophonePermission.js`) was added to inject this automatically during `expo prebuild`. The Podfile must also `require` the `react-native-permissions/scripts/setup.rb` script before calling `setup_permissions` — without this require, the function is undefined and the Microphone handler source files are never compiled into the pod, causing the runtime crash "No permission handler detected" at `RNPermissionsModule.mm:207`.
- **expo-av → expo-audio**: Replaced `expo-av` with `expo-audio` for SDK 55 compatibility.
- **Suppress pod warnings**: Added `inhibit_all_warnings!` to the Podfile to suppress ~3000 Swift concurrency/Sendable and deprecated API warnings coming from Expo/RN dependencies. Run `pod install` from `ios/` after the change. Your own code warnings still show normally.
- **014 — Expo module autolinking**: Added `expo.autolinking.nativeModulesDir` to `package.json` (unlisted file) to enable autolinking for local modules in `modules/`. The iOS side requires a podspec at `modules/pitch-detector/ios/PitchDetector.podspec`. The plugin `tsconfig.json` needs `noEmit: false` to override the expo base config. Android `build.gradle` configures CMake with C++17 and a stub `stub.cpp` until task 015 adds real sources. Import `requireNativeModule` from `"expo"` (not `"expo-modules-core"`) per SDK 55 docs. Only apply `org.jetbrains.kotlin.android` in build.gradle (not the redundant `kotlin-android` alias).
- **016 — iOS audio capture**: Updated podspec to include `../cpp/` sources with `public_header_files` limited to `PitchDetectorBridge.h` (keeps C++ headers out of the Swift umbrella). Audio session checks for existing `.playAndRecord` category before reconfiguring (expo-audio coexistence). `start()` is now `AsyncFunction` (returns Promise) — TS type in `PitchDetectorModule.ts` still says `void`, needs updating in task 018.
- **019 — Signal smoothing & latency**: EMA smoothing (alpha 0.35) with auto-reset on >1 semitone jumps, silence, or low confidence. High-pass filter (60Hz IIR) applied before buffering on both platforms. RMS silence detection skips YIN. Clipping flagged in PitchResult. `getLatencyMs()` exposed on both platforms via `std::chrono::steady_clock` timestamps. `usePitchDetector` accepts `debug: true` to include latency in return. Unlisted files touched: `pitch_result.h`, `PitchDetectorBridge.h/.mm`, `OboeAudioCapture.h`, `pitch-detector-jni.cpp`, `PitchDetectorModule.kt`, `types.ts`.
- **017 — Android audio capture**: Oboe 1.9.0 via prefab. `OboeAudioCapture` uses low-latency exclusive mode with `InputPreset::Unprocessed`. JNI returns pitch data as a 7-element float array (frequency, confidence, cents, octave, note chars). `onErrorAfterClose` auto-restarts the stream for audio focus recovery. `start()` is `AsyncFunction` (handles RECORD_AUDIO permission). The old `stub.cpp` is no longer needed — CMakeLists now compiles real sources.
