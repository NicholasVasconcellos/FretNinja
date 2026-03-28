import { requireNativeModule } from "expo";

import type { PitchResult } from "./types";

interface PitchDetectorModuleType {
  start(): Promise<void>;
  stop(): void;
  configure(rmsThreshold: number, nativeConfidence: number): void;
  getLatestPitch(): PitchResult;
  getLatencyMs(): number;
}

const PitchDetectorModule =
  requireNativeModule<PitchDetectorModuleType>("PitchDetector");

export default PitchDetectorModule;
