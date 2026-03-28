import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../constants/theme';
import { useMasteryData } from '../../hooks/useMasteryData';
import MasteryGrid from '../../components/MasteryGrid';
import { SwipeableTab } from '../../components/SwipeableTab';
import type { ComboMastery } from '../../types';

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={[styles.statCard, { borderColor: accent }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function comboAccuracy(c: ComboMastery): number {
  const total = c.correctCount + c.incorrectCount;
  return total > 0 ? c.correctCount / total : 0;
}

function ComboRow({ combo, index }: { combo: ComboMastery; index: number }) {
  const total = combo.correctCount + combo.incorrectCount;
  const acc = comboAccuracy(combo);
  const isUnattempted = total === 0;

  return (
    <View style={styles.comboRow}>
      <Text style={styles.comboRank}>{index + 1}</Text>
      <View style={styles.comboInfo}>
        <Text style={styles.comboNote}>
          {combo.combo.note}
          <Text style={styles.comboString}> str {combo.combo.string}</Text>
        </Text>
      </View>
      <Text style={[styles.comboAcc, isUnattempted && { color: colors.textMuted }]}>
        {isUnattempted ? '--' : `${Math.round(acc * 100)}%`}
      </Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🎸</Text>
      <Text style={styles.emptyTitle}>No stats yet</Text>
      <Text style={styles.emptyBody}>
        Complete a quiz round to start tracking your fretboard mastery.
      </Text>
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const {
    totalRounds,
    totalAttempts,
    overallAccuracy,
    weakest5,
    recentlyImproved,
    masteryDistribution,
  } = useMasteryData();

  const hasData = totalRounds > 0;

  return (
    <SwipeableTab prevTab="/(tabs)" nextTab="/(tabs)/settings">
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>Mastery</Text>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Stats cards */}
          <View style={styles.statsRow}>
            <StatCard label="Rounds" value={String(totalRounds)} accent={colors.electricBlue} />
            <StatCard label="Accuracy" value={`${Math.round(overallAccuracy * 100)}%`} accent={colors.neonGreen} />
            <StatCard label="Notes" value={String(totalAttempts)} accent={colors.neonYellow} />
          </View>

          {/* Distribution bar */}
          <View style={styles.distBar}>
            {(['mastered', 'familiar', 'learning', 'new'] as const).map((level) => {
              const count = masteryDistribution[level];
              if (count === 0) return null;
              const barColors = {
                mastered: colors.neonGreen,
                familiar: colors.neonYellow,
                learning: '#FF8C00',
                new: colors.hotPink,
              };
              return (
                <View
                  key={level}
                  style={[styles.distSegment, { flex: count, backgroundColor: barColors[level] }]}
                />
              );
            })}
          </View>

          {/* Heatmap */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fretboard Heatmap</Text>
            <View style={styles.gridWrapper}>
              <MasteryGrid />
            </View>
          </View>

          {/* Weakest combos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weakest Combos</Text>
            <View style={styles.listCard}>
              {weakest5.map((combo, i) => (
                <ComboRow key={`${combo.combo.string}-${combo.combo.fret}`} combo={combo} index={i} />
              ))}
            </View>
          </View>

          {/* Recently improved */}
          {recentlyImproved.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recently Improved</Text>
              <View style={styles.listCard}>
                {recentlyImproved.map((combo, i) => (
                  <ComboRow key={`${combo.combo.string}-${combo.combo.fret}`} combo={combo} index={i} />
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
    </SwipeableTab>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },

  // Stats cards
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Distribution bar
  distBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    gap: 2,
  },
  distSegment: {
    borderRadius: 3,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  // Grid
  gridWrapper: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },

  // Combo list
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  comboRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  comboRank: {
    width: 24,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  comboInfo: {
    flex: 1,
  },
  comboNote: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  comboString: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  comboAcc: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.hotPink,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
});
