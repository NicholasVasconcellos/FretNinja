import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';
import { useMasteryData } from '../../hooks/useMasteryData';
import { RoundLengthPicker } from '../../components/RoundLengthPicker';

export default function HomeScreen() {
  const router = useRouter();
  const { totalRounds, overallAccuracy } = useMasteryData();
  const hasPlayed = totalRounds > 0;

  return (
    <View style={styles.container}>
      {/* Branding */}
      <View style={styles.brandingArea}>
        <Text style={styles.logo}>⚔️</Text>
        <Text style={styles.title}>FretNinja</Text>
        <Text style={styles.tagline}>Slice through the fretboard</Text>
      </View>

      {/* Start Button */}
      <Pressable
        style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
        onPress={() => router.push('/quiz')}
      >
        <Text style={styles.startButtonText}>Start Training</Text>
      </Pressable>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        {hasPlayed ? (
          <>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalRounds}</Text>
              <Text style={styles.statLabel}>Rounds</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {Math.round(overallAccuracy * 100)}%
              </Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </>
        ) : (
          <View style={styles.statCard}>
            <Text style={styles.noRoundsText}>No rounds yet</Text>
          </View>
        )}
      </View>

      {/* Round Length Picker */}
      <RoundLengthPicker />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
  },
  brandingArea: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  logo: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    fontSize: 36,
    color: colors.neonGreen,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: colors.neonGreen,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    shadowColor: colors.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonPressed: {
    opacity: 0.85,
    shadowOpacity: 0.3,
  },
  startButtonText: {
    ...typography.heading,
    color: colors.background,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    minWidth: 100,
  },
  statValue: {
    ...typography.heading,
    color: colors.electricBlue,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  noRoundsText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
