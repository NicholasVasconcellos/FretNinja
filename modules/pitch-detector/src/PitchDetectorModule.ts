import { requireNativeModule } from "expo";

export interface PitchResult {
  frequency: number;
  note: string;
  confidence: number;
}

interface PitchDetectorModuleType {
  start(): void;
  stop(): void;
  getLatestPitch(): PitchResult;
}

const PitchDetectorModule =
  requireNativeModule<PitchDetectorModuleType>("PitchDetector");

export default PitchDetectorModule;
