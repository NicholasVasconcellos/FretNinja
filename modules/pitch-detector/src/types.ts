export interface PitchResult {
  frequency: number;
  confidence: number;
  note: string;
  octave: number;
  cents: number;
}

export interface DebugInfo {
  latencyMs: number;
}

export type PitchDetectorStatus = "idle" | "starting" | "active";

export interface UsePitchDetectorOptions {
  pollRate?: number;
  minConfidence?: number;
  debug?: boolean;
  /** Native RMS silence threshold (passed to C++ YIN before start) */
  nativeRmsThreshold?: number;
  /** Native minimum confidence (passed to C++ YIN before start) */
  nativeMinConfidence?: number;
}

export interface UsePitchDetectorReturn {
  pitch: PitchResult | null;
  status: PitchDetectorStatus;
  start: () => Promise<void>;
  stop: () => void;
  debug: DebugInfo | null;
}
