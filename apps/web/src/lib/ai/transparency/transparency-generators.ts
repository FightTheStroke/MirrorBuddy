/**
 * Transparency Assessment Generators
 * Confidence scoring and hallucination risk calculation
 * Extracted from transparency-service.ts
 */

import {
  TRANSPARENCY_LABELS,
  type ConfidenceAssessment,
  type ConfidenceFactor,
  type ConfidenceLevel,
  type HallucinationIndicator,
  type HallucinationRisk,
  type SourceCitation,
  type TransparencyContext,
} from './types';

/**
 * Map source type strings to citation reference types
 */
export function mapSourceType(type?: string): SourceCitation['referenceType'] {
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

/**
 * Convert confidence score to confidence level
 */
export function scoreToLevel(score: number): ConfidenceLevel {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  if (score >= 0.4) return 'low';
  return 'uncertain';
}

/**
 * Convert risk score to hallucination level
 */
export function riskScoreToLevel(score: number): HallucinationRisk['level'] {
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  if (score >= 0.2) return 'low';
  return 'none';
}

/**
 * Assess confidence of the response
 */
export function assessConfidence(
  context: TransparencyContext,
  _citations: SourceCitation[],
  labels: typeof TRANSPARENCY_LABELS
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
    explanation: generateConfidenceExplanation(factors, finalScore, labels),
  };
}

/**
 * Assess hallucination risk
 */
export function assessHallucinationRisk(
  context: TransparencyContext,
  confidence: ConfidenceAssessment,
  labels: typeof TRANSPARENCY_LABELS
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
      ? labels.hallucination[level]
      : undefined,
  };
}

/**
 * Generate explanation for confidence assessment
 */
export function generateConfidenceExplanation(
  factors: ConfidenceFactor[],
  score: number,
  labels: typeof TRANSPARENCY_LABELS
): string {
  const level = scoreToLevel(score);
  const positiveFactors = factors.filter((f) => f.impact > 0);
  const negativeFactors = factors.filter((f) => f.impact < 0);

  let explanation = labels.confidence[level] + '. ';

  if (positiveFactors.length > 0) {
    explanation += positiveFactors.map((f) => f.description).join('. ') + '. ';
  }

  if (negativeFactors.length > 0 && level !== 'high') {
    explanation += negativeFactors.map((f) => f.description).join('. ') + '.';
  }

  return explanation.trim();
}

/**
 * Determine if transparency UI should be shown
 */
export function shouldShowTransparencyUI(
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
