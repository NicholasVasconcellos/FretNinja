import { requireNativeModule } from "expo";

import type { PitchResult } from "./types";

interface PitchDetectorModuleType {
  start(): Promise<void>;
  stop(): void;
  getLatestPitch(): PitchResult;
}

const PitchDetectorModule =
  requireNativeModule<PitchDetectorModuleType>("PitchDetector");

export default PitchDetectorModule;
