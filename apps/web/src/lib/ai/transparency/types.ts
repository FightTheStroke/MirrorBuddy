/**
 * AI Transparency Types
 * Part of Ethical Design Hardening (F-09, F-10, F-11, F-12)
 *
 * Defines types for source attribution, confidence scoring,
 * and hallucination detection in AI responses.
 */

/**
 * Source types for AI response content
 */
export type ResponseSourceType =
  | 'knowledge_base'      // From maestro's embedded knowledge
  | 'rag_retrieval'       // From RAG vector search
  | 'user_material'       // From user's uploaded/created content
  | 'model_generated'     // Pure LLM generation
  | 'hybrid'              // Mix of sources
  | 'unknown';            // Cannot determine

/**
 * Individual source citation
 */
export interface SourceCitation {
  /** Type of source */
  type: ResponseSourceType;
  /** Human-readable description */
  label: string;
  /** Optional reference ID (flashcard ID, material ID, etc.) */
  referenceId?: string;
  /** Optional reference type */
  referenceType?: 'flashcard' | 'study_material' | 'knowledge_base' | 'conversation';
  /** Confidence that this source contributed (0-1) */
  confidence: number;
  /** Excerpt or snippet from source (for verification) */
  excerpt?: string;
}

/**
 * Confidence level for AI response
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'uncertain';

/**
 * Confidence assessment result
 */
export interface ConfidenceAssessment {
  /** Overall confidence level */
  level: ConfidenceLevel;
  /** Numeric score (0-1) */
  score: number;
  /** Factors that influenced the confidence */
  factors: ConfidenceFactor[];
  /** Human-readable explanation */
  explanation: string;
}

/**
 * Factor contributing to confidence score
 */
export interface ConfidenceFactor {
  /** Factor name */
  name: string;
  /** Contribution to score (-1 to +1) */
  impact: number;
  /** Description */
  description: string;
}

/**
 * Hallucination risk assessment
 */
export interface HallucinationRisk {
  /** Risk level */
  level: 'none' | 'low' | 'medium' | 'high';
  /** Risk score (0-1) */
  score: number;
  /** Indicators that suggest hallucination */
  indicators: HallucinationIndicator[];
  /** Suggested disclaimer if risk > low */
  disclaimer?: string;
}

/**
 * Indicator of potential hallucination
 */
export interface HallucinationIndicator {
  /** Type of indicator */
  type:
    | 'no_source_match'      // No RAG match found
    | 'low_similarity'       // RAG match has low similarity
    | 'factual_claim'        // Contains specific facts/numbers
    | 'temporal_reference'   // References specific dates/events
    | 'technical_detail'     // Contains technical specifics
    | 'contradicts_knowledge'; // Contradicts embedded knowledge
  /** Confidence in this indicator (0-1) */
  confidence: number;
  /** Description */
  description: string;
}

/**
 * Complete transparency metadata for an AI response
 */
export interface ResponseTransparencyMetadata {
  /** Primary source of the response */
  primarySource: ResponseSourceType;
  /** All sources that contributed */
  citations: SourceCitation[];
  /** Confidence assessment */
  confidence: ConfidenceAssessment;
  /** Hallucination risk */
  hallucinationRisk: HallucinationRisk;
  /** Whether response should show transparency UI */
  showTransparencyUI: boolean;
  /** Timestamp of assessment */
  assessedAt: Date;
}

/**
 * Transparency display config for UI
 */
export interface TransparencyDisplayConfig {
  /** Show source attribution badge */
  showSourceBadge: boolean;
  /** Show confidence indicator */
  showConfidence: boolean;
  /** Show hallucination warning if applicable */
  showHallucinationWarning: boolean;
  /** Badge color based on confidence */
  badgeColor: 'green' | 'yellow' | 'orange' | 'red';
  /** Icon to display */
  icon: 'verified' | 'info' | 'warning' | 'question';
}

/**
 * Labels for UI display (Italian)
 */
export const TRANSPARENCY_LABELS = {
  sources: {
    knowledge_base: 'Dalla base di conoscenza del Maestro',
    rag_retrieval: 'Dai tuoi materiali di studio',
    user_material: 'Dal tuo contenuto',
    model_generated: 'Risposta generata dall\'AI',
    hybrid: 'Da fonti multiple',
    unknown: 'Fonte non determinata',
  },
  confidence: {
    high: 'Alta affidabilità',
    medium: 'Affidabilità media',
    low: 'Bassa affidabilità',
    uncertain: 'Da verificare',
  },
  hallucination: {
    none: '',
    low: '',
    medium: 'Questa risposta potrebbe contenere informazioni da verificare.',
    high: 'Attenzione: questa risposta potrebbe non essere accurata. Ti consiglio di verificare con altre fonti.',
  },
} as const;

/**
 * Context for transparency assessment
 * (Extracted to break circular dependency)
 */
export interface TransparencyContext {
  /** The AI response to assess */
  response: string;
  /** The user's original query */
  query: string;
  /** RAG retrieval results (if any) */
  ragResults?: Array<{
    content: string;
    similarity: number;
    sourceId?: string;
    sourceType?: string;
  }>;
  /** Whether maestro knowledge was used */
  usedKnowledgeBase: boolean;
  /** Maestro ID (for knowledge attribution) */
  maestroId?: string;
  /** Whether response was streamed */
  isStreamed?: boolean;
}
