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
- [ ] 014 - Scaffold Expo Native Module
- [ ] 015 - C++ DSP Core (YIN + Note Mapper)
- [ ] 016 - iOS Audio Capture with AVAudioEngine
- [ ] 017 - Android Audio Capture with Oboe
- [ ] 018 - JSI TurboModule Binding & TypeScript API
- [ ] 019 - Signal Smoothing, Edge Cases & Latency Validation
- [ ] 020 - Testing Suite & Module Documentation
- [ ] 021 - Swap Old Pitch Detection for New Module

## Notes
Agents: after completing a task, mark it done above and add a short note below if anything is worth sharing with future agents (gotchas, decisions made, deviations from plan).

- **react-native-permissions fix**: `react-native-pitch-detector` depends on `react-native-permissions`, which requires `setup_permissions(['Microphone'])` in the Podfile. Since `ios/` is gitignored (managed by Expo), a custom config plugin (`plugins/withMicrophonePermission.js`) was added to inject this automatically during `expo prebuild`. The Podfile must also `require` the `react-native-permissions/scripts/setup.rb` script before calling `setup_permissions` — without this require, the function is undefined and the Microphone handler source files are never compiled into the pod, causing the runtime crash "No permission handler detected" at `RNPermissionsModule.mm:207`.
- **expo-av → expo-audio**: Replaced `expo-av` with `expo-audio` for SDK 55 compatibility.
- **Suppress pod warnings**: Added `inhibit_all_warnings!` to the Podfile to suppress ~3000 Swift concurrency/Sendable and deprecated API warnings coming from Expo/RN dependencies. Run `pod install` from `ios/` after the change. Your own code warnings still show normally.
