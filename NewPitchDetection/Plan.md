# Pitch Detection Module — Implementation Plan

## Overview

Add a real-time monophonic pitch detection module to an existing Expo (managed workflow) React Native app. The module captures audio natively, runs a C++ YIN algorithm via JSI, and exposes a simple hook to the JS layer. The app uses this to power a gamified note-matching challenge where the user plays a note and the system detects it in real-time.

**Target performance:** <15ms latency, ±1 cent accuracy, any instrument, E2–C8 range.

---

## Tech Stack

- **App:** Expo (managed) with config plugins, New Architecture enabled (Fabric + TurboModules)
- **Language:** TypeScript (JS layer), C++ (DSP), Swift (iOS audio), Kotlin (Android audio)
- **Audio input:** AVAudioEngine (iOS), Oboe/AAudio (Android)
- **DSP:** YIN algorithm in C++, exposed via JSI TurboModule
- **Build:** expo-modules-api for native module packaging with config plugin

---

## Project Structure

```
modules/
  pitch-detector/
    src/
      PitchDetector.ts              # JS API & hook (usePitchDetector)
      PitchDetectorModule.ts        # TurboModule spec
    ios/
      PitchDetectorModule.swift     # AVAudioEngine capture + JSI bridge
      PitchDetectorModule.mm        # ObjC++ bridge if needed
    android/
      src/main/java/.../
        PitchDetectorModule.kt      # Oboe setup + JNI bridge
      src/main/cpp/
        pitch-detector-jni.cpp      # JNI → C++ DSP calls
    cpp/
      yin.h                         # YIN algorithm header
      yin.cpp                       # YIN implementation
      pitch_result.h                # PitchResult struct
      note_mapper.h                 # Frequency → note/cents conversion
      note_mapper.cpp
      ring_buffer.h                 # Lock-free ring buffer for audio frames
    expo-module.config.json         # Expo module config
    plugin/
      src/index.ts                  # Config plugin entry
```

---

## Architecture

```
[Mic Input]
    │
    ▼
[Native Audio Layer]              ← AVAudioEngine (iOS) / Oboe (Android)
  Captures PCM float32 at 44100Hz
  Writes frames to ring buffer
    │
    ▼
[C++ DSP Engine]                  ← Called from audio callback thread
  Ring buffer → 2048-sample frame
  YIN algorithm → PitchResult { frequency, confidence }
  Note mapping → { note, octave, cents }
  Stores latest result atomically
    │
    ▼
[JSI TurboModule]                 ← Sync getter, no bridge overhead
  getLatestPitch() → PitchResult
    │
    ▼
[React Hook: usePitchDetector]    ← Polls at 30–60fps via requestAnimationFrame
  Returns { frequency, note, octave, cents, confidence, isActive }
```

---

## DSP Specification

### YIN Algorithm

**Input:** 2048 samples of float32 PCM at 44100Hz
**Output:** PitchResult { frequency (Hz), confidence (0–1) }

Steps:
1. **Difference function:** d(τ) = Σ (x[i] - x[i+τ])² for τ = 0..W/2
2. **Cumulative mean normalized difference:** d'(τ) = d(τ) / ((1/τ) * Σ d(j)) for j=1..τ
3. **Absolute threshold:** Find first τ where d'(τ) < 0.15 (configurable)
4. **Parabolic interpolation:** Refine τ using neighbors for sub-sample accuracy
5. **Frequency:** f = sampleRate / τ_refined

### Note Mapping

```
midiNote = 12 * log2(frequency / 440) + 69
nearestMidi = round(midiNote)
cents = (midiNote - nearestMidi) * 100
noteName = NOTE_NAMES[nearestMidi % 12]
octave = floor(nearestMidi / 12) - 1
```

### Ring Buffer

- Lock-free single-producer single-consumer
- Audio thread writes, DSP reads
- Size: 4096 samples (2x frame size for overlap)

---

## Configuration Constants

```cpp
constexpr int SAMPLE_RATE = 44100;
constexpr int FRAME_SIZE = 2048;        // ~46ms window
constexpr int HOP_SIZE = 1024;          // 50% overlap → ~23ms between detections
constexpr float YIN_THRESHOLD = 0.15f;
constexpr float MIN_FREQUENCY = 65.0f;  // C2
constexpr float MAX_FREQUENCY = 4200.0f; // C8
constexpr float MIN_CONFIDENCE = 0.85f; // Below this → "no pitch detected"
```

---

## API Contract

### JS/TS Interface

```typescript
type PitchResult = {
  frequency: number;    // Hz, 0 if no pitch
  note: string;         // e.g. "A", "C#"
  octave: number;       // e.g. 4
  cents: number;        // -50 to +50
  confidence: number;   // 0–1
};

type PitchDetectorStatus = 'idle' | 'starting' | 'active' | 'error';

interface UsePitchDetectorReturn {
  pitch: PitchResult | null;
  status: PitchDetectorStatus;
  start: () => Promise<void>;
  stop: () => void;
}

function usePitchDetector(options?: {
  pollRate?: number;          // fps, default 30
  minConfidence?: number;     // default 0.85
}): UsePitchDetectorReturn;
```

### Native Module Methods (TurboModule spec)

```typescript
interface PitchDetectorModule {
  start(): Promise<void>;     // Request mic permission + start audio capture
  stop(): void;               // Stop capture, release resources
  getLatestPitch(): {         // Sync JSI call, returns last detected pitch
    frequency: number;
    confidence: number;
    note: string;
    octave: number;
    cents: number;
  };
}
```

---

## Testing Strategy

### Synthetic Signal Tests (Unit)
- Generate sine waves at known frequencies (A4=440Hz, E2=82.4Hz, C8=4186Hz)
- Feed into YIN, verify output within ±1 cent
- Test with low-amplitude signals (confidence should drop)
- Test with silence (should return frequency=0)

### Integration Tests
- Virtual instrument audio played through computer mic
- Verify end-to-end: mic → native → C++ → JSI → JS hook
- Measure round-trip latency (target <15ms from audio frame to JS result)

### Edge Cases
- Rapid note changes (staccato)
- Harmonics and overtones
- Background noise
- Very low / very high frequencies at range boundaries

---

## Dependencies

- `expo-modules-core` — for expo module API and config plugins
- No third-party audio libraries — raw AVAudioEngine and Oboe
- CMake — for C++ compilation on Android
- C++17 standard

---

## Constraints

- Expo managed workflow — all native code goes through config plugins, no manual Xcode/Gradle edits
- No heap allocations in audio callback or DSP hot path
- No JS bridge calls from audio thread — JSI sync only
- Audio session must coexist with other app audio (respect AVAudioSession category)
- Microphone permission must be requested at runtime