/**
 * Hybrid Retrieval Type Definitions
 */

/**
 * Result from hybrid retrieval with component scores
 */
export interface HybridRetrievalResult {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  combinedScore: number;
  semanticScore: number;
  keywordScore: number;
  subject: string | null;
  tags: string[];
}

/**
 * Options for hybrid search
 */
export interface HybridSearchOptions {
  userId: string;
  query: string;
  limit?: number;
  minScore?: number;
  sourceType?: 'material' | 'flashcard' | 'studykit' | 'message';
  subject?: string;
  semanticWeight?: number;
  excludeSourceIds?: string[];
}

/**
 * Options for keyword search
 */
export interface KeywordSearchOptions {
  userId: string;
  keywords: string[];
  limit: number;
  sourceType?: string;
  subject?: string;
}

/**
 * Result from keyword search
 */
export interface KeywordMatch {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  matchCount: number;
  subject: string | null;
  tags: string[];
}
