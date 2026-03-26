import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { usePitchDetector } from "../modules/pitch-detector/src";
import { colors, spacing } from "../constants/theme";

export default function PitchTestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { pitch, status, start, stop, debug } = usePitchDetector({
    pollRate: 30,
    minConfidence: 0.85,
    debug: true,
  });

  const logCountRef = useRef(0);

  useEffect(() => {
    if (pitch) {
      logCountRef.current += 1;
      console.log(
        `[PitchTest #${logCountRef.current}] ` +
          `${pitch.note}${pitch.octave} ` +
          `freq=${pitch.frequency.toFixed(1)}Hz ` +
          `conf=${pitch.confidence.toFixed(3)} ` +
          `cents=${pitch.cents > 0 ? "+" : ""}${pitch.cents.toFixed(1)}` +
          (debug ? ` latency=${debug.latencyMs.toFixed(1)}ms` : "")
      );
    }
  }, [pitch, debug]);

  const centsColor =
    pitch && Math.abs(pitch.cents) <= 5
      ? colors.neonGreen
      : pitch && Math.abs(pitch.cents) <= 15
        ? "#FFD700"
        : colors.hotPink;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom },
      ]}
    >
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Pitch Detector Test</Text>
      <Text style={styles.statusLabel}>
        Status: <Text style={styles.statusValue}>{status}</Text>
      </Text>

      <View style={styles.pitchDisplay}>
        {pitch ? (
          <>
            <Text style={styles.noteName}>
              {pitch.note}
              {pitch.octave}
            </Text>
            <Text style={styles.frequency}>
              {pitch.frequency.toFixed(1)} Hz
            </Text>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Confidence</Text>
                <Text style={styles.detailValue}>
                  {(pitch.confidence * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Cents</Text>
                <Text style={[styles.detailValue, { color: centsColor }]}>
                  {pitch.cents > 0 ? "+" : ""}
                  {pitch.cents.toFixed(1)}
                </Text>
              </View>
              {debug && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Latency</Text>
                  <Text style={styles.detailValue}>
                    {debug.latencyMs.toFixed(1)} ms
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <Text style={styles.placeholder}>
            {status === "active" ? "Listening..." : "Press Start"}
          </Text>
        )}
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.button, status !== "idle" && styles.buttonDisabled]}
          onPress={() => start().catch(console.error)}
          disabled={status !== "idle"}
        >
          <Text style={styles.buttonText}>Start</Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.stopButton,
            status === "idle" && styles.buttonDisabled,
          ]}
          onPress={stop}
          disabled={status === "idle"}
        >
          <Text style={styles.buttonText}>Stop</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        Play a note to see live pitch data above
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.neonGreen,
    fontSize: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  statusValue: {
    color: colors.neonGreen,
    fontWeight: "600",
  },
  pitchDisplay: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    minHeight: 220,
    marginBottom: spacing.xl,
  },
  noteName: {
    color: colors.neonGreen,
    fontSize: 64,
    fontWeight: "bold",
  },
  frequency: {
    color: colors.textPrimary,
    fontSize: 22,
    marginTop: spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  detailItem: {
    alignItems: "center",
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  placeholder: {
    color: colors.textSecondary,
    fontSize: 22,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.neonGreen,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    minWidth: 120,
    alignItems: "center",
  },
  stopButton: {
    backgroundColor: colors.hotPink,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "bold",
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
});
