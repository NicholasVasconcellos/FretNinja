import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import type { AppSettings, GuitarString } from '../types';

const storage = new MMKV({ id: 'settings' });

const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

const DEFAULT_SETTINGS: AppSettings = {
  questionsPerRound: 10,
  selectedStrings: [1, 2, 3, 4, 5, 6] as GuitarString[],
  minFret: 0,
  maxFret: 12,
  timerEnabled: false,
  timerDurationSec: 10,
  soundEnabled: true,
  smartWeighting: true,
};

interface SettingsStore extends AppSettings {
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      updateSettings: (partial) => set(partial),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
