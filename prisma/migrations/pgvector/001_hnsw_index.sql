-- Migration: Add HNSW index and search function for pgvector
-- This migration enables O(log n) vector similarity search
--
-- HNSW (Hierarchical Navigable Small World) provides:
-- - O(log n) query complexity vs O(n) for brute force
-- - Better recall than IVFFlat for moderate-sized datasets
-- - No training required (unlike IVFFlat)
--
-- Run manually: psql -d mirrorbuddy -f prisma/migrations/pgvector/001_hnsw_index.sql

-- Ensure vector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create HNSW index for cosine similarity
-- m=16: number of bi-directional links (default, good for 1536 dimensions)
-- ef_construction=64: size of dynamic candidate list (higher = better recall, slower build)
CREATE INDEX IF NOT EXISTS "ContentEmbedding_vectorNative_hnsw_idx"
ON "ContentEmbedding"
USING hnsw ("vectorNative" vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create index on userId for filtered queries
CREATE INDEX IF NOT EXISTS "ContentEmbedding_userId_idx"
ON "ContentEmbedding" ("userId");

-- Create composite index for common filter + vector search
CREATE INDEX IF NOT EXISTS "ContentEmbedding_userId_sourceType_idx"
ON "ContentEmbedding" ("userId", "sourceType");

-- SQL function for native vector search with cosine similarity
-- Returns results sorted by similarity (descending)
CREATE OR REPLACE FUNCTION search_similar_embeddings(
  p_user_id TEXT,
  p_vector vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_min_similarity FLOAT DEFAULT 0.5,
  p_source_type TEXT DEFAULT NULL,
  p_subject TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  source_type TEXT,
  source_id TEXT,
  chunk_index INTEGER,
  content TEXT,
  similarity FLOAT,
  subject TEXT,
  tags TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce."sourceType" AS source_type,
    ce."sourceId" AS source_id,
    ce."chunkIndex" AS chunk_index,
    ce.content,
    (1 - (ce."vectorNative" <=> p_vector))::FLOAT AS similarity,
    ce.subject,
    ce.tags
  FROM "ContentEmbedding" ce
  WHERE
    ce."userId" = p_user_id
    AND ce."vectorNative" IS NOT NULL
    AND (p_source_type IS NULL OR ce."sourceType" = p_source_type)
    AND (p_subject IS NULL OR ce.subject = p_subject)
    AND (1 - (ce."vectorNative" <=> p_vector)) >= p_min_similarity
  ORDER BY ce."vectorNative" <=> p_vector
  LIMIT p_limit;
END;
$$;

-- Grant execute permission (adjust role as needed)
-- GRANT EXECUTE ON FUNCTION search_similar_embeddings TO your_app_role;

-- Verify index was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'ContentEmbedding_vectorNative_hnsw_idx'
  ) THEN
    RAISE EXCEPTION 'HNSW index was not created successfully';
  END IF;
  RAISE NOTICE 'HNSW index created successfully';
END $$;
