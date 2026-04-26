// ============================================================================
// Transport Monitor Helpers
// Latency calculation and spike detection
// ============================================================================

'use client';

/**
 * Calculate average latency from history
 */
export function calculateAverageLatency(latencyHistory: number[]): number {
  if (latencyHistory.length === 0) return 0;
  const sum = latencyHistory.reduce((a, b) => a + b, 0);
  return sum / latencyHistory.length;
}

/**
 * Detect if latency represents a spike
 */
export function isLatencySpike(
  latencyMs: number,
  latencyHistory: number[],
  thresholdMs: number,
  multiplier: number
): boolean {
  // Need some history first
  if (latencyHistory.length < 3) return false;

  // Check if latency exceeds absolute threshold
  if (latencyMs > thresholdMs) return true;

  // Check if latency exceeds multiplier of average
  const avgWithoutCurrent = latencyHistory
    .slice(0, -1)
    .reduce((a, b) => a + b, 0) / (latencyHistory.length - 1);

  return latencyMs > avgWithoutCurrent * multiplier;
}

/**
 * Append latency to history with max size limit
 */
export function appendToHistory(
  history: number[],
  latencyMs: number,
  maxSize: number
): number[] {
  const newHistory = [...history, latencyMs];
  if (newHistory.length > maxSize) {
    newHistory.shift();
  }
  return newHistory;
}
