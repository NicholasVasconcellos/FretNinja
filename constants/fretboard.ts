import type { GuitarString, Note } from '../types';

/** All 12 chromatic notes in order */
export const CHROMATIC_NOTES: Note[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
];

/** Open note for each string in standard tuning (string 1 = high E) */
export const STANDARD_TUNING: Record<GuitarString, Note> = {
  1: 'E',
  2: 'B',
  3: 'G',
  4: 'D',
  5: 'A',
  6: 'E',
};

/** String labels for display */
export const STRING_LABELS: Record<GuitarString, string> = {
  1: '1st (high E)',
  2: '2nd (B)',
  3: '3rd (G)',
  4: '4th (D)',
  5: '5th (A)',
  6: '6th (low E)',
};

export const MIN_FRET = 0;
export const MAX_FRET = 24;
export const TOTAL_STRINGS = 6;

/** Get the note at a specific string and fret */
export function getNoteAtFret(string: GuitarString, fret: number): Note {
  const openNote = STANDARD_TUNING[string];
  const openIndex = CHROMATIC_NOTES.indexOf(openNote);
  return CHROMATIC_NOTES[(openIndex + fret) % 12];
}
