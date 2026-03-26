import type { GuitarString, NoteCombo } from '../types';
import { CHROMATIC_NOTES, getNoteAtFret } from '../constants/fretboard';

export { CHROMATIC_NOTES, getNoteAtFret };

/** All 6 guitar strings */
const ALL_STRINGS: GuitarString[] = [1, 2, 3, 4, 5, 6];

/**
 * Generate all 72 unique NoteCombo objects (6 strings × 12 notes).
 * Uses frets 0–11 since the chromatic scale repeats every 12 frets.
 */
export function getAllCombos(): NoteCombo[] {
  const combos: NoteCombo[] = [];
  for (const string of ALL_STRINGS) {
    for (let fret = 0; fret < 12; fret++) {
      combos.push({
        string,
        fret,
        note: getNoteAtFret(string, fret),
      });
    }
  }
  return combos;
}
