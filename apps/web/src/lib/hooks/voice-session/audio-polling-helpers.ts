// ============================================================================
// Audio Output Level Polling Helpers
// Real-time level monitoring for audio playback
// ============================================================================

'use client';

/**
 * Poll level state for animation frame recursion
 */
export interface PollLevelState {
  animationFrameRef: React.MutableRefObject<number | null>;
  dataArrayRef: React.MutableRefObject<Uint8Array<ArrayBuffer> | null>;
  lastUpdateRef: React.MutableRefObject<number>;
}

// Reusable typed array for frequency data (avoids allocation per frame)
let sharedDataArray: Uint8Array<ArrayBuffer> | null = null;

/**
 * Calculate average frequency level from analyser
 * Reuses typed array to minimize GC pressure
 */
export function calculateAverageLevel(analyser: AnalyserNode): number {
  const binCount = analyser.frequencyBinCount;

  // Reuse or create typed array
  if (!sharedDataArray || sharedDataArray.length !== binCount) {
    sharedDataArray = new Uint8Array(binCount);
  }

  analyser.getByteFrequencyData(sharedDataArray);

  let sum = 0;
  for (let i = 0; i < binCount; i++) {
    sum += sharedDataArray[i];
  }
  const average = sum / binCount;

  // Scale to 0-1 range with 2.5x multiplier for sensitivity
  return Math.min(1, (average / 255) * 2.5);
}

/** Minimum delta (5%) to trigger level update - prevents jitter */
const LEVEL_DELTA_THRESHOLD = 0.05;

/**
 * Check if level delta exceeds threshold (debounce by 5% change)
 */
export function shouldUpdateLevelByDelta(
  newLevel: number,
  lastLevelRef: React.MutableRefObject<number>
): boolean {
  const delta = Math.abs(newLevel - lastLevelRef.current);
  if (delta >= LEVEL_DELTA_THRESHOLD) {
    lastLevelRef.current = newLevel;
    return true;
  }
  return false;
}

/**
 * Check if throttle interval (33ms ~30fps) has passed
 */
export function shouldUpdateLevel(lastUpdateRef: React.MutableRefObject<number>): boolean {
  const now = performance.now();
  const elapsed = now - lastUpdateRef.current;
  if (elapsed >= 33) {
    lastUpdateRef.current = now;
    return true;
  }
  return false;
}
