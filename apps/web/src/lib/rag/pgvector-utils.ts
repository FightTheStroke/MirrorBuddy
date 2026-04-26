/**
 * pgvector Utilities for RAG System
 * Provides PostgreSQL native vector search when available.
 *
 * SQLite Mode: Falls back to JSON vectors + JavaScript cosine similarity
 * PostgreSQL Mode: Uses native pgvector extension for optimized search
 *
 * @module rag/pgvector-utils
 */

import { logger } from '@/lib/logger';

/**
 * Check if the database is PostgreSQL (supports pgvector)
 */
export function isPostgresDatabase(): boolean {
  const dbUrl = process.env.DATABASE_URL || '';
  return dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');
}

/**
 * pgvector extension status
 */
export interface PgvectorStatus {
  available: boolean;
  version: string | null;
  indexType: 'ivfflat' | 'hnsw' | null;
  error: string | null;
}

/**
 * Check if pgvector extension is available
 * Returns cached result after first check
 */
let pgvectorStatusCache: PgvectorStatus | null = null;

/** Interface for query results */
interface ExtVersionResult {
  extversion: string;
}

interface IndexNameResult {
  indexname: string;
}

/** Prisma client interface for raw queries */
export interface PrismaQueryClient {
  $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
}

export async function checkPgvectorStatus(prisma: PrismaQueryClient): Promise<PgvectorStatus> {
  if (pgvectorStatusCache) {
    return pgvectorStatusCache;
  }

  if (!isPostgresDatabase()) {
    pgvectorStatusCache = {
      available: false,
      version: null,
      indexType: null,
      error: 'Not using PostgreSQL database',
    };
    return pgvectorStatusCache;
  }

  try {
    // Check if vector extension is installed
    const result = (await prisma.$queryRaw`
      SELECT extversion FROM pg_extension WHERE extname = 'vector'
    `) as ExtVersionResult[];

    if (result.length === 0) {
      pgvectorStatusCache = {
        available: false,
        version: null,
        indexType: null,
        error: 'pgvector extension not installed',
      };
      return pgvectorStatusCache;
    }

    // Check which index type is in use
    const indexResult = (await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'ContentEmbedding'
      AND indexname LIKE '%vector%'
    `) as IndexNameResult[];

    let indexType: 'ivfflat' | 'hnsw' | null = null;
    for (const idx of indexResult) {
      if (idx.indexname.includes('ivfflat')) indexType = 'ivfflat';
      if (idx.indexname.includes('hnsw')) indexType = 'hnsw';
    }

    pgvectorStatusCache = {
      available: true,
      version: result[0].extversion,
      indexType,
      error: null,
    };

    logger.info('[pgvector] Extension available', {
      available: pgvectorStatusCache.available,
      version: pgvectorStatusCache.version,
      indexType: pgvectorStatusCache.indexType,
    });
    return pgvectorStatusCache;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    pgvectorStatusCache = {
      available: false,
      version: null,
      indexType: null,
      error: errorMessage,
    };
    logger.warn('[pgvector] Extension check failed', { error: errorMessage });
    return pgvectorStatusCache;
  }
}

/**
 * Clear pgvector status cache (useful for testing)
 */
export function clearPgvectorStatusCache(): void {
  pgvectorStatusCache = null;
}

/**
 * Format vector for pgvector SQL query
 * Converts number array to pgvector literal format: '[0.1,0.2,0.3]'
 */
export function formatVectorForPg(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

/**
 * Search options for native pgvector query
 */
export interface NativeSearchOptions {
  userId: string;
  vector: number[];
  limit?: number;
  minSimilarity?: number;
  sourceType?: string;
  subject?: string;
}

/**
 * Search result from native pgvector query
 */
export interface NativeSearchResult {
  id: string;
  source_type: string;
  source_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
  subject: string | null;
  tags: string;
}

/**
 * Perform native pgvector similarity search using the SQL function
 * Only works when pgvector is available
 */
export async function nativeVectorSearch(
  prisma: PrismaQueryClient,
  options: NativeSearchOptions
): Promise<NativeSearchResult[]> {
  const status = await checkPgvectorStatus(prisma);
  if (!status.available) {
    throw new Error(`pgvector not available: ${status.error}`);
  }

  const {
    userId,
    vector,
    limit = 10,
    minSimilarity = 0.5,
    sourceType = null,
    subject = null,
  } = options;

  const vectorStr = formatVectorForPg(vector);

  const results = (await prisma.$queryRaw`
    SELECT * FROM search_similar_embeddings(
      ${userId}::TEXT,
      ${vectorStr}::vector(1536),
      ${limit}::INTEGER,
      ${minSimilarity}::FLOAT,
      ${sourceType}::TEXT,
      ${subject}::TEXT
    )
  `) as NativeSearchResult[];

  logger.debug('[pgvector] Native search completed', {
    resultCount: results.length,
    limit,
    minSimilarity,
  });

  return results;
}

/** Prisma client interface for execute raw */
export interface PrismaExecuteClient {
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
}

/**
 * Store embedding with native vector column (PostgreSQL only)
 * Updates the vectorNative column alongside JSON vector
 */
export async function updateNativeVector(
  prisma: PrismaExecuteClient & PrismaQueryClient,
  embeddingId: string,
  vector: number[]
): Promise<void> {
  const status = await checkPgvectorStatus(prisma);
  if (!status.available) {
    return; // Silently skip for non-PostgreSQL databases
  }

  const vectorStr = formatVectorForPg(vector);

  await prisma.$executeRaw`
    UPDATE "ContentEmbedding"
    SET "vectorNative" = ${vectorStr}::vector(1536)
    WHERE id = ${embeddingId}
  `;

  logger.debug('[pgvector] Native vector updated', { embeddingId });
}
