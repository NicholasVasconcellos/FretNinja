/** Chromatic note names */
export type Note =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B';

/** Guitar string number (1 = high E, 6 = low E) */
export type GuitarString = 1 | 2 | 3 | 4 | 5 | 6;

/** A specific fretboard location */
export interface NoteCombo {
  string: GuitarString;
  fret: number; // 0–24
  note: Note;
}

/** Result of a single quiz question */
export interface QuestionResult {
  combo: NoteCombo;
  expectedNote: Note;
  playedNote: Note | null;
  correct: boolean;
  responseTimeMs: number;
}

/** Result of a full quiz round */
export interface RoundResult {
  questions: QuestionResult[];
  totalCorrect: number;
  totalQuestions: number;
  accuracy: number; // 0–1
  averageResponseTimeMs: number;
  date: string; // ISO timestamp
}

/** Mastery level for a note combo */
export type MasteryLevel = 'new' | 'learning' | 'familiar' | 'mastered';

/** Mastery tracking for a single note combo */
export interface ComboMastery {
  combo: NoteCombo;
  level: MasteryLevel;
  correctCount: number;
  incorrectCount: number;
  lastSeen: string | null; // ISO timestamp
  streak: number;
}

/** How guitar strings are labeled in the UI */
export type StringLabelStyle = 'number' | 'name';

/** App-wide settings */
export interface AppSettings {
  questionsPerRound: number;
  selectedStrings: GuitarString[];
  minFret: number;
  maxFret: number;
  timerEnabled: boolean;
  timerDurationSec: number;
  soundEnabled: boolean;
  smartWeighting: boolean;
  showFretboardAfterAnswer: boolean;
  stringLabelStyle: StringLabelStyle;
  /** Detection sensitivity 1-10 (lower = stricter, less noise) */
  detectionSensitivity: number;
  /** Noise gate level 1-10 (higher = ignores quieter sounds) */
  noiseGate: number;
  /** Minimum ms a correct note must be held before it counts (0 = instant) */
  noteDurationMs: number;
}
