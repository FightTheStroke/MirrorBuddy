/**
 * RAG Retrieval Service Type Definitions
 */

/**
 * Result from retrieval operations
 */
export interface RetrievalResult {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  subject: string | null;
  tags: string[];
}

/**
 * Options for finding similar materials
 */
export interface FindSimilarOptions {
  userId: string;
  query?: string;
  embedding?: number[];
  limit?: number;
  minSimilarity?: number;
  subject?: string;
  excludeSourceIds?: string[];
}

/**
 * Options for finding related concepts
 */
export interface FindRelatedOptions {
  userId: string;
  query?: string;
  embedding?: number[];
  limit?: number;
  minSimilarity?: number;
  subject?: string;
  includeFlashcards?: boolean;
  includeStudykits?: boolean;
  excludeSourceIds?: string[];
}

/**
 * Input for indexing material
 */
export interface IndexMaterialInput {
  userId: string;
  sourceType: 'material' | 'flashcard' | 'studykit' | 'message';
  sourceId: string;
  content: string;
  subject?: string;
  tags?: string[];
}

/**
 * Result from indexing operation
 */
export interface IndexResult {
  chunksIndexed: number;
  totalTokens: number;
  embeddingIds: string[];
}
