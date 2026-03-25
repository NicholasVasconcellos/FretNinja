import { useMemo } from 'react';
import { useMasteryStore } from '../stores/masteryStore';
import type { ComboMastery } from '../types';

export function useMasteryData() {
  const combos = useMasteryStore((s) => s.combos);
  const totalRounds = useMasteryStore((s) => s.totalRounds);

  return useMemo(() => {
    const all = Object.values(combos);
    const attempted = all.filter((c) => c.correctCount + c.incorrectCount > 0);

    const totalCorrect = all.reduce((sum, c) => sum + c.correctCount, 0);
    const totalIncorrect = all.reduce((sum, c) => sum + c.incorrectCount, 0);
    const totalAttempts = totalCorrect + totalIncorrect;
    const overallAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;

    // Weakest 5: lowest accuracy among attempted, then all 'new' combos
    const weakest5 = [...all]
      .sort((a, b) => {
        const aTotal = a.correctCount + a.incorrectCount;
        const bTotal = b.correctCount + b.incorrectCount;
        const aAcc = aTotal > 0 ? a.correctCount / aTotal : -1;
        const bAcc = bTotal > 0 ? b.correctCount / bTotal : -1;
        return aAcc - bAcc;
      })
      .slice(0, 5);

    // Recently improved: last seen, sorted by most recent, that have level > 'new'
    const recentlyImproved = attempted
      .filter((c) => c.level !== 'new' && c.lastSeen)
      .sort((a, b) => (b.lastSeen! > a.lastSeen! ? 1 : -1))
      .slice(0, 5);

    const masteryDistribution = {
      new: all.filter((c) => c.level === 'new').length,
      learning: all.filter((c) => c.level === 'learning').length,
      familiar: all.filter((c) => c.level === 'familiar').length,
      mastered: all.filter((c) => c.level === 'mastered').length,
    };

    return {
      weakest5,
      recentlyImproved,
      overallAccuracy,
      totalRounds,
      totalAttempts,
      masteryDistribution,
      combosCovered: attempted.length,
      totalCombos: all.length,
    };
  }, [combos, totalRounds]);
}
