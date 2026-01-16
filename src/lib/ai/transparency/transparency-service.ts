/**
 * AI Transparency Service
 * Part of Ethical Design Hardening (F-09, F-10, F-11, F-12)
 *
 * Provides source attribution, confidence scoring, and
 * hallucination detection for AI responses.
 */

import { logger } from '@/lib/logger';
import {
  ConfidenceAssessment,
  ConfidenceFactor,
  ConfidenceLevel,
  HallucinationIndicator,
  HallucinationRisk,
  ResponseSourceType,
  ResponseTransparencyMetadata,
  SourceCitation,
  TransparencyDisplayConfig,
  TRANSPARENCY_LABELS,
} from './types';

const log = logger.child({ module: 'ai-transparency' });

/**
 * Context for transparency assessment
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

/**
 * Assess transparency for an AI response
 */
export function assessResponseTransparency(
  context: TransparencyContext
): ResponseTransparencyMetadata {
  const citations = extractCitations(context);
  const primarySource = determinePrimarySource(citations, context);
  const confidence = assessConfidence(context, citations);
  const hallucinationRisk = assessHallucinationRisk(context, confidence);

  const metadata: ResponseTransparencyMetadata = {
    primarySource,
    citations,
    confidence,
    hallucinationRisk,
    showTransparencyUI: shouldShowTransparencyUI(confidence, hallucinationRisk),
    assessedAt: new Date(),
  };

  log.debug('Assessed response transparency', {
    primarySource,
    citationCount: citations.length,
    confidenceLevel: confidence.level,
    hallucinationLevel: hallucinationRisk.level,
  });

  return metadata;
}

/**
 * Extract citations from context
 */
function extractCitations(context: TransparencyContext): SourceCitation[] {
  const citations: SourceCitation[] = [];

  // Add RAG citations
  if (context.ragResults && context.ragResults.length > 0) {
    for (const result of context.ragResults) {
      if (result.similarity >= 0.7) {
        citations.push({
          type: 'rag_retrieval',
          label: TRANSPARENCY_LABELS.sources.rag_retrieval,
          referenceId: result.sourceId,
          referenceType: mapSourceType(result.sourceType),
          confidence: result.similarity,
          excerpt: result.content.slice(0, 150) + '...',
        });
      }
    }
  }

  // Add knowledge base citation
  if (context.usedKnowledgeBase && context.maestroId) {
    citations.push({
      type: 'knowledge_base',
      label: TRANSPARENCY_LABELS.sources.knowledge_base,
      referenceId: context.maestroId,
      referenceType: 'knowledge_base',
      confidence: 0.9, // High confidence for embedded knowledge
    });
  }

  // If no specific sources, mark as model generated
  if (citations.length === 0) {
    citations.push({
      type: 'model_generated',
      label: TRANSPARENCY_LABELS.sources.model_generated,
      confidence: 1.0,
    });
  }

  return citations;
}

/**
 * Determine primary source of response
 */
function determinePrimarySource(
  citations: SourceCitation[],
  context: TransparencyContext
): ResponseSourceType {
  if (citations.length === 0) {
    return 'model_generated';
  }

  // Check for high-confidence RAG match
  const ragCitation = citations.find(
    (c) => c.type === 'rag_retrieval' && c.confidence >= 0.85
  );
  if (ragCitation) {
    return 'rag_retrieval';
  }

  // Check for knowledge base usage
  if (context.usedKnowledgeBase) {
    return 'knowledge_base';
  }

  // Multiple sources = hybrid
  const sourceTypes = new Set(citations.map((c) => c.type));
  if (sourceTypes.size > 1) {
    return 'hybrid';
  }

  return citations[0]?.type || 'unknown';
}

/**
 * Assess confidence of the response
 */
function assessConfidence(
  context: TransparencyContext,
  _citations: SourceCitation[]
): ConfidenceAssessment {
  const factors: ConfidenceFactor[] = [];
  let baseScore = 0.5;

  // Factor 1: RAG match quality
  if (context.ragResults && context.ragResults.length > 0) {
    const maxSimilarity = Math.max(...context.ragResults.map((r) => r.similarity));
    if (maxSimilarity >= 0.85) {
      factors.push({
        name: 'high_rag_match',
        impact: 0.3,
        description: 'Trovata corrispondenza molto rilevante nei materiali',
      });
      baseScore += 0.3;
    } else if (maxSimilarity >= 0.7) {
      factors.push({
        name: 'moderate_rag_match',
        impact: 0.15,
        description: 'Trovata corrispondenza nei materiali',
      });
      baseScore += 0.15;
    } else {
      factors.push({
        name: 'low_rag_match',
        impact: -0.1,
        description: 'Corrispondenza debole nei materiali',
      });
      baseScore -= 0.1;
    }
  }

  // Factor 2: Knowledge base usage
  if (context.usedKnowledgeBase) {
    factors.push({
      name: 'knowledge_base',
      impact: 0.2,
      description: 'Risposta basata sulla conoscenza del Maestro',
    });
    baseScore += 0.2;
  }

  // Factor 3: Response length and complexity
  const wordCount = context.response.split(/\s+/).length;
  if (wordCount > 200) {
    factors.push({
      name: 'complex_response',
      impact: -0.05,
      description: 'Risposta complessa, maggiore possibilità di imprecisioni',
    });
    baseScore -= 0.05;
  }

  // Factor 4: Presence of specific claims
  const hasNumbers = /\d{4}|\d+%|\d+\.\d+/.test(context.response);
  const hasDates = /\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|\d{1,2}\/\d{1,2}\/\d{2,4})\b/i.test(context.response);

  if (hasNumbers || hasDates) {
    factors.push({
      name: 'specific_claims',
      impact: -0.1,
      description: 'Contiene dati specifici da verificare',
    });
    baseScore -= 0.1;
  }

  // Clamp score
  const finalScore = Math.max(0, Math.min(1, baseScore));

  return {
    level: scoreToLevel(finalScore),
    score: finalScore,
    factors,
    explanation: generateConfidenceExplanation(factors, finalScore),
  };
}

/**
 * Assess hallucination risk
 */
function assessHallucinationRisk(
  context: TransparencyContext,
  confidence: ConfidenceAssessment
): HallucinationRisk {
  const indicators: HallucinationIndicator[] = [];
  let riskScore = 0;

  // Indicator 1: No RAG match
  if (!context.ragResults || context.ragResults.length === 0) {
    if (!context.usedKnowledgeBase) {
      indicators.push({
        type: 'no_source_match',
        confidence: 0.8,
        description: 'Nessuna fonte specifica trovata',
      });
      riskScore += 0.3;
    }
  }

  // Indicator 2: Low similarity RAG matches
  if (context.ragResults) {
    const maxSimilarity = Math.max(...context.ragResults.map((r) => r.similarity), 0);
    if (maxSimilarity > 0 && maxSimilarity < 0.7) {
      indicators.push({
        type: 'low_similarity',
        confidence: 0.7,
        description: 'Corrispondenze trovate hanno bassa rilevanza',
      });
      riskScore += 0.2;
    }
  }

  // Indicator 3: Factual claims without sources
  const hasFactualClaims = /\b(nel \d{4}|è stato|sono stati|secondo|ha dimostrato|studi mostrano)\b/i.test(context.response);
  if (hasFactualClaims && !context.usedKnowledgeBase) {
    indicators.push({
      type: 'factual_claim',
      confidence: 0.6,
      description: 'Contiene affermazioni fattuali',
    });
    riskScore += 0.15;
  }

  // Indicator 4: Low overall confidence
  if (confidence.score < 0.5) {
    riskScore += 0.2;
  }

  // Clamp risk score
  const finalRisk = Math.max(0, Math.min(1, riskScore));
  const level = riskScoreToLevel(finalRisk);

  return {
    level,
    score: finalRisk,
    indicators,
    disclaimer: level !== 'none' && level !== 'low'
      ? TRANSPARENCY_LABELS.hallucination[level]
      : undefined,
  };
}

/**
 * Get display configuration for UI
 */
export function getTransparencyDisplayConfig(
  metadata: ResponseTransparencyMetadata
): TransparencyDisplayConfig {
  const { confidence, hallucinationRisk } = metadata;

  let badgeColor: TransparencyDisplayConfig['badgeColor'];
  let icon: TransparencyDisplayConfig['icon'];

  if (hallucinationRisk.level === 'high') {
    badgeColor = 'red';
    icon = 'warning';
  } else if (hallucinationRisk.level === 'medium' || confidence.level === 'low') {
    badgeColor = 'orange';
    icon = 'warning';
  } else if (confidence.level === 'uncertain') {
    badgeColor = 'yellow';
    icon = 'question';
  } else if (confidence.level === 'high') {
    badgeColor = 'green';
    icon = 'verified';
  } else {
    badgeColor = 'yellow';
    icon = 'info';
  }

  return {
    showSourceBadge: true,
    showConfidence: true,
    showHallucinationWarning: hallucinationRisk.level !== 'none' && hallucinationRisk.level !== 'low',
    badgeColor,
    icon,
  };
}

/**
 * Format citations for display
 */
export function formatCitationsForDisplay(
  citations: SourceCitation[]
): string {
  if (citations.length === 0) {
    return TRANSPARENCY_LABELS.sources.model_generated;
  }

  const mainSource = citations[0];
  if (citations.length === 1) {
    return mainSource.label;
  }

  return `${mainSource.label} (+${citations.length - 1} altre fonti)`;
}

// Helper functions
function mapSourceType(type?: string): SourceCitation['referenceType'] {
  switch (type) {
    case 'flashcard':
      return 'flashcard';
    case 'material':
    case 'study_material':
      return 'study_material';
    case 'conversation':
      return 'conversation';
    default:
      return 'knowledge_base';
  }
}

function scoreToLevel(score: number): ConfidenceLevel {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  if (score >= 0.4) return 'low';
  return 'uncertain';
}

function riskScoreToLevel(score: number): HallucinationRisk['level'] {
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  if (score >= 0.2) return 'low';
  return 'none';
}

function generateConfidenceExplanation(
  factors: ConfidenceFactor[],
  score: number
): string {
  const level = scoreToLevel(score);
  const positiveFactors = factors.filter((f) => f.impact > 0);
  const negativeFactors = factors.filter((f) => f.impact < 0);

  let explanation = TRANSPARENCY_LABELS.confidence[level] + '. ';

  if (positiveFactors.length > 0) {
    explanation += positiveFactors.map((f) => f.description).join('. ') + '. ';
  }

  if (negativeFactors.length > 0 && level !== 'high') {
    explanation += negativeFactors.map((f) => f.description).join('. ') + '.';
  }

  return explanation.trim();
}

function shouldShowTransparencyUI(
  confidence: ConfidenceAssessment,
  hallucination: HallucinationRisk
): boolean {
  // Always show if there's hallucination risk
  if (hallucination.level !== 'none') return true;
  // Show if confidence is not high
  if (confidence.level !== 'high') return true;
  // Default to showing for educational transparency
  return true;
}
