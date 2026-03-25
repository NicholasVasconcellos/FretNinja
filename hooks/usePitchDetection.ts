import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { PitchDetector } from 'react-native-pitch-detector';

import type { Note } from '../types';
import { centsOffPitch, frequencyToNote } from '../utils/notes';

export interface PitchDetectionState {
  /** The detected note name, or null if nothing detected */
  detectedNote: Note | null;
  /** Raw frequency in Hz, or null */
  frequency: number | null;
  /** Whether the detector is actively listening */
  isListening: boolean;
  /** Start listening for pitch */
  start: () => Promise<void>;
  /** Stop listening */
  stop: () => Promise<void>;
}

/** Maximum cents deviation to accept a detection as valid */
const MAX_CENTS_DEVIATION = 40;

/** Minimum frequency to consider (below low E guitar ~82 Hz, with margin) */
const MIN_FREQUENCY = 60;

/** Maximum frequency to consider (above high E 24th fret ~1319 Hz, with margin) */
const MAX_FREQUENCY = 1400;

export function usePitchDetection(): PitchDetectionState {
  const [detectedNote, setDetectedNote] = useState<Note | null>(null);
  const [frequency, setFrequency] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);

  const start = useCallback(async () => {
    if (isListeningRef.current) return;
    try {
      await PitchDetector.start();
      isListeningRef.current = true;
      setIsListening(true);
      setDetectedNote(null);
      setFrequency(null);
    } catch (error) {
      console.warn('Failed to start pitch detection:', error);
    }
  }, []);

  const stop = useCallback(async () => {
    if (!isListeningRef.current) return;
    try {
      await PitchDetector.stop();
    } catch (error) {
      console.warn('Failed to stop pitch detection:', error);
    } finally {
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, []);

  // Listen for pitch data
  useEffect(() => {
    const subscription = PitchDetector.addListener(
      (data: { frequency: number; tone: string }) => {
        const freq = data.frequency;

        // Filter out-of-range frequencies
        if (freq < MIN_FREQUENCY || freq > MAX_FREQUENCY) {
          setDetectedNote(null);
          setFrequency(null);
          return;
        }

        // Filter low-confidence detections (too far from a real note)
        const cents = Math.abs(centsOffPitch(freq));
        if (cents > MAX_CENTS_DEVIATION) {
          setDetectedNote(null);
          setFrequency(null);
          return;
        }

        const note = frequencyToNote(freq);
        setDetectedNote(note);
        setFrequency(freq);
      },
    );

    return () => {
      PitchDetector.removeListener();
    };
  }, []);

  // Handle app state changes — stop when backgrounded, resume when foregrounded
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (isListeningRef.current) {
          try {
            await PitchDetector.stop();
          } catch {
            // Ignore cleanup errors
          }
        }
      } else if (nextAppState === 'active') {
        if (isListeningRef.current) {
          try {
            await PitchDetector.start();
          } catch {
            // Ignore restart errors
          }
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListeningRef.current) {
        PitchDetector.stop().catch(() => {});
        isListeningRef.current = false;
      }
    };
  }, []);

  return { detectedNote, frequency, isListening, start, stop };
}
