# pitch-detector

A custom Expo native module for real-time monophonic pitch detection. Uses a C++17 YIN algorithm shared across iOS (AVAudioEngine) and Android (Oboe), exposed to React Native via JSI TurboModules.

## Installation

This module lives in `modules/pitch-detector/` and is autolinked by Expo. No separate install step is needed.

1. Ensure `expo.autolinking.nativeModulesDir` is set in your root `package.json`:
   ```json
   {
     "expo": {
       "autolinking": {
         "nativeModulesDir": "./modules"
       }
     }
   }
   ```
2. Run `npx expo prebuild` to generate native projects.
3. Build and run:
   ```bash
   npx expo run:ios
   npx expo run:android
   ```

The module requires microphone permission. The Expo config plugin at `plugin/` handles `NSMicrophoneUsageDescription` (iOS) and `RECORD_AUDIO` (Android) automatically.

## API Reference

### `usePitchDetector(options?)`

React hook that provides real-time pitch detection.

```tsx
import { usePitchDetector } from "../modules/pitch-detector/src";

const { pitch, status, start, stop, debug } = usePitchDetector({
  pollRate: 30,        // Hz — how often to poll native for results (default: 30)
  minConfidence: 0.85, // 0–1 — discard readings below this (default: 0.85)
  debug: false,        // enable latency reporting (default: false)
});
```

#### Options

| Option          | Type      | Default | Description                                    |
| --------------- | --------- | ------- | ---------------------------------------------- |
| `pollRate`      | `number`  | `30`    | Polling frequency in Hz                        |
| `minConfidence` | `number`  | `0.85`  | Minimum confidence to report a pitch           |
| `debug`         | `boolean` | `false` | When true, `debug.latencyMs` is populated      |

#### Return Value

| Field    | Type                   | Description                              |
| -------- | ---------------------- | ---------------------------------------- |
| `pitch`  | `PitchResult \| null`  | Latest detected pitch, or null           |
| `status` | `PitchDetectorStatus`  | `"idle"` \| `"starting"` \| `"active"`  |
| `start`  | `() => Promise<void>`  | Request mic permission and begin capture |
| `stop`   | `() => void`           | Stop capture and release audio resources |
| `debug`  | `DebugInfo \| null`    | Latency info (only when `debug: true`)   |

#### `PitchResult`

```ts
{
  frequency: number;  // Hz (e.g. 440.0)
  confidence: number; // 0–1
  note: string;       // "A", "C#", etc.
  octave: number;     // MIDI octave (e.g. 4)
  cents: number;      // deviation from nearest note (-50 to +50)
}
```

## Architecture

Audio flows from the platform microphone through a native audio engine (AVAudioEngine on iOS, Oboe on Android) into a lock-free ring buffer. A shared C++ DSP layer reads frames from the ring buffer, applies a high-pass filter (60 Hz IIR cutoff), performs RMS silence detection, runs the YIN pitch detection algorithm with parabolic interpolation, and applies EMA smoothing. The result (frequency + confidence) is mapped to a musical note via the NoteMapper. The TypeScript `usePitchDetector` hook polls the native module at a configurable rate via JSI synchronous calls.

```
Microphone
  -> AVAudioEngine / Oboe (platform-specific capture)
    -> High-pass filter (60 Hz IIR)
      -> RingBuffer (lock-free SPSC, 4096 samples)
        -> YIN pitch detection (2048-sample frames)
          -> EMA smoothing (alpha 0.35)
            -> NoteMapper (frequency -> note/octave/cents)
              -> JSI TurboModule -> usePitchDetector hook
```

## Performance

| Metric              | Value                                         |
| ------------------- | --------------------------------------------- |
| Sample rate         | 44,100 Hz                                     |
| Frame size          | 2,048 samples (~46 ms)                        |
| Hop size            | 1,024 samples (~23 ms)                        |
| End-to-end latency  | ~50–80 ms (capture + DSP + JS poll)            |
| Frequency range     | 65 Hz (C2) – 4,200 Hz (C8)                   |
| Accuracy (mid-range)| ±1 cent (220–880 Hz, clean signal)            |
| Accuracy (extremes) | ±5 cents (E2, C8)                             |
| CPU usage           | < 5% on modern devices (single DSP thread)    |

## Known Limitations

- **Monophonic only** — detects the fundamental frequency of a single note. Chords and polyphonic input will produce unreliable results.
- **String ambiguity** — pitch detection cannot determine which guitar string is being played (e.g., E4 on string 1 fret 0 vs string 2 fret 5). The app uses an honor-system approach.
- **Extreme frequencies** — accuracy degrades below ~80 Hz and above ~3,500 Hz due to limited cycles per frame.
- **Noisy environments** — background noise below SNR ~15 dB can cause false detections or low confidence.

## Future Work

- Polyphonic / chord detection
- Onset detection for faster note transitions
- Configurable tuning reference (A4 != 440 Hz)
- Spectral analysis visualization

## Running Tests

C++ unit tests cover the YIN algorithm, ring buffer, and note mapper:

```bash
cd modules/pitch-detector/cpp/tests
./run_tests.sh
```

The test screen at `app/pitch-test.tsx` provides live manual validation with real or virtual instruments.
