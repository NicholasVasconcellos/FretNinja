import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, glow } from '../constants/theme';

interface FeedbackOverlayProps {
  type: 'correct' | 'incorrect' | null;
}

export function FeedbackOverlay({ type }: FeedbackOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!type) {
      opacity.setValue(0);
      scale.setValue(0.3);
      return;
    }

    // Pop in, then fade out
    opacity.setValue(1);
    scale.setValue(0.3);

    Animated.sequence([
      // Punch in
      Animated.spring(scale, {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
      // Hold briefly, then fade
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 350,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.3,
          duration: 350,
          delay: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
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
            ? 'rgba(57, 255, 20, 0.12)'
            : 'rgba(255, 16, 96, 0.12)',
        },
      ]}
    >
      <Animated.View style={[
        styles.iconContainer,
        { transform: [{ scale }] },
        isCorrect ? glowCorrect : glowIncorrect,
      ]}>
        <Ionicons
          name={isCorrect ? 'checkmark-sharp' : 'close-sharp'}
          size={72}
          color={isCorrect ? colors.correct : colors.incorrect}
        />
      </Animated.View>
    </Animated.View>
  );
}

const glowCorrect = {
  ...glow.green,
  shadowRadius: 30,
  shadowOpacity: 0.8,
};
const glowIncorrect = {
  ...glow.pink,
  shadowRadius: 30,
  shadowOpacity: 0.8,
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
