/**
 * Azure Speech timing analysis module
 * Phase 2: Extract hesitation indicators from word-level timing
 */

export * from './types';
export {
  parseAzureResult,
  detectPauses,
  calculateHesitation,
  categorizeSpeed,
  analyzeTimings,
  segmentFromRealtimeResult,
} from './analyzer';
