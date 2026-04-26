/**
 * Frustration Detection Module
 *
 * Multi-phase frustration detection system:
 * - Phase 1: i18n text patterns + repeated attempts + sentiment trend
 * - Phase 2: Azure Speech timing analysis + pause detection
 * - Phase 3: Web Audio prosody analysis + emotional inference
 *
 * Supports: Italian, English, Spanish, French, German
 *
 * @example
 * ```typescript
 * import { createClassifier } from '@/lib/education/frustration-detection';
 *
 * const classifier = createClassifier({ locale: 'it' });
 *
 * // Text-only analysis (Phase 1)
 * const result = classifier.classify({ text: "Non ce la faccio più!" });
 *
 * // Full analysis with audio (all phases)
 * const fullResult = classifier.classify({
 *   text: transcription,
 *   wordTimings: azureWordTimings,
 *   audioSamples: audioBuffer,
 *   sampleRate: 16000,
 * });
 *
 * if (result.shouldIntervene) {
 *   console.log(result.interventionType, result.reason);
 * }
 * ```
 */

// Main classifier
export {
  FrustrationClassifier,
  createClassifier,
  type ClassifierInput,
  type ClassifierResult,
  type ClassifierConfig,
} from './classifier';

// Phase 1: Text patterns
export {
  analyzeText,
  detectLocale,
  countFillers,
  getPatterns,
  type SupportedLocale,
  type TextAnalysisResult,
  type PatternMatch,
  type LocalePatterns,
} from './patterns';

// Phase 1: Tracker
export {
  FrustrationTracker,
  getGlobalTracker,
  resetGlobalTracker,
  type FrustrationState,
  type RepeatedAttempt,
  type TrendEntry,
} from './tracker';

// Phase 2: Azure timing
export {
  parseAzureResult,
  analyzeTimings,
  detectPauses,
  calculateHesitation,
  type WordTiming,
  type TimingAnalysisResult,
  type HesitationIndicators,
  type PauseInfo,
} from './azure-timing';

// Phase 3: Prosody
export {
  analyzeProsody,
  detectPitch,
  calculateRMS,
  inferEmotions,
  ProsodyMonitor,
  getGlobalProsodyMonitor,
  resetGlobalProsodyMonitor,
  type ProsodyResult,
  type ProsodyFeatures,
  type EmotionalIndicators,
  type RealTimeProbe,
} from './prosody';
