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

/**
 * Calculate average frequency level from analyser
 */
export function calculateAverageLevel(analyser: AnalyserNode): number {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  const average = sum / dataArray.length;

  // Scale to 0-1 range with 2.5x multiplier for sensitivity
  return Math.min(1, (average / 255) * 2.5);
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
