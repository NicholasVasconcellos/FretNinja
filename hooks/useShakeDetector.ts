import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

const SHAKE_THRESHOLD = 1.8; // g-force magnitude to count as a shake
const SHAKE_COOLDOWN_MS = 1000; // ignore shakes for this long after triggering

/**
 * Calls `onShake` when the device is shaken.
 * Listens to the accelerometer and fires when acceleration magnitude
 * exceeds a threshold, with a cooldown to prevent rapid re-fires.
 */
export function useShakeDetector(onShake: () => void) {
  const lastShakeRef = useRef(0);
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  useEffect(() => {
    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      if (magnitude > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeRef.current > SHAKE_COOLDOWN_MS) {
          lastShakeRef.current = now;
          onShakeRef.current();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
