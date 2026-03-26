import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

/* eslint-disable @typescript-eslint/no-var-requires */
const CORRECT_SFX = require('../assets/sounds/correct.wav');
const WRONG_SFX = require('../assets/sounds/wrong.wav');

let correctPlayer: AudioPlayer | null = null;
let wrongPlayer: AudioPlayer | null = null;
let loaded = false;

/** Pre-load both SFX into memory. Safe to call multiple times. */
export async function loadSounds(): Promise<void> {
  if (loaded) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      allowsRecording: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
    correctPlayer = createAudioPlayer(CORRECT_SFX);
    wrongPlayer = createAudioPlayer(WRONG_SFX);
    correctPlayer.volume = 0.8;
    wrongPlayer.volume = 0.7;
    loaded = true;
  } catch {
    // Sounds are non-critical — fail silently
  }
}

async function replay(player: AudioPlayer | null): Promise<void> {
  if (!player) return;
  try {
    await player.seekTo(0);
    player.play();
  } catch {
    // ignore playback errors
  }
}

export const playCorrectSound = () => replay(correctPlayer);
export const playWrongSound = () => replay(wrongPlayer);

export async function unloadSounds(): Promise<void> {
  correctPlayer = null;
  wrongPlayer = null;
  loaded = false;
}
