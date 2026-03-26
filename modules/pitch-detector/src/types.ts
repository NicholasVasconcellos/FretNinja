export interface PitchResult {
  frequency: number;
  confidence: number;
  note: string;
  octave: number;
  cents: number;
}

export type PitchDetectorStatus = "idle" | "starting" | "active";

export interface UsePitchDetectorOptions {
  pollRate?: number;
  minConfidence?: number;
}

export interface UsePitchDetectorReturn {
  pitch: PitchResult | null;
  status: PitchDetectorStatus;
  start: () => Promise<void>;
  stop: () => void;
}
