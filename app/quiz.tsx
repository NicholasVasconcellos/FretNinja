import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, iconSize } from '../constants/theme';
import { useQuizEngine } from '../hooks/useQuizEngine';
import { useShakeDetector } from '../hooks/useShakeDetector';
import { usePitchDetector } from '../modules/pitch-detector/src';
import { useSettingsStore } from '../stores/settingsStore';
import { NotePrompt } from '../components/NotePrompt';
import { TimerBar } from '../components/TimerBar';
import { ScoreCounter } from '../components/ScoreCounter';
import { PitchIndicator } from '../components/PitchIndicator';
import { FeedbackOverlay } from '../components/FeedbackOverlay';
import { FretboardDiagram } from '../components/FretboardDiagram';
import { loadSounds, playCorrectSound, playWrongSound, unloadSounds } from '../utils/sounds';
import {
  sensitivityToJsConfidence,
  sensitivityToNativeConfidence,
  noiseGateToRmsThreshold,
} from '../utils/detectionMapping';
import type { GuitarString, Note } from '../types';

export default function QuizScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore();
  const quiz = useQuizEngine();
  const { pitch, status, start, stop } = usePitchDetector({
    minConfidence: sensitivityToJsConfidence(settings.detectionSensitivity),
    nativeRmsThreshold: noiseGateToRmsThreshold(settings.noiseGate),
    nativeMinConfidence: sensitivityToNativeConfidence(settings.detectionSensitivity),
  });

  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showUndoHint, setShowUndoHint] = useState(false);
  const [lastCombo, setLastCombo] = useState<{ string: GuitarString; note: Note } | null>(null);
  const [timerRemaining, setTimerRemaining] = useState(settings.timerDurationSec);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevResultsLenRef = useRef(0);
  const hasNavigatedRef = useRef(false);

  // Note hold duration tracking
  const holdNoteRef = useRef<Note | null>(null);
  const holdStartRef = useRef<number>(0);

  // Start round, mic, and preload sounds on mount
  useEffect(() => {
    quiz.startRound();
    // Configure audio session (with recording support) before starting pitch detection
    loadSounds().then(() => start());
    return () => {
      stop();
      quiz.abort();
      unloadSounds();
    };
  }, []);

  // Feed detected notes to the quiz engine (with hold duration gate)
  const detectedNote = (pitch?.note as Note) ?? null;
  const detectedFrequency = pitch?.frequency ?? null;
  const holdThreshold = settings.noteDurationMs;

  useEffect(() => {
    if (!detectedNote || quiz.status !== 'active') {
      holdNoteRef.current = null;
      return;
    }

    const expectedNote = quiz.currentPrompt?.note ?? null;
    if (detectedNote !== expectedNote) {
      holdNoteRef.current = null;
      return;
    }

    // Instant mode — no hold required
    if (holdThreshold <= 0) {
      quiz.submitDetectedNote(detectedNote);
      return;
    }

    const now = Date.now();
    if (holdNoteRef.current !== detectedNote) {
      // Started holding a new matching note
      holdNoteRef.current = detectedNote;
      holdStartRef.current = now;
      return;
    }

    // Same note still held — check if duration met
    if (now - holdStartRef.current >= holdThreshold) {
      holdNoteRef.current = null;
      quiz.submitDetectedNote(detectedNote);
    }
  }, [detectedNote, pitch]);

  // Track feedback from new results — play sounds
  useEffect(() => {
    const len = quiz.results.length;
    if (len > prevResultsLenRef.current) {
      const lastResult = quiz.results[len - 1];
      const isCorrect = lastResult.correct;
      setFeedback(isCorrect ? 'correct' : 'incorrect');
      setLastCombo({ string: lastResult.combo.string, note: lastResult.expectedNote });

      // Play SFX (non-blocking)
      if (isCorrect) {
        playCorrectSound();
      } else {
        playWrongSound();
      }

      // Reset timer for next question
      if (settings.timerEnabled) {
        setTimerRemaining(settings.timerDurationSec);
      }
    }
    prevResultsLenRef.current = len;
  }, [quiz.results.length]);

  // Clear feedback after delay
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 800);
    return () => clearTimeout(t);
  }, [feedback]);

  // UI timer (counts down each second for display)
  useEffect(() => {
    if (!settings.timerEnabled || quiz.status !== 'active') return;
    setTimerRemaining(settings.timerDurationSec);

    timerIntervalRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [quiz.status, quiz.questionIndex, settings.timerEnabled, settings.timerDurationSec]);

  // Navigate to results when round finishes
  useEffect(() => {
    if (quiz.status === 'finished' && quiz.roundResult && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.replace('/results');
    }
  }, [quiz.status, quiz.roundResult]);

  const correctCount = quiz.results.filter((r) => r.correct).length;

  const handleShakeUndo = useCallback(() => {
    if (quiz.goBack()) {
      setFeedback(null);
      setShowUndoHint(true);
      // Reset timer display for the restored question
      if (settings.timerEnabled) {
        setTimerRemaining(settings.timerDurationSec);
      }
    }
  }, [quiz, settings.timerEnabled, settings.timerDurationSec]);

  useShakeDetector(handleShakeUndo);

  // Clear undo hint after a short delay
  useEffect(() => {
    if (!showUndoHint) return;
    const t = setTimeout(() => setShowUndoHint(false), 1200);
    return () => clearTimeout(t);
  }, [showUndoHint]);

  const handleQuit = useCallback(() => {
    quiz.abort();
    stop();
    router.back();
  }, [quiz, stop, router]);

  // Waiting state
  if (quiz.status === 'idle' || !quiz.currentPrompt) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Starting round…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header: quit button + score */}
      <View style={styles.header}>
        <Pressable onPress={handleQuit} hitSlop={12} style={styles.quitBtn}>
          <Ionicons name="close" size={iconSize.sm} color={colors.textMuted} />
          <Text style={styles.quitText}>Quit</Text>
        </Pressable>
      </View>

      <ScoreCounter
        current={quiz.questionIndex}
        total={quiz.totalQuestions}
        correct={correctCount}
      />

      {/* Timer bar */}
      {settings.timerEnabled && (
        <TimerBar remaining={timerRemaining} total={settings.timerDurationSec} />
      )}

      {/* Note prompt */}
      <View style={styles.promptArea}>
        <NotePrompt prompt={quiz.currentPrompt} />
      </View>

      {/* Fretboard diagram after answer */}
      {feedback && lastCombo && settings.showFretboardAfterAnswer && (
        <FretboardDiagram
          highlightString={lastCombo.string}
          highlightNote={lastCombo.note}
          minFret={settings.minFret}
          maxFret={settings.maxFret}
        />
      )}

      {/* Pitch indicator + mic status */}
      <View style={styles.bottomArea}>
        <PitchIndicator
          detectedNote={detectedNote}
          frequency={detectedFrequency}
        />
        <View style={styles.micStatus}>
          <View style={[styles.micDot, status === 'active' && styles.micDotActive]} />
          <Text style={styles.micLabel}>
            {status === 'active' ? 'Listening' : 'Mic off'}
          </Text>
        </View>
      </View>

      {/* Feedback overlay */}
      <FeedbackOverlay type={feedback} />

      {/* Shake-to-undo hint */}
      {showUndoHint && (
        <View style={styles.undoHint} pointerEvents="none">
          <Text style={styles.undoHintText}>Undo — back to previous question</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  quitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quitText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textMuted,
  },
  promptArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomArea: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  micStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  micDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    marginRight: spacing.xs,
  },
  micDotActive: {
    backgroundColor: colors.neonGreen,
    shadowColor: colors.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  micLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  undoHint: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  undoHintText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neonGreen,
  },
});
