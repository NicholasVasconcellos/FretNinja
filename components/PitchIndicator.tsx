import { View, Text, StyleSheet } from 'react-native';
import type { Note } from '../types';
import { colors, spacing } from '../constants/theme';

interface PitchIndicatorProps {
  detectedNote: Note | null;
  frequency: number | null;
}

export function PitchIndicator({ detectedNote, frequency }: PitchIndicatorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Hearing</Text>
      <Text style={[styles.note, !detectedNote && styles.noteMuted]}>
        {detectedNote ?? '—'}
      </Text>
      {frequency != null && (
        <Text style={styles.freq}>{frequency.toFixed(1)} Hz</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  note: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.electricBlue,
  },
  noteMuted: {
    color: colors.textMuted,
  },
  freq: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
    marginTop: 2,
  },
});
