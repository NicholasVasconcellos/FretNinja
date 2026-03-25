import type { GuitarString, Note, NoteCombo } from '../types';
import { CHROMATIC_NOTES, getNoteAtFret } from '../constants/fretboard';

export { CHROMATIC_NOTES, getNoteAtFret };

/** A440 reference frequency */
const A4_FREQUENCY = 440;

/** MIDI note number of A4 */
const A4_MIDI = 69;

/**
 * Convert a frequency (Hz) to the nearest note name.
 * Uses standard A440 equal temperament tuning.
 * Returns null if frequency is outside the useful guitar range.
 */
export function frequencyToNote(frequency: number): Note | null {
  if (frequency < 60 || frequency > 1400) return null;

  const midiNote = Math.round(12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI);
  const noteIndex = ((midiNote % 12) + 12) % 12; // 0=C, 1=C#, ... 11=B
  return CHROMATIC_NOTES[noteIndex];
}

/**
 * Calculate how many cents the frequency deviates from the nearest note.
 * Useful for confidence filtering — large deviations suggest noise.
 */
export function centsOffPitch(frequency: number): number {
  const midiExact = 12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI;
  const midiRounded = Math.round(midiExact);
  return (midiExact - midiRounded) * 100;
}

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
