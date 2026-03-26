import { useCallback, useEffect, useRef, useState } from "react";

import PitchDetectorModule from "./PitchDetectorModule";
import type {
  PitchDetectorStatus,
  PitchResult,
  UsePitchDetectorOptions,
  UsePitchDetectorReturn,
} from "./types";

export function usePitchDetector(
  options?: UsePitchDetectorOptions
): UsePitchDetectorReturn {
  const pollRate = options?.pollRate ?? 30;
  const minConfidence = options?.minConfidence ?? 0.85;

  const [pitch, setPitch] = useState<PitchResult | null>(null);
  const [status, setStatus] = useState<PitchDetectorStatus>("idle");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<PitchDetectorStatus>("idle");

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    const intervalMs = Math.round(1000 / pollRate);
    intervalRef.current = setInterval(() => {
      try {
        const result = PitchDetectorModule.getLatestPitch();
        if (result && result.confidence >= minConfidence) {
          setPitch(result);
        } else {
          setPitch(null);
        }
      } catch {
        setPitch(null);
      }
    }, intervalMs);
  }, [pollRate, minConfidence, stopPolling]);

  const start = useCallback(async () => {
    if (statusRef.current !== "idle") return;
    setStatus("starting");
    statusRef.current = "starting";
    try {
      await PitchDetectorModule.start();
      setStatus("active");
      statusRef.current = "active";
      startPolling();
    } catch (error) {
      setStatus("idle");
      statusRef.current = "idle";
      throw error;
    }
  }, [startPolling]);

  const stop = useCallback(() => {
    stopPolling();
    PitchDetectorModule.stop();
    setPitch(null);
    setStatus("idle");
    statusRef.current = "idle";
  }, [stopPolling]);

  useEffect(() => {
    return () => {
      if (statusRef.current !== "idle") {
        stopPolling();
        try {
          PitchDetectorModule.stop();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [stopPolling]);

  return { pitch, status, start, stop };
}
