import type {
  ComboMastery,
  MasteryLevel,
  QuestionResult,
  RoundResult,
} from '../types';

/**
 * Calculate mastery level from accuracy and average response time.
 */
export function calculateMasteryLevel(
  accuracy: number,
  avgResponseTimeMs: number
): MasteryLevel {
  if (accuracy < 0.4) return 'new';
  if (accuracy < 0.7) return 'learning';
  if (accuracy < 0.9 || avgResponseTimeMs > 3000) return 'familiar';
  return 'mastered';
}

/**
 * Calculate round stats from an array of question results.
 */
export function calculateRoundStats(questions: QuestionResult[]): RoundResult {
  const totalCorrect = questions.filter((q) => q.correct).length;
  const totalQuestions = questions.length;
  const accuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;
  const averageResponseTimeMs =
    totalQuestions > 0
      ? questions.reduce((sum, q) => sum + q.responseTimeMs, 0) / totalQuestions
      : 0;

  return {
    questions,
    totalCorrect,
    totalQuestions,
    accuracy,
    averageResponseTimeMs,
    date: new Date().toISOString(),
  };
}

/**
 * Update a ComboMastery record after a new attempt.
 */
export function updateComboMastery(
  existing: ComboMastery,
  result: QuestionResult
): ComboMastery {
  const correctCount = existing.correctCount + (result.correct ? 1 : 0);
  const incorrectCount = existing.incorrectCount + (result.correct ? 0 : 1);
  const streak = result.correct ? existing.streak + 1 : 0;
  const totalAttempts = correctCount + incorrectCount;
  const accuracy = totalAttempts > 0 ? correctCount / totalAttempts : 0;
  const level = calculateMasteryLevel(accuracy, result.responseTimeMs);

  return {
    combo: existing.combo,
    level,
    correctCount,
    incorrectCount,
    lastSeen: new Date().toISOString(),
    streak,
  };
}
