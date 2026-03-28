/**
 * Maps user-friendly 1–10 slider values to the actual DSP thresholds
 * used by the pitch detection pipeline.
 *
 * Sensitivity 5 and Noise Gate 5 reproduce the original hardcoded defaults.
 */

// ── Sensitivity (1-10) → confidence thresholds ──────────────

/** JS-side minConfidence: the tightest gate, filters in the polling hook */
const JS_CONFIDENCE: Record<number, number> = {
  1: 0.97,
  2: 0.95,
  3: 0.92,
  4: 0.88,
  5: 0.85, // default (original)
  6: 0.80,
  7: 0.74,
  8: 0.67,
  9: 0.58,
  10: 0.50,
};

/** Native-side MIN_CONFIDENCE: pre-filter in C++ before JS ever sees the result */
const NATIVE_CONFIDENCE: Record<number, number> = {
  1: 0.80,
  2: 0.73,
  3: 0.67,
  4: 0.60,
  5: 0.50, // default (original)
  6: 0.43,
  7: 0.37,
  8: 0.30,
  9: 0.23,
  10: 0.15,
};

// ── Noise Gate (1-10) → RMS silence threshold ───────────────

const RMS_THRESHOLD: Record<number, number> = {
  1: 0.002,
  2: 0.004,
  3: 0.006,
  4: 0.008,
  5: 0.01, // default (original)
  6: 0.015,
  7: 0.025,
  8: 0.04,
  9: 0.06,
  10: 0.1,
};

// ── Public API ──────────────────────────────────────────────

export function sensitivityToJsConfidence(level: number): number {
  return JS_CONFIDENCE[level] ?? 0.85;
}

export function sensitivityToNativeConfidence(level: number): number {
  return NATIVE_CONFIDENCE[level] ?? 0.50;
}

export function noiseGateToRmsThreshold(level: number): number {
  return RMS_THRESHOLD[level] ?? 0.01;
}
