-- pgvector Migration for ConvergioEdu RAG System
-- Run AFTER standard Prisma migrations on PostgreSQL
-- Requires PostgreSQL 12+ with pgvector extension
--
-- Usage:
--   1. Ensure pgvector is installed: CREATE EXTENSION IF NOT EXISTS vector;
--   2. Run standard Prisma migrations: npx prisma migrate deploy
--   3. Run this script: psql -d your_db -f 001_enable_pgvector.sql

-- Enable pgvector extension (requires superuser or extension install rights)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add native vector column (1536 dimensions for text-embedding-3-small)
-- This is stored alongside the JSON vector for backwards compatibility
ALTER TABLE "ContentEmbedding"
ADD COLUMN IF NOT EXISTS "vectorNative" vector(1536);

-- Migrate existing JSON vectors to native format
UPDATE "ContentEmbedding"
SET "vectorNative" = vector::vector(1536)
WHERE "vectorNative" IS NULL
  AND vector IS NOT NULL
  AND vector != '';

-- Create IVFFlat index for fast similarity search
-- lists = sqrt(n_vectors) is a good starting point
-- Tune based on dataset size: more lists = faster search, more memory
CREATE INDEX IF NOT EXISTS idx_content_embedding_vector_ivfflat
ON "ContentEmbedding"
USING ivfflat ("vectorNative" vector_cosine_ops)
WITH (lists = 100);

-- Alternative: HNSW index (better recall, more memory)
-- Uncomment if you prefer HNSW over IVFFlat
-- CREATE INDEX IF NOT EXISTS idx_content_embedding_vector_hnsw
-- ON "ContentEmbedding"
-- USING hnsw ("vectorNative" vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);

-- Create composite index for common filter patterns
CREATE INDEX IF NOT EXISTS idx_content_embedding_user_source
ON "ContentEmbedding" ("userId", "sourceType");

CREATE INDEX IF NOT EXISTS idx_content_embedding_user_subject
ON "ContentEmbedding" ("userId", "subject")
WHERE subject IS NOT NULL;

-- Function for efficient similarity search with filtering
CREATE OR REPLACE FUNCTION search_similar_embeddings(
  p_user_id TEXT,
  p_query_vector vector(1536),
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
    ce.id::TEXT,
    ce."sourceType"::TEXT,
    ce."sourceId"::TEXT,
    ce."chunkIndex",
    ce.content::TEXT,
    (1 - (ce."vectorNative" <=> p_query_vector))::FLOAT AS similarity,
    ce.subject::TEXT,
    ce.tags::TEXT
  FROM "ContentEmbedding" ce
  WHERE ce."userId" = p_user_id
    AND (p_source_type IS NULL OR ce."sourceType" = p_source_type)
    AND (p_subject IS NULL OR ce.subject = p_subject)
    AND ce."vectorNative" IS NOT NULL
    AND (1 - (ce."vectorNative" <=> p_query_vector)) >= p_min_similarity
  ORDER BY ce."vectorNative" <=> p_query_vector
  LIMIT p_limit;
END;
$$;

-- Grant execute permission (adjust role name as needed)
-- GRANT EXECUTE ON FUNCTION search_similar_embeddings TO your_app_role;

-- Verification query
DO $$
BEGIN
  RAISE NOTICE 'pgvector migration completed successfully';
  RAISE NOTICE 'Extension version: %', (SELECT extversion FROM pg_extension WHERE extname = 'vector');
  RAISE NOTICE 'Vector columns ready for ContentEmbedding table';
END $$;
