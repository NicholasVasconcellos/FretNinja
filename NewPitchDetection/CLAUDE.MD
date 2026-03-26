# Pitch Detection Module

## Tech Stack

- **Runtime:** React Native (Expo managed workflow, New Architecture enabled)
- **Language:** TypeScript (JS), C++17 (DSP), Swift (iOS native), Kotlin (Android native)
- **Audio:** AVAudioEngine (iOS), Oboe (Android) — no third-party audio libraries
- **Bridge:** JSI / TurboModules (no legacy bridge)
- **Build:** expo-modules-api, config plugins, CMake (Android C++)
- **DSP:** YIN algorithm, lock-free ring buffer, EMA smoothing

## Project Structure

```
modules/
  pitch-detector/
    src/              # TypeScript API, hook, TurboModule spec
    ios/              # Swift AVAudioEngine + ObjC++ bridge
    android/
      src/main/java/  # Kotlin TurboModule
      src/main/cpp/   # Oboe capture + JNI bindings
    cpp/              # Shared C++ DSP (YIN, ring buffer, note mapper)
    plugin/           # Expo config plugin
```

## Conventions

- C++: no heap allocations in audio callback or DSP hot path. Use float32 everywhere.
- All audio processing happens on native threads. JS only polls results via sync JSI.
- Follow standard conventions for each language (Swift naming, Kotlin idioms, C++ RAII).
- TypeScript: strict mode, explicit types for public API.

## Key Constants

- Sample rate: 44100Hz
- Frame size: 2048 samples
- YIN threshold: 0.15
- Frequency range: 65Hz (C2) – 4200Hz (C8)
- Min confidence: 0.85

## Agent Instructions

You are executing tasks from `tasks/`. Follow this workflow:

1. Check `progress.md` to find the next incomplete task.
2. Read the task file (e.g., `tasks/001.md`).
3. Read only the files listed in "Files to Touch" before starting work. Avoid reading files outside this list unless strictly necessary for the task.
4. Implement the task according to its steps and acceptance criteria.
5. Verify all acceptance criteria are met.
6. Update `progress.md`: mark the task done and add a note if relevant.
7. Git commit all changes with message: "task NNN: [task title]"

Stay focused on the current task. Do not work ahead or modify files outside the task's scope unless required to complete it.
