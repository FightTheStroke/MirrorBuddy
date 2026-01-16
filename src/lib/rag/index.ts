/**
 * RAG (Retrieval-Augmented Generation) Module
 * @module rag
 */

export {
  chunkText,
  chunkByParagraphs,
  chunkBySentences,
  estimateTokens,
  type TextChunk,
  type ChunkOptions,
} from './semantic-chunker';

export {
  generateEmbedding,
  generateEmbeddings,
  isEmbeddingConfigured,
  getEmbeddingDimensions,
  cosineSimilarity,
  type EmbeddingResult,
} from './embedding-service';

export {
  storeEmbedding,
  searchSimilar,
  deleteEmbeddings,
  getEmbeddingCount,
  type StoreEmbeddingInput,
  type VectorSearchResult,
  type SearchOptions,
  type DeleteOptions,
} from './vector-store';

export {
  isPostgresDatabase,
  checkPgvectorStatus,
  clearPgvectorStatusCache,
  formatVectorForPg,
  nativeVectorSearch,
  updateNativeVector,
  type PgvectorStatus,
  type NativeSearchOptions,
  type NativeSearchResult,
  type PrismaQueryClient,
  type PrismaExecuteClient,
} from './pgvector-utils';

export {
  findSimilarMaterials,
  findRelatedConcepts,
  indexMaterial,
  type RetrievalResult,
  type FindSimilarOptions,
  type FindRelatedOptions,
  type IndexMaterialInput,
  type IndexResult,
} from './retrieval-service';

export {
  hybridSearch,
  textSimilarity,
  type HybridRetrievalResult,
  type HybridSearchOptions,
} from './hybrid-retrieval';

// Privacy-aware embeddings (Ethical Design Hardening F-04)
export {
  generatePrivacyAwareEmbedding,
  generatePrivacyAwareEmbeddings,
  requiresAnonymization,
  anonymizeConversationForRAG,
  type PrivacyAwareEmbeddingResult,
  type PrivacyEmbeddingOptions,
} from './privacy-aware-embedding';
