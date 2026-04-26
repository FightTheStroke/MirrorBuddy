/**
 * AI Transparency Module
 * Part of Ethical Design Hardening (F-09, F-10, F-11, F-12)
 *
 * Provides source attribution, confidence scoring, and
 * hallucination detection for AI responses.
 */

// Types
export type {
  ResponseSourceType,
  SourceCitation,
  ConfidenceLevel,
  ConfidenceAssessment,
  ConfidenceFactor,
  HallucinationRisk,
  HallucinationIndicator,
  ResponseTransparencyMetadata,
  TransparencyDisplayConfig,
} from './types';

export { TRANSPARENCY_LABELS } from './types';

// Service functions
export {
  assessResponseTransparency,
  getTransparencyDisplayConfig,
  formatCitationsForDisplay,
  type TransparencyContext,
} from './transparency-service';
