import { create } from 'zustand';
import type { NoteCombo, QuestionResult } from '../types';

type RoundStatus = 'idle' | 'active' | 'finished';

interface RoundStore {
  status: RoundStatus;
  questions: NoteCombo[];
  currentIndex: number;
  results: QuestionResult[];

  startRound: (questions: NoteCombo[]) => void;
  recordAnswer: (result: QuestionResult) => void;
  nextQuestion: () => void;
  finishRound: () => void;
  resetRound: () => void;
  getCurrentQuestion: () => NoteCombo | null;
}

export const useRoundStore = create<RoundStore>()((set, get) => ({
  status: 'idle',
  questions: [],
  currentIndex: 0,
  results: [],

  startRound: (questions) =>
    set({
      status: 'active',
      questions,
      currentIndex: 0,
      results: [],
    }),

  recordAnswer: (result) =>
    set((state) => ({
      results: [...state.results, result],
    })),

  nextQuestion: () =>
    set((state) => {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questions.length) {
        return { status: 'finished', currentIndex: nextIndex };
      }
      return { currentIndex: nextIndex };
    }),

  finishRound: () => set({ status: 'finished' }),

  resetRound: () =>
    set({
      status: 'idle',
      questions: [],
      currentIndex: 0,
      results: [],
    }),

  getCurrentQuestion: () => {
    const { questions, currentIndex, status } = get();
    if (status !== 'active' || currentIndex >= questions.length) return null;
    return questions[currentIndex];
  },
}));
