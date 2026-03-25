# FretNinja

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

## Agent Instructions

You are executing tasks from `tasks/`. Follow this workflow:

1. Check `progress.md` to find the next incomplete task.
2. Read the task file (e.g., `tasks/001.md`).
3. Read only the files listed in "Files to Touch" before starting work. Avoid reading files outside this list unless strictly necessary for the task.
4. Implement the task according to its steps and acceptance criteria.
5. Verify all acceptance criteria are met.
6. Update `progress.md`: mark the task done and add a note if relevant.

Stay focused on the current task. Do not work ahead or modify files outside the task's scope unless required to complete it.
