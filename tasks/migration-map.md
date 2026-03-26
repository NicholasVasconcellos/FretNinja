# Migration Map: react-native-pitch-detector → Custom Native Module

Created by Task 013. This document is the reference for Task 021 (swap).

---

## 1. Files That Import `react-native-pitch-detector`

| File | Usage |
|------|-------|
| `hooks/usePitchDetection.ts` | `import { PitchDetector } from 'react-native-pitch-detector'` — main wrapper hook; calls `PitchDetector.start()`, `.stop()`, `.addListener()`, `.removeListener()` |
| `app/quiz.tsx` | `import { usePitchDetection } from '../hooks/usePitchDetection'` — consumes the hook (indirect dependency) |

## 2. Supporting Files (No Direct Import, but Coupled)

| File | Role | Migration Impact |
|------|------|-----------------|
| `utils/notes.ts` | `frequencyToNote()` and `centsOffPitch()` — frequency-to-note conversion using A440 equal temperament | Will be superseded by C++ note mapper in the new module; can be removed or kept as TS fallback |
| `components/PitchIndicator.tsx` | UI component displaying `detectedNote` (Note \| null) and `frequency` (number \| null) | No change needed — consumes the same interface shape |
| `plugins/withMicrophonePermission.js` | Expo config plugin injecting `react-native-permissions` `setup_permissions(['Microphone'])` into the iOS Podfile | Can be removed once `react-native-permissions` is removed; the new module will request mic permission natively |
| `utils/sounds.ts` | Calls `setAudioModeAsync({ allowsRecording: true })` to configure AVAudioSession to `.playAndRecord` category | Critical interaction — see Section 5 |

## 3. Dependency Chain

### Direct Dependencies (package.json)

| Package | Version | Purpose |
|---------|---------|---------|
| `react-native-pitch-detector` | `^0.1.6` | Pitch detection (wraps Beethoven on iOS) |

### Transitive / Supporting Dependencies

| Package | Relationship | Purpose |
|---------|-------------|---------|
| `react-native-permissions` | Required by `react-native-pitch-detector` | Microphone permission handling |
| `Beethoven` (CocoaPod) | Pulled in by `react-native-pitch-detector.podspec` | iOS pitch detection engine (Swift, uses AVAudioEngine internally) |
| `patch-package` (devDependency) | Applies `patches/react-native-pitch-detector+0.1.6.patch` via `postinstall` script | Patches the podspec for New Architecture compatibility |

### Patch File

**Path:** `patches/react-native-pitch-detector+0.1.6.patch`

**What it does:** Removes the `RCT_NEW_ARCH_ENABLED` conditional block and Folly compiler flags from the podspec. The original podspec conditionally adds Folly/TurboModule dependencies for New Architecture, but this caused build issues. The patch strips those flags and dependencies, keeping only the `React-Core` and `Beethoven` pod dependencies.

### Files to Remove on Swap

- `patches/react-native-pitch-detector+0.1.6.patch`
- `plugins/withMicrophonePermission.js`
- Remove `react-native-pitch-detector` from `package.json` dependencies
- Remove `react-native-permissions` if no other consumer (currently only used by pitch detector)
- Remove `withMicrophonePermission` from `app.json` / `app.config` plugins array (if present)

## 4. Interface Contract of `usePitchDetection`

### Return Type

```typescript
interface PitchDetectionState {
  detectedNote: Note | null;   // Nearest note name, or null if nothing detected
  frequency: number | null;     // Raw frequency in Hz, or null
  isListening: boolean;         // Whether the detector is actively listening
  start: () => Promise<void>;   // Start listening for pitch
  stop: () => Promise<void>;    // Stop listening
}
```

### Filtering Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_CENTS_DEVIATION` | 40 | Maximum cents off-pitch to accept a detection (confidence filter) |
| `MIN_FREQUENCY` | 60 Hz | Below low E guitar (~82 Hz) with margin |
| `MAX_FREQUENCY` | 1400 Hz | Above high E 24th fret (~1319 Hz) with margin |

### Listener Data Shape

The native module emits events with shape `{ frequency: number; tone: string }`. The hook uses only `frequency`; `tone` is ignored.

### Lifecycle Behavior

1. **Start:** `PitchDetector.start()` — sets `isListening = true`, clears previous detection
2. **Stop:** `PitchDetector.stop()` — sets `isListening = false` (in `finally` block, always runs)
3. **App backgrounding:** When app state changes to `background` or `inactive`, calls `PitchDetector.stop()` (but keeps `isListeningRef.current = true` so it knows to restart)
4. **App foregrounding:** When app state changes to `active`, calls `PitchDetector.start()` if was previously listening
5. **Unmount cleanup:** Calls `PitchDetector.stop()` and resets ref
6. **Guard against double-start:** Uses `isListeningRef` to prevent duplicate `start()` calls

### Detection Pipeline

1. Native module emits `{ frequency, tone }` via event listener
2. Frequency range filter: reject if `freq < 60` or `freq > 1400`
3. Cents deviation filter: reject if `|centsOffPitch(freq)| > 40`
4. Convert to note name via `frequencyToNote(freq)`
5. Set `detectedNote` and `frequency` state

## 5. Audio Session Interaction

### Current Flow (quiz.tsx, line 36)

```
loadSounds() → pitch.start()
```

`loadSounds()` **must** be called before `pitch.start()`. This is because:

1. `loadSounds()` (in `utils/sounds.ts`) calls:
   ```typescript
   setAudioModeAsync({
     playsInSilentMode: true,
     interruptionMode: 'duckOthers',
     allowsRecording: true,        // ← KEY: sets AVAudioSession to .playAndRecord
     shouldPlayInBackground: false,
     shouldRouteThroughEarpiece: false,
   })
   ```

2. This configures the iOS AVAudioSession category to `.playAndRecord`, which allows simultaneous audio input (microphone) and output (SFX).

3. `react-native-pitch-detector` (via Beethoven) then starts its own AVAudioEngine tap on the microphone input node.

### Critical Constraint for New Module

The new module's AVAudioEngine must coexist with this `expo-audio` session configuration:
- The session category must remain `.playAndRecord` so both SFX playback and mic capture work
- `loadSounds()` must still be called before starting the pitch detector (or the new module must set the session category itself)
- If the new module manages its own AVAudioSession configuration, it must not conflict with `expo-audio`'s expectations

### Recommended Approach

The new native module should:
1. Either rely on the host app to set `.playAndRecord` (current pattern), OR
2. Set the audio session category itself if not already set, being careful not to override an existing `.playAndRecord` session
