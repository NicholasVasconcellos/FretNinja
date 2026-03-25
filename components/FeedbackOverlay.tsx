import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '../constants/theme';

interface FeedbackOverlayProps {
  type: 'correct' | 'incorrect' | null;
}

export function FeedbackOverlay({ type }: FeedbackOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!type) {
      opacity.setValue(0);
      return;
    }

    opacity.setValue(1);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 600,
      delay: 200,
      useNativeDriver: true,
    }).start();
  }, [type]);

  if (!type) return null;

  const isCorrect = type === 'correct';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.overlay,
        {
          opacity,
          backgroundColor: isCorrect
            ? 'rgba(57, 255, 20, 0.15)'
            : 'rgba(255, 16, 96, 0.15)',
        },
      ]}
    >
      <Text style={[styles.icon, { color: isCorrect ? colors.correct : colors.incorrect }]}>
        {isCorrect ? '✓' : '✗'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 96,
    fontWeight: '800',
  },
});
