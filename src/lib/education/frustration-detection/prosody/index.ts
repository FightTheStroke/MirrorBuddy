/**
 * Prosody analysis module
 * Phase 3: Web Audio based pitch, volume, and emotional detection
 */

export * from './types';
export {
  detectPitch,
  calculateRMS,
  analyzeSpectrum,
  analyzeProsody,
  inferEmotions,
} from './analyzer';
export {
  ProsodyMonitor,
  getGlobalProsodyMonitor,
  resetGlobalProsodyMonitor,
  type MonitorConfig,
} from './realtime-monitor';
