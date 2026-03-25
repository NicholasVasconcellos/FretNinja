import { View, Text, StyleSheet } from 'react-native';
import type { NoteCombo } from '../types';
import { STRING_LABELS } from '../constants/fretboard';
import { colors, spacing } from '../constants/theme';

interface NotePromptProps {
  prompt: NoteCombo;
}

export function NotePrompt({ prompt }: NotePromptProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Play</Text>
      <Text style={styles.note}>{prompt.note}</Text>
      <Text style={styles.detail}>
        String {STRING_LABELS[prompt.string]} — Fret {prompt.fret}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  label: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  note: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  detail: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
