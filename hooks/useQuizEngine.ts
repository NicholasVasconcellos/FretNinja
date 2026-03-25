import { useCallback, useEffect, useRef } from 'react';
import type { Note, NoteCombo, QuestionResult, RoundResult } from '../types';
import { getNoteAtFret } from '../constants/fretboard';
import { useSettingsStore } from '../stores/settingsStore';
import { useMasteryStore } from '../stores/masteryStore';
import { useRoundStore } from '../stores/roundStore';
import { selectWeightedCombo } from '../utils/weightedRandom';
import { calculateRoundStats } from '../utils/scoring';

/** Delay (ms) after correct answer before advancing to next question */
const ADVANCE_DELAY_MS = 800;

export interface QuizEngineState {
  /** Current prompt the player must answer */
  currentPrompt: NoteCombo | null;
  /** Current question index (0-based) */
  questionIndex: number;
  /** Total questions in this round */
  totalQuestions: number;
  /** Round status */
  status: 'idle' | 'active' | 'finished';
  /** Results collected so far */
  results: QuestionResult[];
  /** Remaining seconds on the timer (null if timer disabled) */
  timerRemaining: number | null;
  /** The round result, available when status === 'finished' */
  roundResult: RoundResult | null;
  /** Start a new quiz round */
  startRound: () => void;
  /** Feed a detected note into the engine */
  submitDetectedNote: (note: Note) => void;
  /** Abort the current round */
  abort: () => void;
}

export function useQuizEngine(): QuizEngineState {
  const settings = useSettingsStore();
  const mastery = useMasteryStore();
  const round = useRoundStore();

  const promptStartTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRemainingRef = useRef<number | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);
  const roundResultRef = useRef<RoundResult | null>(null);

  // We use a ref to track timer remaining and force re-renders via round store updates
  // But for simplicity, we'll use a state-based approach with the round store
  const timerSecondsRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }, []);

  const generatePrompts = useCallback((): NoteCombo[] => {
    const {
      questionsPerRound,
      selectedStrings,
      minFret,
      maxFret,
      smartWeighting,
    } = settings;

    if (smartWeighting) {
      // Use weighted selection from mastery data
      const allCombos = mastery.getAllCombos().filter(
        (c) =>
          selectedStrings.includes(c.combo.string) &&
          c.combo.fret >= minFret &&
          c.combo.fret <= maxFret
      );

      if (allCombos.length === 0) return [];

      const prompts: NoteCombo[] = [];
      let lastCombo: NoteCombo | undefined;

      for (let i = 0; i < questionsPerRound; i++) {
        const combo = selectWeightedCombo(allCombos, lastCombo);
        prompts.push(combo);
        lastCombo = combo;
      }
      return prompts;
    }

    // Random selection (no weighting)
    const pool: NoteCombo[] = [];
    for (const string of selectedStrings) {
      for (let fret = minFret; fret <= maxFret; fret++) {
        pool.push({ string, fret, note: getNoteAtFret(string, fret) });
      }
    }

    if (pool.length === 0) return [];

    const prompts: NoteCombo[] = [];
    let lastIndex = -1;
    for (let i = 0; i < questionsPerRound; i++) {
      let idx: number;
      do {
        idx = Math.floor(Math.random() * pool.length);
      } while (pool.length > 1 && idx === lastIndex);
      prompts.push(pool[idx]);
      lastIndex = idx;
    }
    return prompts;
  }, [settings, mastery]);

  const startTimer = useCallback(() => {
    if (!settings.timerEnabled) return;
    timerSecondsRef.current = settings.timerDurationSec;
    timerRemainingRef.current = settings.timerDurationSec;

    timerIntervalRef.current = setInterval(() => {
      timerSecondsRef.current -= 1;
      timerRemainingRef.current = timerSecondsRef.current;

      if (timerSecondsRef.current <= 0) {
        // Time's up — auto-fail this question
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        handleTimeout();
      }
    }, 1000);
  }, [settings.timerEnabled, settings.timerDurationSec]);

  const handleTimeout = useCallback(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const currentQuestion = useRoundStore.getState().getCurrentQuestion();
    if (!currentQuestion) {
      isProcessingRef.current = false;
      return;
    }

    const responseTimeMs = Date.now() - promptStartTimeRef.current;
    const result: QuestionResult = {
      combo: currentQuestion,
      expectedNote: currentQuestion.note,
      playedNote: null,
      correct: false,
      responseTimeMs,
    };

    const roundState = useRoundStore.getState();
    roundState.recordAnswer(result);
    useMasteryStore.getState().updateAfterAttempt(result);

    // Advance after delay
    advanceTimeoutRef.current = setTimeout(() => {
      const state = useRoundStore.getState();
      if (state.currentIndex + 1 >= state.questions.length) {
        finishCurrentRound();
      } else {
        state.nextQuestion();
        promptStartTimeRef.current = Date.now();
        isProcessingRef.current = false;
        startTimer();
      }
    }, ADVANCE_DELAY_MS);
  }, []);

  const finishCurrentRound = useCallback(() => {
    clearTimers();
    const state = useRoundStore.getState();
    state.finishRound();
    useMasteryStore.getState().incrementRounds();

    const roundResult = calculateRoundStats(state.results);
    roundResultRef.current = roundResult;
    isProcessingRef.current = false;
  }, [clearTimers]);

  const startRound = useCallback(() => {
    clearTimers();
    roundResultRef.current = null;
    isProcessingRef.current = false;

    const prompts = generatePrompts();
    if (prompts.length === 0) return;

    round.startRound(prompts);
    promptStartTimeRef.current = Date.now();
    startTimer();
  }, [clearTimers, generatePrompts, round, startTimer]);

  const submitDetectedNote = useCallback(
    (note: Note) => {
      if (isProcessingRef.current) return;

      const state = useRoundStore.getState();
      if (state.status !== 'active') return;

      const currentQuestion = state.getCurrentQuestion();
      if (!currentQuestion) return;

      // Note name match only (string is honor system)
      const correct = note === currentQuestion.note;
      if (!correct) return; // Ignore wrong notes — keep listening

      isProcessingRef.current = true;
      clearTimers();

      const responseTimeMs = Date.now() - promptStartTimeRef.current;
      const result: QuestionResult = {
        combo: currentQuestion,
        expectedNote: currentQuestion.note,
        playedNote: note,
        correct: true,
        responseTimeMs,
      };

      state.recordAnswer(result);
      useMasteryStore.getState().updateAfterAttempt(result);

      // Advance after delay
      advanceTimeoutRef.current = setTimeout(() => {
        const currentState = useRoundStore.getState();
        if (currentState.currentIndex + 1 >= currentState.questions.length) {
          finishCurrentRound();
        } else {
          currentState.nextQuestion();
          promptStartTimeRef.current = Date.now();
          isProcessingRef.current = false;
          startTimer();
        }
      }, ADVANCE_DELAY_MS);
    },
    [clearTimers, finishCurrentRound, startTimer]
  );

  const abort = useCallback(() => {
    clearTimers();
    isProcessingRef.current = false;
    roundResultRef.current = null;
    round.resetRound();
  }, [clearTimers, round]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Compute timer remaining for the current render
  const timerRemaining = settings.timerEnabled
    ? timerRemainingRef.current
    : null;

  // Build round result if finished
  const roundResult =
    round.status === 'finished'
      ? roundResultRef.current ?? calculateRoundStats(round.results)
      : null;

  return {
    currentPrompt: round.status === 'active' ? round.questions[round.currentIndex] ?? null : null,
    questionIndex: round.currentIndex,
    totalQuestions: round.questions.length,
    status: round.status,
    results: round.results,
    timerRemaining,
    roundResult,
    startRound,
    submitDetectedNote,
    abort,
  };
}
