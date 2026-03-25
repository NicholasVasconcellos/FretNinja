---
name: execute
description: >
  Implement a task from the file attached via @ mention. Usage: /execute @tasks/004.md
disable-model-invocation: true
---

## Task Execution Steps

1. The task file is already in context (attached via `@`). Parse it for steps, acceptance criteria, and "Files to Touch."
2. Read **only** the files listed in "Files to Touch" — these are the files you will read AND write. Do NOT read any other files. Do NOT explore the codebase, scan directories, or read files outside this list. If you hit an import error or missing type, read only the specific file needed to resolve it, then stop exploring.
3. Implement the task according to its steps and acceptance criteria.
4. Verify all acceptance criteria are met. Run `npx tsc --noEmit` to catch type errors.
5. Update `progress.md`: mark the task `- [x]` and add a brief note if relevant. Notes should be concise — only include what subsequent agents need to know.
6. Git commit all changes (including `progress.md`) with message: `task $TASK_NUM: $TASK_TITLE` and a consise explanation of all changes made, sacrifice grammar for the sake of concision. Do not include "Co-Authored-By" in the commit.

## Rules

**Do NOT read the codebase.** You have everything you need in the task file, the "Files to Touch" list, and the project context below. Resist any urge to "understand the project first" — that is out of scope. Only read a file outside the list if a build/type error forces you to, and read only that one file.

One task per invocation. Stay focused on the current task's scope. Do not work ahead or modify files outside the task's scope unless required to complete it.

## Project

Name: Fret Ninja

A mobile app that helps guitarists memorize the fretboard by quizzing them on note locations with real-time pitch detection.

## Tech Stack

- **Framework:** React Native (Expo, prebuild/bare workflow)
- **Navigation:** Expo Router (file-based routing)
- **Language:** TypeScript
- **Pitch Detection:** Native module (react-native-pitch-detector or custom FFT/autocorrelation via native bridge)
- **State Management:** Zustand
- **Local Storage:** MMKV (react-native-mmkv)
- **Audio/SFX:** expo-av
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
