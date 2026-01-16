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
  ResponseSourceType,
  ResponseTransparencyMetadata,
  SourceCitation,
  TransparencyDisplayConfig,
  TRANSPARENCY_LABELS,
} from './types';
import {
  assessConfidence,
  assessHallucinationRisk,
  mapSourceType,
  shouldShowTransparencyUI,
} from './transparency-generators';

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
  const confidence = assessConfidence(context, citations, TRANSPARENCY_LABELS);
  const hallucinationRisk = assessHallucinationRisk(context, confidence, TRANSPARENCY_LABELS);

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
