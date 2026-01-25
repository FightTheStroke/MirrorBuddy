/**
 * Cross-Encoder Style Reranker for RAG
 * Improves retrieval precision by re-scoring candidates after initial retrieval.
 *
 * Uses heuristic scoring (no external dependencies) with signals:
 * - Exact phrase matching
 * - Query term coverage
 * - Term proximity
 * - Length normalization
 *
 * @module rag/reranker
 * @see ADR 0033 - RAG System Architecture
 */

import { logger } from "@/lib/logger";

export interface RerankerDocument {
  id: string;
  content: string;
  originalScore: number;
  metadata?: Record<string, unknown>;
}

export interface RerankedDocument extends RerankerDocument {
  rerankedScore: number;
  signals: RerankerSignals;
}

export interface RerankerSignals {
  exactPhraseMatch: number;
  termCoverage: number;
  termProximity: number;
  lengthPenalty: number;
}

export interface RerankerOptions {
  /** Weight for exact phrase matching (0-1) */
  exactPhraseWeight?: number;
  /** Weight for query term coverage (0-1) */
  termCoverageWeight?: number;
  /** Weight for term proximity (0-1) */
  termProximityWeight?: number;
  /** Weight for original score (0-1) */
  originalScoreWeight?: number;
  /** Ideal document length in characters */
  idealLength?: number;
  /** Maximum results to return */
  topK?: number;
}

const DEFAULT_OPTIONS: Required<RerankerOptions> = {
  exactPhraseWeight: 0.25,
  termCoverageWeight: 0.25,
  termProximityWeight: 0.15,
  originalScoreWeight: 0.35,
  idealLength: 500,
  topK: 10,
};

/**
 * Extract significant terms from query (removes stop words)
 */
function extractQueryTerms(query: string): string[] {
  const stopWords = new Set([
    // Italian
    "il",
    "lo",
    "la",
    "i",
    "gli",
    "le",
    "un",
    "uno",
    "una",
    "di",
    "a",
    "da",
    "in",
    "con",
    "su",
    "per",
    "tra",
    "fra",
    "che",
    "e",
    "non",
    "come",
    "cosa",
    "dove",
    "quando",
    "perché",
    "è",
    "sono",
    "essere",
    "ho",
    "ha",
    "hanno",
    "questo",
    "questa",
    // English
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "is",
    "are",
    "was",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "what",
    "where",
    "when",
    "why",
    "how",
    "which",
    "who",
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\sàèéìòù]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !stopWords.has(term));
}

/**
 * Calculate exact phrase match score
 * Returns 1.0 if query appears verbatim, partial score for substrings
 */
function calcExactPhraseMatch(query: string, content: string): number {
  const queryLower = query.toLowerCase().trim();
  const contentLower = content.toLowerCase();

  // Full query match
  if (contentLower.includes(queryLower)) {
    return 1.0;
  }

  // Check for significant subphrases (3+ word sequences)
  const words = queryLower.split(/\s+/).filter((w) => w.length > 2);
  if (words.length < 3) return 0;

  let maxMatch = 0;
  for (let len = Math.min(words.length, 5); len >= 3; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(" ");
      if (contentLower.includes(phrase)) {
        maxMatch = Math.max(maxMatch, len / words.length);
      }
    }
  }

  return maxMatch;
}

/**
 * Calculate query term coverage
 * Returns percentage of query terms found in document
 */
function calcTermCoverage(queryTerms: string[], content: string): number {
  if (queryTerms.length === 0) return 0;

  const contentLower = content.toLowerCase();
  const foundTerms = queryTerms.filter((term) => contentLower.includes(term));

  return foundTerms.length / queryTerms.length;
}

/**
 * Calculate term proximity score
 * Higher score when query terms appear close together
 */
function calcTermProximity(queryTerms: string[], content: string): number {
  if (queryTerms.length < 2) return 1.0;

  const contentLower = content.toLowerCase();
  const positions: number[] = [];

  // Find first occurrence of each term
  for (const term of queryTerms) {
    const pos = contentLower.indexOf(term);
    if (pos !== -1) {
      positions.push(pos);
    }
  }

  if (positions.length < 2) return 0;

  // Calculate average distance between consecutive terms
  positions.sort((a, b) => a - b);
  let totalDistance = 0;
  for (let i = 1; i < positions.length; i++) {
    totalDistance += positions[i] - positions[i - 1];
  }
  const avgDistance = totalDistance / (positions.length - 1);

  // Normalize: 0-50 chars apart = 1.0, 500+ chars = 0.0
  const normalizedProximity = Math.max(0, 1 - avgDistance / 500);

  return normalizedProximity;
}

/**
 * Calculate length penalty
 * Penalizes documents that are too short or too long
 */
function calcLengthPenalty(contentLength: number, idealLength: number): number {
  const ratio = contentLength / idealLength;

  // Gaussian-like penalty centered at ratio=1
  if (ratio < 0.2) return 0.5; // Too short
  if (ratio > 5) return 0.7; // Too long
  if (ratio >= 0.5 && ratio <= 2) return 1.0; // Ideal range

  // Gradual penalty outside ideal range
  if (ratio < 0.5) return 0.5 + (ratio - 0.2) * (0.5 / 0.3);
  return 1.0 - (ratio - 2) * (0.3 / 3);
}

/**
 * Rerank documents using cross-encoder style heuristics
 *
 * @param query - The user's search query
 * @param documents - Documents to rerank (from initial retrieval)
 * @param options - Reranking configuration
 * @returns Reranked documents sorted by score
 */
export function rerank(
  query: string,
  documents: RerankerDocument[],
  options: RerankerOptions = {},
): RerankedDocument[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const queryTerms = extractQueryTerms(query);

  logger.debug("[Reranker] Starting rerank", {
    query: query.slice(0, 50),
    documentCount: documents.length,
    queryTermCount: queryTerms.length,
  });

  const reranked: RerankedDocument[] = documents.map((doc) => {
    // Calculate all signals
    const exactPhraseMatch = calcExactPhraseMatch(query, doc.content);
    const termCoverage = calcTermCoverage(queryTerms, doc.content);
    const termProximity = calcTermProximity(queryTerms, doc.content);
    const lengthPenalty = calcLengthPenalty(
      doc.content.length,
      opts.idealLength,
    );

    // Weighted combination
    const rerankedScore =
      opts.exactPhraseWeight * exactPhraseMatch +
      opts.termCoverageWeight * termCoverage +
      opts.termProximityWeight * termProximity +
      opts.originalScoreWeight * doc.originalScore * lengthPenalty;

    return {
      ...doc,
      rerankedScore,
      signals: {
        exactPhraseMatch,
        termCoverage,
        termProximity,
        lengthPenalty,
      },
    };
  });

  // Sort by reranked score descending
  reranked.sort((a, b) => b.rerankedScore - a.rerankedScore);

  // Limit to topK
  const result = reranked.slice(0, opts.topK);

  logger.debug("[Reranker] Rerank complete", {
    inputCount: documents.length,
    outputCount: result.length,
    topScore: result[0]?.rerankedScore ?? 0,
  });

  return result;
}
