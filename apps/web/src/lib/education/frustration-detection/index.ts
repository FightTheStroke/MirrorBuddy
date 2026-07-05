/**
 * Frustration Detection Module
 *
 * Two-phase frustration detection system:
 * - Phase 1: i18n text patterns + repeated attempts + sentiment trend
 * - Phase 2: Azure Speech timing analysis + pause detection
 *
 * (A former "Phase 3" ran voice-prosody emotion inference on raw audio.
 * Removed for AI-Act P0-1: emotion recognition in education is a prohibited
 * practice under Art. 5(1)(f). See classifier.ts's file comment.)
 *
 * Supports: Italian, English, Spanish, French, German
 *
 * @example
 * ```typescript
 * import { createClassifier } from '@/lib/education/frustration-detection';
 *
 * const classifier = createClassifier({ locale: 'it' });
 *
 * const result = classifier.classify({
 *   text: transcription,
 *   wordTimings: azureWordTimings,
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
