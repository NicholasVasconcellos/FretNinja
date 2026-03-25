import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import type { NoteCombo } from '../types';
import { STRING_LABELS } from '../constants/fretboard';
import { colors, spacing, glow } from '../constants/theme';

interface NotePromptProps {
  prompt: NoteCombo;
}

export function NotePrompt({ prompt }: NotePromptProps) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // Reset and animate in on each new prompt
    translateY.setValue(30);
    opacity.setValue(0);
    scale.setValue(0.85);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [prompt.note, prompt.string, prompt.fret]);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }, { scale }] },
      ]}
    >
      <Text style={styles.label}>Play</Text>
      <Text style={styles.note}>{prompt.note}</Text>
      <Text style={styles.detail}>
        String {STRING_LABELS[prompt.string]} — Fret {prompt.fret}
      </Text>
    </Animated.View>
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
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  note: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 2,
    textShadowColor: colors.neonGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    ...glow.green,
  },
  detail: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
