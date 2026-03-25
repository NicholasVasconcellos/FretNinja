import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../constants/theme';
import { useSettingsStore } from '../stores/settingsStore';

const OPTIONS = [5, 10, 15, 20] as const;

export function RoundLengthPicker() {
  const questionsPerRound = useSettingsStore((s) => s.questionsPerRound);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Questions per round</Text>
      <View style={styles.row}>
        {OPTIONS.map((n) => {
          const active = n === questionsPerRound;
          return (
            <Pressable
              key={n}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => updateSettings({ questionsPerRound: n })}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    width: 52,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    borderColor: colors.neonGreen,
    backgroundColor: 'rgba(57, 255, 20, 0.12)',
  },
  optionText: {
    ...typography.mono,
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.neonGreen,
  },
});
