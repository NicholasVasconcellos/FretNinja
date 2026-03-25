# FretNinja — App Plan

## Overview

A mobile app that helps guitarists memorize the fretboard by quizzing them on note locations. The app listens to the guitar via the microphone, detects the played note using real-time pitch detection, and provides instant feedback.

**Tagline:** Slice through the fretboard.

---

## Core Concept

- Prompt: "Play **[Note]** on **String [N]**"
- 12 notes × 6 strings = 72 possible combos
- User plays the note on their guitar
- App detects pitch via microphone in real-time
- Note name matching only (honor system for string)
- Frets 0–24 (full neck)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native (Expo, bare/prebuild workflow) |
| Navigation | Expo Router (file-based) |
| Language | TypeScript |
| Pitch Detection | Native module (e.g., `react-native-pitch-detector` or custom FFT/autocorrelation via expo-av + native bridge) |
| Local Storage | AsyncStorage or MMKV (mastery data, settings) |
| Backend (future) | Supabase (leaderboards, cloud sync) |
| Audio/SFX | expo-av or react-native-sound (ninja slice SFX) |
| Styling | NativeWind / Tailwind or StyleSheet (dark + neon theme) |

---

## Design Direction

- **Theme:** Dark mode with neon/vibrant accents (Fruit Ninja energy)
- **Palette:** Deep black/dark gray backgrounds, neon green (#39FF14), electric blue, hot pink/red accents for errors
- **Mascot:** Guitar-pick ninja character — static logo/branding for MVP
- **Typography:** Bold, clean, slightly aggressive/gaming feel
- **Feedback:** Ninja slice SFX on correct, visual "X" on wrong

---

## Screens & Navigation

### Tab Layout (Bottom Tabs)

```
(tabs)/
  ├── index.tsx        → Home
  ├── stats.tsx        → Stats / Mastery Dashboard
  └── settings.tsx     → Settings
```

### Stack Screens (Outside Tabs)

```
app/
  ├── _layout.tsx      → Root layout
  ├── (tabs)/          → Tab navigator (above)
  ├── quiz.tsx         → Active Quiz Screen
  └── results.tsx      → Round Results Summary
```

---

## Screen Specifications

### 1. Home Screen (`(tabs)/index.tsx`)

- FretNinja logo + mascot
- **"Start Training"** button (large, neon-accented)
- Quick stats summary (total rounds played, accuracy %)
- Round length selector (5 / 10 / 15 / 20 — default 10)
- Visual flair: subtle background animation or glow effects

### 2. Quiz Screen (`quiz.tsx`)

- **Prompt area:** "Play **C** on **String 2**" (large, centered)
- **Timer bar:** Horizontal bar burning down per question (configurable seconds per question)
- **Score counter:** Top corner (e.g., "3/10")
- **Pitch detection indicator:** Shows what note the mic is currently hearing (small, bottom or side — helps user tune/debug)
- **Feedback overlay:**
  - Correct: Green flash + ninja slice SFX + checkmark
  - Wrong: Red "X" + brief buzz/thud
- **Fretboard diagram (toggleable):** After each answer, highlights where the correct note lives on the prompted string (fret position)
- **Auto-advance:** On correct detection, auto-skip to next prompt after brief delay (~0.5s)
- **Mic status indicator:** Shows mic is active/listening

### 3. Results Screen (`results.tsx`)

- Round summary: Score (e.g., 8/10), accuracy %, average response time
- Per-question breakdown: Note + string prompted, correct/wrong, time taken
- Weakest combos highlighted
- **"Play Again"** and **"Home"** buttons

### 4. Stats / Mastery Dashboard (`(tabs)/stats.tsx`)

- **Overall stats:** Total rounds, lifetime accuracy, total notes played
- **72-combo heatmap/grid:** 12 notes × 6 strings, color-coded by mastery level (red → yellow → green)
- Mastery based on: accuracy + average response time per combo
- **Weakest 5 combos** list
- **Recently improved** combos
- Trend line (accuracy over time, optional for MVP)

### 5. Settings (`(tabs)/settings.tsx`)

- **Round length:** 5 / 10 / 15 / 20 questions
- **Fret range:** Slider or picker (0–12, 0–24, custom range)
- **String labeling:** Numbers (1–6) or names (E, B, G, D, A, E)
- **Show fretboard after answer:** Toggle on/off
- **Timer per question:** Off / 5s / 10s / 15s / 30s
- **Smart weighting:** Toggle (when on, quiz prioritizes weak combos)
- **Mic sensitivity / calibration** (stretch goal)

---

## Data Models

### NoteCombo

```typescript
interface NoteCombo {
  note: Note;         // 'A' | 'A#' | 'B' | ... | 'G#'
  string: GuitarString; // 1 | 2 | 3 | 4 | 5 | 6
}
```

### QuestionResult

```typescript
interface QuestionResult {
  combo: NoteCombo;
  correct: boolean;
  responseTimeMs: number;
  detectedNote: Note | null;
  timestamp: number;
}
```

### RoundResult

```typescript
interface RoundResult {
  id: string;
  date: number;
  questions: QuestionResult[];
  score: number;
  totalQuestions: number;
  accuracy: number;
  avgResponseTimeMs: number;
}
```

### ComboMastery (persisted locally)

```typescript
interface ComboMastery {
  combo: NoteCombo;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  avgResponseTimeMs: number;
  lastAttempted: number;
  masteryLevel: 'new' | 'learning' | 'familiar' | 'mastered';
}
```

### Settings (persisted locally)

```typescript
interface AppSettings {
  roundLength: 5 | 10 | 15 | 20;
  fretRange: { min: number; max: number };
  stringLabeling: 'numbers' | 'names';
  showFretboardAfterAnswer: boolean;
  timerPerQuestion: number | null; // seconds, null = off
  smartWeighting: boolean;
}
```

---

## Smart Weighting Algorithm

When `smartWeighting` is enabled, the quiz generator biases toward weak combos:

1. Score each of the 72 combos: `weight = (1 - accuracy) + (1 / totalAttempts)` — low accuracy and low attempts = higher weight
2. New/unattempted combos get a high base weight
3. Use weighted random selection to pick the next prompt
4. Guarantee no immediate repeats

---

## File Structure

```
fretninja/
├── app/
│   ├── _layout.tsx              # Root layout (fonts, providers)
│   ├── quiz.tsx                 # Quiz screen
│   ├── results.tsx              # Results screen
│   └── (tabs)/
│       ├── _layout.tsx          # Tab navigator config
│       ├── index.tsx            # Home
│       ├── stats.tsx            # Stats dashboard
│       └── settings.tsx         # Settings
├── components/
│   ├── FretboardDiagram.tsx     # Visual fretboard with note highlighting
│   ├── NotePrompt.tsx           # "Play C on String 2" display
│   ├── TimerBar.tsx             # Countdown bar
│   ├── ScoreCounter.tsx         # Current score display
│   ├── PitchIndicator.tsx       # Shows currently detected note
│   ├── FeedbackOverlay.tsx      # Correct/wrong visual feedback
│   ├── MasteryGrid.tsx          # 12×6 heatmap for stats screen
│   └── RoundLengthPicker.tsx    # Round length selector
├── hooks/
│   ├── usePitchDetection.ts     # Mic access + pitch detection logic
│   ├── useQuizEngine.ts         # Quiz state machine (prompt, check, advance)
│   └── useMasteryData.ts       # CRUD for local mastery storage
├── utils/
│   ├── notes.ts                 # Note/string constants, fret-to-note mapping
│   ├── weightedRandom.ts        # Smart weighting algorithm
│   ├── scoring.ts               # Score/mastery calculations
│   └── sounds.ts                # SFX playback helpers
├── stores/
│   ├── settingsStore.ts         # Persisted settings (MMKV or AsyncStorage)
│   ├── masteryStore.ts          # Persisted mastery data
│   └── roundStore.ts            # Current round state
├── constants/
│   ├── theme.ts                 # Colors, fonts, spacing
│   └── fretboard.ts             # Guitar tuning, fret-to-note lookup table
├── assets/
│   ├── sounds/                  # Slice SFX, wrong SFX
│   ├── images/                  # Logo, mascot
│   └── fonts/
└── types/
    └── index.ts                 # Shared TypeScript types
```

---

## Key Technical Decisions

### Pitch Detection Approach

Since Expo managed workflow doesn't support raw audio stream access, using **Expo prebuild** (bare workflow) to integrate a native pitch detection library:

- **Option A:** `react-native-pitch-detector` — wraps platform-native pitch detection (iOS: AVAudioEngine, Android: AudioRecord). Simplest path.
- **Option B:** Custom native module using YIN or autocorrelation algorithm on raw audio buffer.
- **Fallback:** If native pitch detection proves too complex for MVP, use a "tap the fret" UI as an interim input method.

The `usePitchDetection` hook should abstract this so the rest of the app just receives `{ detectedNote: 'C' | null, confidence: number }`.

### State Management

- **Zustand** or React Context for quiz session state (lightweight, no Redux overhead)
- **MMKV** for persisted data (settings, mastery) — faster than AsyncStorage
- No backend for MVP — all data local

### Fret-to-Note Mapping

Standard tuning lookup table covering frets 0–24 for all 6 strings. This is a static constant — no computation needed at runtime.

```
String 6 (low E): E F F# G G# A A# B C C# D D# E ...
String 5 (A):     A A# B C C# D D# E F F# G G# A ...
String 4 (D):     D D# E F F# G G# A A# B C C# D ...
String 3 (G):     G G# A A# B C C# D D# E F F# G ...
String 2 (B):     B C C# D D# E F F# G G# A A# B ...
String 1 (high E): E F F# G G# A A# B C C# D D# E ...
```

---

## MVP Milestones

1. **Project setup:** Expo prebuild, Expo Router, theme constants, types
2. **Fretboard data layer:** Note constants, fret-to-note mapping, weighted random generator
3. **Pitch detection integration:** Native module setup, `usePitchDetection` hook
4. **Quiz engine:** `useQuizEngine` hook — prompt generation, answer checking, scoring, round flow
5. **Quiz screen UI:** Prompt display, timer bar, score counter, feedback overlay, pitch indicator
6. **Fretboard diagram component:** Visual fretboard with note highlighting (toggleable)
7. **Results screen:** Round summary + per-question breakdown
8. **Mastery system:** Local persistence, mastery calculations, smart weighting
9. **Stats dashboard:** Heatmap grid, weakest combos, overall stats
10. **Settings screen:** All toggles and pickers
11. **Sound effects:** Ninja slice on correct, buzz on wrong
12. **Polish:** Animations, transitions, neon glow effects, logo/branding

---

## Future Features (Post-MVP)

- Ear training mode (app plays a note, user identifies it)
- Leaderboard with friends (Supabase backend)
- Real songs mode (convert songs to note sequences, display in time)
- Timed mode (as many as possible in 60s)
- Mic sensitivity calibration screen
- Multiple tuning support (Drop D, Open G, etc.)
- Achievement badges / streak tracking
