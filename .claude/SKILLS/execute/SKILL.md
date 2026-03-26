---
name: execute
description: >
  Implement a task from the file attached via @ mention. Usage: /execute @tasks/004.md
disable-model-invocation: true
---

## Task Execution Steps

1. The task file is already in context (attached via `@`). Parse it for steps, acceptance criteria, and "Files to Touch."
2. Read **only** the files listed in "Files to Touch" — these are the files you will read AND write. Do NOT explore the codebase or scan directories. If you hit an import error, missing type, or incomplete definition, you may read the **direct dependency** (e.g., an `#include`d header, an imported module) needed to resolve it — then stop. Do not read beyond one hop.
3. Implement the task according to its steps and acceptance criteria.
4. Verify all acceptance criteria are met:
   - Run `npx tsc --noEmit` to catch TypeScript type errors.
   - For tasks touching `modules/pitch-detector/cpp/`: verify C++ compiles by running `clang++ -std=c++17 -fsyntax-only <changed .cpp files>` (syntax check only, no link).
5. Atomically update progress and commit:
   - Stage all changed files including `progress.md`.
   - Update `progress.md`: mark the task `- [x]` and add a brief note if relevant. Notes should be concise — only include what subsequent agents need to know.
   - Git commit **all** staged changes (code + `progress.md`) in a single commit with message: `task $TASK_NUM: $TASK_TITLE` and a concise explanation of all changes made. Do not include "Co-Authored-By" in the commit.
   - If the commit fails, do not leave `progress.md` updated without a corresponding code commit.
6. After committing, verify the working tree is clean with `git status --porcelain`. If dirty, something was missed — fix it.

## Rules

**Do NOT read the codebase.** You have everything you need in the task file, the "Files to Touch" list, and the project context below. Resist any urge to "understand the project first" — that is out of scope. The one exception: you may read a direct dependency file (one hop) if a build or type error forces you to.

**Do NOT modify files outside the task's "Files to Touch" list** unless a build error requires it. If you must touch an unlisted file, note it in your progress.md entry.

One task per invocation. Stay focused on the current task's scope. Do not work ahead.

Tasks 013–021 include an `<!-- Agent Context -->` HTML comment at the top with DSP constants (sample rate, frame size, YIN threshold, frequency range) and tech stack context. Use these values as authoritative when implementing.

## Project

Name: Fret Ninja

A mobile app that helps guitarists memorize the fretboard by quizzing them on note locations with real-time pitch detection.

## Tech Stack

- **Framework:** React Native (Expo, prebuild/bare workflow)
- **Navigation:** Expo Router (file-based routing)
- **Language:** TypeScript
- **Pitch Detection:** `react-native-pitch-detector` (current); migrating to custom C++17 YIN-based Expo native module in `modules/pitch-detector/` (tasks 013–021)
- **State Management:** Zustand
- **Local Storage:** MMKV (react-native-mmkv)
- **Audio/SFX:** expo-audio (SDK 55+)
- **Styling:** NativeWind / Tailwind or StyleSheet (dark + neon theme)

## Project Structure

```
app/
  _layout.tsx              # Root layout (fonts, providers)
  quiz.tsx                 # Quiz screen (stack)
  results.tsx              # Results screen (stack)
  (tabs)/
    _layout.tsx            # Tab navigator config
    index.tsx              # Home
    stats.tsx              # Stats dashboard
    settings.tsx           # Settings
components/                # Reusable UI components
hooks/                     # Custom hooks (pitch detection, quiz engine, mastery data)
modules/
  pitch-detector/          # Custom Expo native module (C++17 YIN, Swift/Kotlin)
    cpp/                   # Shared C++ DSP (YIN, ring buffer, note mapper)
    ios/                   # Swift + ObjC++ bridge (AVAudioEngine)
    android/               # Kotlin + JNI (Oboe)
    src/                   # TypeScript API (usePitchDetector hook)
    plugin/                # Expo config plugin
utils/                     # Pure logic (notes, scoring, weighted random, sounds)
stores/                    # Zustand stores (settings, mastery, round state)
constants/                 # Theme, fretboard data
types/                     # Shared TypeScript types
assets/
  sounds/                  # SFX files
  images/                  # Logo, mascot
  fonts/
```

## Key Data

- 12 notes × 6 strings = 72 possible combos
- Frets 0–24, standard tuning (EADGBE)
- Mastery levels: new → learning → familiar → mastered

## Conventions

- Dark theme with neon accents (green #39FF14, electric blue, hot pink/red)
- Note matching only (string is honor system — pitch detection can't determine which string)
- All data local for MVP (no backend)
- Zustand for state, MMKV for persistence
- Follow standard React Native / Expo conventions
