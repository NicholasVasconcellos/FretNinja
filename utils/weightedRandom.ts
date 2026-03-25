import type { ComboMastery, NoteCombo } from '../types';

/** High base weight for combos that have never been attempted */
const UNATTEMPTED_WEIGHT = 5;

/**
 * Select a weighted-random NoteCombo biased toward low-accuracy and low-attempt combos.
 * Prevents immediate repeats by excluding lastCombo.
 */
export function selectWeightedCombo(
  masteryRecords: ComboMastery[],
  lastCombo?: NoteCombo
): NoteCombo {
  // Filter out the last combo to prevent immediate repeats
  const candidates = lastCombo
    ? masteryRecords.filter(
        (r) =>
          r.combo.string !== lastCombo.string || r.combo.fret !== lastCombo.fret
      )
    : masteryRecords;

  if (candidates.length === 0) {
    // Fallback: if filtering removed everything (only 1 combo), use all records
    return masteryRecords[0].combo;
  }

  const weights = candidates.map((record) => {
    const totalAttempts = record.correctCount + record.incorrectCount;
    if (totalAttempts === 0) {
      return UNATTEMPTED_WEIGHT;
    }
    const accuracy = record.correctCount / totalAttempts;
    return (1 - accuracy) + (1 / totalAttempts);
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < candidates.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return candidates[i].combo;
    }
  }

  // Fallback (shouldn't reach here due to floating point)
  return candidates[candidates.length - 1].combo;
}
