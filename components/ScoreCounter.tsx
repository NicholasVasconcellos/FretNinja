import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../constants/theme';

interface ScoreCounterProps {
  current: number;
  total: number;
  correct: number;
}

export function ScoreCounter({ current, total, correct }: ScoreCounterProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        {current + 1}/{total}
      </Text>
      <Text style={styles.correct}>
        {correct} <Text style={styles.correctLabel}>correct</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  progress: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  correct: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neonGreen,
  },
  correctLabel: {
    fontWeight: '400',
    color: colors.textSecondary,
  },
});
