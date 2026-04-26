/**
 * RAG (Retrieval-Augmented Generation) Module - CLIENT-SAFE
 * @module rag
 *
 * This barrel only exports client-safe symbols (no DB dependencies).
 * For server-only symbols (vector-store, retrieval-service, etc.),
 * import from "@/lib/rag/server".
 */

// Client-safe: Pure text processing, no DB
export {
  chunkText,
  chunkByParagraphs,
  chunkBySentences,
  estimateTokens,
  type TextChunk,
  type ChunkOptions,
} from "./semantic-chunker";

// Client-safe: Embedding service (API calls, no DB)
export {
  generateEmbedding,
  generateEmbeddings,
  isEmbeddingConfigured,
  getEmbeddingDimensions,
  cosineSimilarity,
  type EmbeddingResult,
} from "./embedding-service";

// Client-safe: Reranker for improved retrieval precision (no DB)
export {
  rerank,
  type RerankerDocument,
  type RerankedDocument,
  type RerankerOptions,
  type RerankerSignals,
} from "./reranker";
