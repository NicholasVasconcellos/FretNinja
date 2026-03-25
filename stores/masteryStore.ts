import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';
import type { ComboMastery, GuitarString, NoteCombo, QuestionResult } from '../types';
import { getNoteAtFret } from '../constants/fretboard';
import { updateComboMastery } from '../utils/scoring';

const storage = createMMKV({ id: 'mastery' });

const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => { storage.remove(name); },
};

/** Create a unique key for a string+fret combo */
function comboKey(string: GuitarString, fret: number): string {
  return `${string}-${fret}`;
}

/** Generate initial mastery records for all 72 combos (6 strings × 12 unique notes) */
function generateInitialCombos(): Record<string, ComboMastery> {
  const combos: Record<string, ComboMastery> = {};
  for (let s = 1; s <= 6; s++) {
    const string = s as GuitarString;
    for (let fret = 0; fret <= 11; fret++) {
      const key = comboKey(string, fret);
      combos[key] = {
        combo: { string, fret, note: getNoteAtFret(string, fret) },
        level: 'new',
        correctCount: 0,
        incorrectCount: 0,
        lastSeen: null,
        streak: 0,
      };
    }
  }
  return combos;
}

interface MasteryStore {
  combos: Record<string, ComboMastery>;
  totalRounds: number;
  initializeCombos: () => void;
  updateAfterAttempt: (result: QuestionResult) => void;
  incrementRounds: () => void;
  getCombo: (string: GuitarString, fret: number) => ComboMastery | undefined;
  getAllCombos: () => ComboMastery[];
  getWeakCombos: (count: number) => ComboMastery[];
  getStrongCombos: (count: number) => ComboMastery[];
}

export const useMasteryStore = create<MasteryStore>()(
  persist(
    (set, get) => ({
      combos: generateInitialCombos(),
      totalRounds: 0,

      initializeCombos: () => set({ combos: generateInitialCombos() }),

      updateAfterAttempt: (result: QuestionResult) => {
        const { combo } = result;
        const key = comboKey(combo.string, combo.fret);
        const existing = get().combos[key];
        if (!existing) return;

        const updated = updateComboMastery(existing, result);
        set((state) => ({
          combos: { ...state.combos, [key]: updated },
        }));
      },

      incrementRounds: () => set((state) => ({ totalRounds: state.totalRounds + 1 })),

      getCombo: (string, fret) => get().combos[comboKey(string, fret)],

      getAllCombos: () => Object.values(get().combos),

      getWeakCombos: (count) => {
        const all = Object.values(get().combos);
        return all
          .sort((a, b) => {
            const aAcc = a.correctCount + a.incorrectCount > 0
              ? a.correctCount / (a.correctCount + a.incorrectCount)
              : 0;
            const bAcc = b.correctCount + b.incorrectCount > 0
              ? b.correctCount / (b.correctCount + b.incorrectCount)
              : 0;
            return aAcc - bAcc;
          })
          .slice(0, count);
      },

      getStrongCombos: (count) => {
        const all = Object.values(get().combos);
        return all
          .sort((a, b) => {
            const aAcc = a.correctCount + a.incorrectCount > 0
              ? a.correctCount / (a.correctCount + a.incorrectCount)
              : 1;
            const bAcc = b.correctCount + b.incorrectCount > 0
              ? b.correctCount / (b.correctCount + b.incorrectCount)
              : 1;
            return bAcc - aAcc;
          })
          .slice(0, count);
      },
    }),
    {
      name: 'mastery-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
