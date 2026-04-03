import { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../constants/theme';
import { useRoundStore } from '../stores/roundStore';
import { calculateRoundStats } from '../utils/scoring';
import type { QuestionResult } from '../types';

const SLOW_THRESHOLD_MS = 4000;

function getScoreMessage(accuracy: number): string {
  if (accuracy >= 0.9) return 'Flawless precision.';
  if (accuracy >= 0.7) return 'Solid round.';
  if (accuracy >= 0.5) return 'Keep sharpening.';
  return 'The fretboard awaits.';
}

function getScoreColor(accuracy: number): string {
  if (accuracy >= 0.7) return colors.neonGreen;
  if (accuracy >= 0.5) return colors.neonYellow;
  return colors.hotPink;
}

function getScoreGlow(color: string): string {
  if (color === colors.neonGreen) return 'rgba(57, 255, 20, 0.35)';
  if (color === colors.neonYellow) return 'rgba(255, 230, 0, 0.35)';
  return 'rgba(255, 16, 96, 0.35)';
}

/* ════════════════════════════════════════════════════════════════════
   Results Screen
   ════════════════════════════════════════════════════════════════════ */

export default function ResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const round = useRoundStore();

  const roundResult = useMemo(
    () => calculateRoundStats(round.results),
    [round.results],
  );

  // Deduplicated weak combos: wrong answers or slow responses
  const weakCombos = useMemo(() => {
    const seen = new Set<string>();
    return round.results.filter((r) => {
      if (r.correct && r.responseTimeMs <= SLOW_THRESHOLD_MS) return false;
      const key = `${r.combo.string}-${r.combo.fret}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [round.results]);

  // ── Staggered entrance animations ──
  const heroAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(heroAnim, {
        toValue: 1,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.spring(statsAnim, {
        toValue: 1,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.spring(listAnim, {
        toValue: 1,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.spring(buttonsAnim, {
        toValue: 1,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePlayAgain = useCallback(() => {
    round.resetRound();
    router.replace('/quiz');
  }, [round, router]);

  const handleHome = useCallback(() => {
    round.resetRound();
    router.replace('/(tabs)');
  }, [round, router]);

  // ── Derived values ──
  const accuracyPct = Math.round(roundResult.accuracy * 100);
  const avgTimeSec = (roundResult.averageResponseTimeMs / 1000).toFixed(1);
  const scoreColor = getScoreColor(roundResult.accuracy);
  const scoreGlow = getScoreGlow(scoreColor);
  const scoreMessage = getScoreMessage(roundResult.accuracy);
  const missed = roundResult.totalQuestions - roundResult.totalCorrect;

  // ── Empty guard ──
  if (round.results.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
        <Text style={styles.emptyText}>No round data</Text>
        <Pressable onPress={handleHome} style={styles.fallbackBtn}>
          <Text style={styles.fallbackBtnText}>Go Home</Text>
        </Pressable>
      </View>
    );
  }

  const animStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
    ],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Score ─────────────────────────────────── */}
        <Animated.View style={[styles.hero, animStyle(heroAnim)]}>
          <Text style={styles.roundLabel}>ROUND COMPLETE</Text>

          <View style={styles.scoreRow}>
            <Text
              style={[
                styles.scoreNum,
                {
                  color: scoreColor,
                  textShadowColor: scoreGlow,
                },
              ]}
            >
              {roundResult.totalCorrect}
            </Text>
            <Text style={styles.scoreSep}>/</Text>
            <Text style={styles.scoreDenom}>{roundResult.totalQuestions}</Text>
          </View>

          <View style={[styles.accuracyPill, { borderColor: scoreColor }]}>
            <Text style={[styles.accuracyPillText, { color: scoreColor }]}>
              {accuracyPct}% accuracy
            </Text>
          </View>

          <Text style={styles.scoreMsg}>{scoreMessage}</Text>

          <View style={[styles.divider, { backgroundColor: scoreColor }]} />
        </Animated.View>

        {/* ── Stats Row ──────────────────────────────────── */}
        <Animated.View style={[styles.statsRow, animStyle(statsAnim)]}>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: colors.electricBlue }]}>
              {avgTimeSec}s
            </Text>
            <Text style={styles.statLbl}>AVG TIME</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: colors.neonGreen }]}>
              {roundResult.totalCorrect}
            </Text>
            <Text style={styles.statLbl}>CORRECT</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: colors.hotPink }]}>
              {missed}
            </Text>
            <Text style={styles.statLbl}>MISSED</Text>
          </View>
        </Animated.View>

        {/* ── Per-Question Breakdown ─────────────────────── */}
        <Animated.View style={[styles.section, animStyle(listAnim)]}>
          <Text style={styles.sectionTitle}>BREAKDOWN</Text>
          <View style={styles.breakdownList}>
            {round.results.map((r, i) => (
              <QuestionRow key={i} result={r} index={i} />
            ))}
          </View>
        </Animated.View>

        {/* ── Weak Spots ─────────────────────────────────── */}
        {weakCombos.length > 0 && (
          <Animated.View style={[styles.section, animStyle(listAnim)]}>
            <Text style={styles.sectionTitle}>WEAK SPOTS</Text>
            <Text style={styles.sectionSub}>Focus on these next round</Text>
            {weakCombos.map((r, i) => (
              <View key={i} style={styles.weakCard}>
                <View
                  style={[
                    styles.weakStrip,
                    {
                      backgroundColor: !r.correct
                        ? colors.hotPink
                        : colors.neonYellow,
                    },
                  ]}
                />
                <Text style={styles.weakNote}>{r.combo.note}</Text>
                <View style={styles.weakInfo}>
                  <Text style={styles.weakLoc}>
                    String {r.combo.string} · Fret {r.combo.fret}
                  </Text>
                  <Text style={styles.weakReason}>
                    {!r.correct
                      ? r.playedNote
                        ? `Played ${r.playedNote}`
                        : 'Timed out'
                      : `Slow — ${(r.responseTimeMs / 1000).toFixed(1)}s`}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── Action Buttons ─────────────────────────────── */}
        <Animated.View style={[styles.buttons, animStyle(buttonsAnim)]}>
          <Pressable
            style={({ pressed }) => [
              styles.playAgainBtn,
              pressed && styles.playAgainBtnPressed,
            ]}
            onPress={handlePlayAgain}
          >
            <Text style={styles.playAgainText}>Play Again</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.homeBtn,
              pressed && styles.homeBtnPressed,
            ]}
            onPress={handleHome}
          >
            <Text style={styles.homeBtnText}>Home</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Question Row
   ════════════════════════════════════════════════════════════════════ */

function QuestionRow({
  result,
  index,
}: {
  result: QuestionResult;
  index: number;
}) {
  const timeSec = (result.responseTimeMs / 1000).toFixed(1);
  const isSlow = result.responseTimeMs > SLOW_THRESHOLD_MS;

  return (
    <View style={[styles.qRow, !result.correct && styles.qRowWrong]}>
      <View
        style={[
          styles.qDot,
          {
            backgroundColor: result.correct ? colors.neonGreen : colors.hotPink,
            shadowColor: result.correct ? colors.neonGreen : colors.hotPink,
          },
        ]}
      />

      <Text style={styles.qIdx}>{index + 1}</Text>
      <Text style={styles.qNote}>{result.expectedNote}</Text>

      <Text style={styles.qLoc}>
        S{result.combo.string} F{result.combo.fret}
      </Text>

      {!result.correct && (
        <View style={styles.qPlayedWrap}>
          <Text style={styles.qPlayed}>{'→ '}</Text>
          {result.playedNote ? (
            <Text style={styles.qPlayed}>{result.playedNote}</Text>
          ) : (
            <Ionicons name="timer-outline" size={14} color={colors.hotPink} />
          )}
        </View>
      )}

      <Text style={[styles.qTime, isSlow && { color: colors.neonYellow }]}>
        {timeSec}s
      </Text>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Styles
   ════════════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  fallbackBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fallbackBtnText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  /* ── Hero ── */
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  roundLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 3,
    marginBottom: spacing.lg,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNum: {
    fontSize: 72,
    fontWeight: '800',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  scoreSep: {
    fontSize: 48,
    fontWeight: '300',
    color: colors.textMuted,
    marginHorizontal: 2,
  },
  scoreDenom: {
    fontSize: 48,
    fontWeight: '300',
    color: colors.textSecondary,
  },
  accuracyPill: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 20,
    marginTop: spacing.md,
  },
  accuracyPillText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  scoreMsg: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  divider: {
    height: 2,
    width: 48,
    borderRadius: 1,
    marginTop: spacing.lg,
    opacity: 0.5,
  },

  /* ── Stats ── */
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 4,
  },

  /* ── Sections ── */
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  sectionSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },

  /* ── Breakdown ── */
  breakdownList: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  qRowWrong: {
    backgroundColor: 'rgba(255, 16, 96, 0.07)',
  },
  qDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  qIdx: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    width: 20,
    textAlign: 'right',
  },
  qNote: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    width: 32,
  },
  qLoc: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  qPlayedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qPlayed: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.hotPink,
  },
  qTime: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    width: 40,
    textAlign: 'right',
  },

  /* ── Weak Spots ── */
  weakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  weakStrip: {
    width: 4,
    alignSelf: 'stretch',
  },
  weakNote: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    width: 64,
    textAlign: 'center',
  },
  weakInfo: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: spacing.md,
  },
  weakLoc: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  weakReason: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
  },

  /* ── Buttons ── */
  buttons: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  playAgainBtn: {
    backgroundColor: colors.neonGreen,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  playAgainBtnPressed: {
    opacity: 0.85,
    shadowOpacity: 0.2,
  },
  playAgainText: {
    ...typography.heading,
    color: colors.background,
    fontWeight: '700',
  },
  homeBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  homeBtnPressed: {
    backgroundColor: colors.surface,
  },
  homeBtnText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
