/**
 * Maps user-friendly 1–10 slider values to the actual DSP thresholds
 * used by the pitch detection pipeline.
 *
 * Sensitivity 5 and Noise Gate 5 reproduce the original hardcoded defaults.
 */

// ── Sensitivity (1-10) → confidence thresholds ──────────────

/** JS-side minConfidence: the tightest gate, filters in the polling hook.
 *  1–5 is a narrow band around the default so "strict" still detects cleanly;
 *  6–10 opens up aggressively for noisy environments. */
const JS_CONFIDENCE: Record<number, number> = {
  1: 0.90,
  2: 0.88,
  3: 0.87,
  4: 0.86,
  5: 0.85, // default (original)
  6: 0.78,
  7: 0.68,
  8: 0.55,
  9: 0.42,
  10: 0.30,
};

/** Native-side MIN_CONFIDENCE: pre-filter in C++ before JS ever sees the result.
 *  Same asymmetric curve — tight cluster near default, wide tail on the lenient end. */
const NATIVE_CONFIDENCE: Record<number, number> = {
  1: 0.65,
  2: 0.60,
  3: 0.57,
  4: 0.53,
  5: 0.50, // default (original)
  6: 0.40,
  7: 0.30,
  8: 0.20,
  9: 0.12,
  10: 0.05,
};

// ── Noise Gate (1-10) → RMS silence threshold ───────────────
// 1–5 stays close to the default; 6–10 ramps up exponentially
// so higher values meaningfully reject more ambient noise.

const RMS_THRESHOLD: Record<number, number> = {
  1: 0.005,
  2: 0.006,
  3: 0.007,
  4: 0.008,
  5: 0.01, // default (original)
  6: 0.02,
  7: 0.04,
  8: 0.08,
  9: 0.14,
  10: 0.20,
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
