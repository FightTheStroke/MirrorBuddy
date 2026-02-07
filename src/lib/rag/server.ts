/**
 * RAG (Retrieval-Augmented Generation) Module - SERVER-ONLY
 * @module rag/server
 *
 * This module re-exports all client-safe symbols from index.ts
 * and adds server-only exports that depend on:
 * - @/lib/db (database access via Prisma)
 * - @/lib/privacy (which has server deps)
 */

// Re-export all client-safe symbols
export * from "./index";

// Server-only exports - vector store (uses @/lib/db)
export {
  storeEmbedding,
  searchSimilar,
  deleteEmbeddings,
  getEmbeddingCount,
  type StoreEmbeddingInput,
  type VectorSearchResult,
  type SearchOptions,
  type DeleteOptions,
} from "./vector-store";

// Server-only exports - pgvector utils (uses Prisma client types + DB)
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
} from "./pgvector-utils";

// Server-only exports - retrieval service (uses vector-store which has DB deps)
export {
  findSimilarMaterials,
  findRelatedConcepts,
  indexMaterial,
  type RetrievalResult,
  type FindSimilarOptions,
  type FindRelatedOptions,
  type IndexMaterialInput,
  type IndexResult,
} from "./retrieval-service";

// Server-only exports - hybrid retrieval (uses @/lib/db)
export {
  hybridSearch,
  textSimilarity,
  type HybridRetrievalResult,
  type HybridSearchOptions,
} from "./hybrid-retrieval";

// Server-only exports - privacy-aware embedding (uses @/lib/privacy)
export {
  generatePrivacyAwareEmbedding,
  generatePrivacyAwareEmbeddings,
  requiresAnonymization,
  anonymizeConversationForRAG,
  type PrivacyAwareEmbeddingResult,
  type PrivacyEmbeddingOptions,
} from "./privacy-aware-embedding";
