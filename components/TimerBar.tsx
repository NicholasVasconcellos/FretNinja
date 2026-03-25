import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, spacing } from '../constants/theme';

interface TimerBarProps {
  /** Remaining seconds */
  remaining: number;
  /** Total seconds */
  total: number;
}

export function TimerBar({ remaining, total }: TimerBarProps) {
  const fraction = total > 0 ? remaining / total : 0;
  const animatedWidth = useRef(new Animated.Value(fraction)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: fraction,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [fraction]);

  const barColor =
    fraction > 0.5
      ? colors.neonGreen
      : fraction > 0.25
        ? colors.neonYellow
        : colors.hotPink;

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: barColor,
            width: animatedWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    marginHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
