-- Filter the vector search by sourceId inside the query.
--
-- Without it, a caller that wants one source's chunks has to ask for the global
-- top-N and discard the rest, so its own material must outrank every other
-- source before it can be read at all. Measured against production on 20 Aug
-- 2026, the Maestro retriever recovered 69 chunks where 83 were available and
-- lost content for 11 of 32 Maestri (finding G-11).
--
-- The parameter is added rather than replaced: CREATE OR REPLACE cannot change
-- a function's argument list, it would register an overload and leave the old
-- six-argument body callable. Dropping the old signature explicitly keeps one
-- definition. The new argument defaults to NULL, so existing six-argument call
-- sites keep their current behaviour.
DROP FUNCTION IF EXISTS search_similar_embeddings(TEXT, vector(1536), INTEGER, FLOAT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION search_similar_embeddings(
  p_user_id TEXT,
  p_vector vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_min_similarity FLOAT DEFAULT 0.5,
  p_source_type TEXT DEFAULT NULL,
  p_subject TEXT DEFAULT NULL,
  p_source_id TEXT DEFAULT NULL
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
    AND (p_source_id IS NULL OR ce."sourceId" = p_source_id)
    AND (p_subject IS NULL OR ce.subject = p_subject)
    AND (1 - (ce."vectorNative" <=> p_vector)) >= p_min_similarity
  ORDER BY ce."vectorNative" <=> p_vector
  LIMIT p_limit;
END;
$$;

-- Index the filter, so restricting to one source does not degrade into a scan
-- of every row belonging to the user.
CREATE INDEX IF NOT EXISTS "ContentEmbedding_userId_sourceType_sourceId_idx"
ON "ContentEmbedding" ("userId", "sourceType", "sourceId");
