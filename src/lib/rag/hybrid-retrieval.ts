/**
 * Hybrid Retrieval Service
 * Combines semantic (vector) and keyword search for improved retrieval accuracy.
 *
 * @module rag/hybrid-retrieval
 */

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";
import { generateEmbedding } from "./embedding-service";
import { searchSimilar, type VectorSearchResult } from "./vector-store";
import { cosineSimilarity } from "./embedding-service";
import { rerank } from "./reranker";
import type {
  HybridRetrievalResult,
  HybridSearchOptions,
  KeywordSearchOptions,
  KeywordMatch,
} from "./hybrid-types";

// Re-export types
export type {
  HybridRetrievalResult,
  HybridSearchOptions,
} from "./hybrid-types";

/**
 * Extract keywords from query for keyword search
 * Removes common stop words and normalizes text
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
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
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "che",
    "e",
    "non",
    "come",
    "cosa",
    "dove",
    "quando",
    "perché",
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

/**
 * Perform keyword-based search on content embeddings
 */
async function keywordSearch(
  options: KeywordSearchOptions,
): Promise<KeywordMatch[]> {
  const { userId, keywords, limit, sourceType, subject } = options;

  if (keywords.length === 0) {
    return [];
  }

  // Build WHERE conditions with PostgreSQL $n placeholders
  const params: (string | number)[] = [userId];
  let paramIndex = 1;
  const conditions: string[] = [`"userId" = $${paramIndex++}`];

  if (sourceType) {
    conditions.push(`"sourceType" = $${paramIndex++}`);
    params.push(sourceType);
  }

  if (subject) {
    conditions.push(`subject = $${paramIndex++}`);
    params.push(subject);
  }

  // Build keyword ILIKE conditions (OR) - PostgreSQL uses ILIKE for case-insensitive
  const keywordConditions = keywords.map(
    () => `content ILIKE $${paramIndex++}`,
  );
  conditions.push(`(${keywordConditions.join(" OR ")})`);
  keywords.forEach((kw) => params.push(`%${kw}%`));

  // Add limit parameter
  params.push(limit * 2);
  const limitParam = paramIndex;

  const whereClause = conditions.join(" AND ");

  // Query using raw SQL for PostgreSQL
  type RawEmbedding = {
    id: string;
    sourceType: string;
    sourceId: string;
    chunkIndex: number;
    content: string;
    subject: string | null;
    tags: string | null;
  };

  const results = (await prisma.$queryRawUnsafe(
    `SELECT id, "sourceType", "sourceId", "chunkIndex", content, subject, tags
     FROM "ContentEmbedding"
     WHERE ${whereClause}
     LIMIT $${limitParam}`,
    ...params,
  )) as RawEmbedding[];

  // Calculate match count for each result
  return results.map((row) => {
    const contentLower = row.content.toLowerCase();
    const matchCount = keywords.reduce((count, kw) => {
      const regex = new RegExp(kw, "gi");
      const matches = contentLower.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);

    return {
      id: row.id,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      chunkIndex: row.chunkIndex,
      content: row.content,
      matchCount,
      subject: row.subject,
      tags: row.tags ? JSON.parse(row.tags) : [],
    };
  });
}

/**
 * Perform hybrid search combining semantic and keyword approaches
 * Uses Reciprocal Rank Fusion (RRF) for score combination
 */
export async function hybridSearch(
  options: HybridSearchOptions,
): Promise<HybridRetrievalResult[]> {
  const {
    userId,
    query,
    limit = 10,
    minScore = 0.3,
    sourceType,
    subject,
    semanticWeight = 0.7,
    excludeSourceIds = [],
  } = options;

  logger.debug("[HybridRetrieval] Starting hybrid search", {
    userId,
    queryLength: query.length,
    limit,
    semanticWeight,
    sourceType,
  });

  // Extract keywords for keyword search
  const keywords = extractKeywords(query);

  // Run semantic and keyword searches in parallel
  const [semanticResults, keywordResults] = await Promise.all([
    // Semantic search
    (async () => {
      const embeddingResult = await generateEmbedding(query);
      return searchSimilar({
        userId,
        vector: embeddingResult.vector,
        limit: limit * 2, // Fetch more for merging
        minSimilarity: minScore * semanticWeight,
        sourceType,
        subject,
      });
    })(),
    // Keyword search
    keywordSearch({
      userId,
      keywords,
      limit: limit * 2,
      sourceType,
      subject,
    }),
  ]);

  // Create maps for efficient lookup
  const semanticMap = new Map<string, VectorSearchResult>();
  semanticResults.forEach((r) => semanticMap.set(r.id, r));

  const keywordMap = new Map<string, KeywordMatch>();
  keywordResults.forEach((r) => keywordMap.set(r.id, r));

  // Normalize keyword scores (0-1)
  const maxMatchCount = Math.max(...keywordResults.map((r) => r.matchCount), 1);

  // Collect all unique IDs
  const allIds = new Set([...semanticMap.keys(), ...keywordMap.keys()]);

  // Calculate combined scores
  const combinedResults: HybridRetrievalResult[] = [];

  for (const id of allIds) {
    const semantic = semanticMap.get(id);
    const keyword = keywordMap.get(id);

    // Get scores (0 if not in that result set)
    const semanticScore = semantic?.similarity ?? 0;
    const keywordScore = keyword ? keyword.matchCount / maxMatchCount : 0;

    // Weighted combination
    const combinedScore =
      semanticWeight * semanticScore + (1 - semanticWeight) * keywordScore;

    // Skip if below threshold
    if (combinedScore < minScore) continue;

    // Get base data from whichever result we have
    const base = semantic ?? keyword!;

    // Skip excluded source IDs
    if (excludeSourceIds.includes(base.sourceId)) continue;

    combinedResults.push({
      id: base.id,
      sourceType: base.sourceType,
      sourceId: base.sourceId,
      chunkIndex: base.chunkIndex,
      content: base.content,
      combinedScore,
      semanticScore,
      keywordScore,
      subject: base.subject,
      tags: base.tags,
    });
  }

  // Sort by combined score and limit
  combinedResults.sort((a, b) => b.combinedScore - a.combinedScore);
  let limited = combinedResults.slice(0, limit);

  // Apply reranking if enabled (P2 quality improvement)
  if (options.enableReranking && limited.length > 0) {
    logger.debug("[HybridRetrieval] Applying reranker", {
      candidateCount: limited.length,
    });

    const reranked = rerank(
      query,
      limited.map((doc) => ({
        id: doc.id,
        content: doc.content,
        originalScore: doc.combinedScore,
        metadata: { sourceType: doc.sourceType, sourceId: doc.sourceId },
      })),
      { topK: limit },
    );

    // Merge reranked scores back
    const rerankedMap = new Map(reranked.map((r) => [r.id, r.rerankedScore]));
    limited = limited
      .map((doc) => ({
        ...doc,
        rerankedScore: rerankedMap.get(doc.id),
      }))
      .filter((doc) => doc.rerankedScore !== undefined)
      .sort((a, b) => (b.rerankedScore ?? 0) - (a.rerankedScore ?? 0));
  }

  logger.debug("[HybridRetrieval] Search complete", {
    semanticResultCount: semanticResults.length,
    keywordResultCount: keywordResults.length,
    combinedResultCount: limited.length,
    reranked: options.enableReranking ?? false,
  });

  return limited;
}

/**
 * Calculate similarity between two texts using embeddings
 * Useful for comparing specific content pieces
 */
export async function textSimilarity(
  text1: string,
  text2: string,
): Promise<number> {
  const [embedding1, embedding2] = await Promise.all([
    generateEmbedding(text1),
    generateEmbedding(text2),
  ]);

  return cosineSimilarity(embedding1.vector, embedding2.vector);
}
