import { Audio } from 'expo-av';
import type { AVPlaybackSource } from 'expo-av';

/* eslint-disable @typescript-eslint/no-var-requires */
const CORRECT_SFX: AVPlaybackSource = require('../assets/sounds/correct.wav');
const WRONG_SFX: AVPlaybackSource = require('../assets/sounds/wrong.wav');

let correctSound: Audio.Sound | null = null;
let wrongSound: Audio.Sound | null = null;
let loaded = false;

/** Pre-load both SFX into memory. Safe to call multiple times. */
export async function loadSounds(): Promise<void> {
  if (loaded) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
    const [c, w] = await Promise.all([
      Audio.Sound.createAsync(CORRECT_SFX, { shouldPlay: false, volume: 0.8 }),
      Audio.Sound.createAsync(WRONG_SFX, { shouldPlay: false, volume: 0.7 }),
    ]);
    correctSound = c.sound;
    wrongSound = w.sound;
    loaded = true;
  } catch {
    // Sounds are non-critical — fail silently
  }
}

async function replay(sound: Audio.Sound | null): Promise<void> {
  if (!sound) return;
  try {
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // ignore playback errors
  }
}

export const playCorrectSound = () => replay(correctSound);
export const playWrongSound = () => replay(wrongSound);

export async function unloadSounds(): Promise<void> {
  try {
    await correctSound?.unloadAsync();
    await wrongSound?.unloadAsync();
  } catch {
    // ignore
  }
  correctSound = null;
  wrongSound = null;
  loaded = false;
}
