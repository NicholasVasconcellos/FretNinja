import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, glow } from '../../constants/theme';
import { useMasteryData } from '../../hooks/useMasteryData';
import { RoundLengthPicker } from '../../components/RoundLengthPicker';
import { SwipeableTab } from '../../components/SwipeableTab';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { totalRounds, overallAccuracy } = useMasteryData();
  const hasPlayed = totalRounds > 0;

  // Pulsing glow animation for start button
  const pulseAnim = useRef(new Animated.Value(0)).current;
  // Entrance animations
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(40)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(contentSlide, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Infinite pulse on the start button glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const buttonScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  return (
    <SwipeableTab nextTab="/(tabs)/stats">
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Branding */}
      <Animated.View style={[
        styles.brandingArea,
        { opacity: logoOpacity, transform: [{ scale: logoScale }] },
      ]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoKatakana}>忍</Text>
        </View>
        <Text style={styles.title}>FRETNINJA</Text>
        <Text style={styles.tagline}>Slice through the fretboard</Text>
      </Animated.View>

      {/* Content area with entrance animation */}
      <Animated.View style={[
        styles.contentArea,
        { opacity: contentOpacity, transform: [{ translateY: contentSlide }] },
      ]}>
        {/* Start Button with pulse glow */}
        <Animated.View style={[styles.buttonGlow, { transform: [{ scale: buttonScale }] }]}>
          <Pressable
            style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
            onPress={() => router.push('/quiz')}
          >
            <Text style={styles.startButtonText}>START TRAINING</Text>
          </Pressable>
        </Animated.View>

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
      </Animated.View>
    </View>
    </SwipeableTab>
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
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.neonGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...glow.green,
  },
  logoKatakana: {
    fontSize: 42,
    color: colors.neonGreen,
    fontWeight: '300',
  },
  title: {
    ...typography.title,
    fontSize: 36,
    color: colors.neonGreen,
    fontWeight: '800',
    letterSpacing: 6,
    textShadowColor: colors.neonGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  contentArea: {
    alignItems: 'center',
    gap: spacing.xl,
    width: '100%',
  },
  buttonGlow: {
    ...glow.green,
    borderRadius: 14,
  },
  startButton: {
    backgroundColor: colors.neonGreen,
    paddingVertical: 18,
    paddingHorizontal: 52,
    borderRadius: 14,
  },
  startButtonPressed: {
    opacity: 0.85,
  },
  startButtonText: {
    ...typography.heading,
    color: colors.background,
    fontWeight: '800',
    letterSpacing: 3,
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
    textShadowColor: colors.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
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
