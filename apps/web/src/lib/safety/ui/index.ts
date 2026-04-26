/**
 * Safety UI Module
 * Part of Ethical Design Hardening (F-05, F-06)
 *
 * Provides UI components and services for displaying
 * safety information to users.
 */

// Types
export type {
  SafetyFilterType,
  SafetySeverity,
  SafetyIndicatorConfig,
  BlockExplanation,
  SafetyFilterResult,
} from './types';

export { SAFETY_LABELS } from './types';

// Safety Indicator Service (F-05)
export {
  getSafetyIndicatorConfig,
  shouldShowProminentIndicator,
  getAccessibleDescription,
} from './safety-indicator-service';

// Block Explainability Service (F-06)
export {
  generateBlockExplanation,
  getExplanationEmoji,
  formatExplanationForDisplay,
} from './block-explainability-service';
