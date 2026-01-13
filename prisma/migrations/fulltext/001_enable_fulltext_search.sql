-- Full-Text Search Migration for MirrorBuddy Materials
-- Run AFTER standard Prisma migrations on PostgreSQL
-- Requires PostgreSQL 9.6+ with pg_trgm extension
--
-- Usage:
--   1. Ensure pg_trgm is installed: CREATE EXTENSION IF NOT EXISTS pg_trgm;
--   2. Run standard Prisma migrations: npx prisma migrate deploy
--   3. Run this script: psql -d your_db -f 001_enable_fulltext_search.sql

-- Enable pg_trgm extension for trigram matching (improves partial word search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add tsvector column for full-text search to Material table
-- This column will store pre-computed searchable text vectors
ALTER TABLE "Material"
ADD COLUMN IF NOT EXISTS "searchableTextVector" tsvector;

-- Create GIN index for fast full-text search
-- Using english text search configuration for stemming and stop words
-- GIN (Generalized Inverted Index) is optimized for tsvector searches
CREATE INDEX IF NOT EXISTS idx_material_searchable_text_vector_gin
ON "Material"
USING gin ("searchableTextVector");

-- Create GIN index with trigram ops for partial word matching
-- This enables fast LIKE '%pattern%' style searches
CREATE INDEX IF NOT EXISTS idx_material_searchable_text_trgm
ON "Material"
USING gin ("searchableText" gin_trgm_ops)
WHERE "searchableText" IS NOT NULL;

-- Create composite indexes for common filter patterns
CREATE INDEX IF NOT EXISTS idx_material_user_status_search
ON "Material" ("userId", "status")
WHERE "searchableTextVector" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_material_user_type_search
ON "Material" ("userId", "toolType")
WHERE "searchableTextVector" IS NOT NULL;

-- Function to update tsvector column from searchableText
-- Uses 'english' configuration for stemming (e.g., "running" -> "run")
CREATE OR REPLACE FUNCTION material_searchable_text_trigger()
RETURNS trigger AS $$
BEGIN
  IF NEW."searchableText" IS NOT NULL THEN
    NEW."searchableTextVector" := to_tsvector('english', NEW."searchableText");
  ELSE
    NEW."searchableTextVector" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update tsvector on INSERT/UPDATE
DROP TRIGGER IF EXISTS material_searchable_text_update ON "Material";
CREATE TRIGGER material_searchable_text_update
BEFORE INSERT OR UPDATE OF "searchableText"
ON "Material"
FOR EACH ROW
EXECUTE FUNCTION material_searchable_text_trigger();

-- Populate existing rows with tsvector data
UPDATE "Material"
SET "searchableTextVector" = to_tsvector('english', "searchableText")
WHERE "searchableText" IS NOT NULL
  AND "searchableTextVector" IS NULL;

-- Function for efficient full-text search with filtering
-- Returns materials ranked by search relevance
CREATE OR REPLACE FUNCTION search_materials(
  p_user_id TEXT,
  p_query TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_tool_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'active',
  p_collection_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  user_id TEXT,
  tool_id TEXT,
  tool_type TEXT,
  title TEXT,
  content TEXT,
  subject TEXT,
  preview TEXT,
  status TEXT,
  user_rating INTEGER,
  is_bookmarked BOOLEAN,
  view_count INTEGER,
  searchable_text TEXT,
  collection_id TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id::TEXT,
    m."userId"::TEXT,
    m."toolId"::TEXT,
    m."toolType"::TEXT,
    m.title::TEXT,
    m.content::TEXT,
    m.subject::TEXT,
    m.preview::TEXT,
    m.status::TEXT,
    m."userRating",
    m."isBookmarked",
    m."viewCount",
    m."searchableText"::TEXT,
    m."collectionId"::TEXT,
    m."createdAt",
    m."updatedAt",
    ts_rank(m."searchableTextVector", websearch_to_tsquery('english', p_query))::FLOAT AS rank
  FROM "Material" m
  WHERE m."userId" = p_user_id
    AND m.status = p_status
    AND (p_tool_type IS NULL OR m."toolType" = p_tool_type)
    AND (p_collection_id IS NULL OR m."collectionId" = p_collection_id)
    AND m."searchableTextVector" @@ websearch_to_tsquery('english', p_query)
  ORDER BY rank DESC, m."createdAt" DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission (adjust role name as needed)
-- GRANT EXECUTE ON FUNCTION search_materials TO your_app_role;

-- Verification queries
DO $$
DECLARE
  idx_count INTEGER;
  trgm_installed BOOLEAN;
  materials_with_vector INTEGER;
BEGIN
  -- Check pg_trgm extension
  SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') INTO trgm_installed;

  -- Count indexes created
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE tablename = 'Material'
    AND indexname LIKE 'idx_material_%';

  -- Count materials with tsvector
  SELECT COUNT(*) INTO materials_with_vector
  FROM "Material"
  WHERE "searchableTextVector" IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Full-Text Search Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'pg_trgm extension: %', CASE WHEN trgm_installed THEN 'installed' ELSE 'NOT installed' END;
  RAISE NOTICE 'Indexes created: %', idx_count;
  RAISE NOTICE 'Materials with search vectors: %', materials_with_vector;
  RAISE NOTICE 'Trigger: material_searchable_text_update created';
  RAISE NOTICE 'Function: search_materials() created';
  RAISE NOTICE '========================================';
END $$;
