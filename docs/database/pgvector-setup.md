# pgvector Setup for MirrorBuddy

MirrorBuddy uses pgvector for semantic search in the RAG system.

## Requirements

- PostgreSQL 15+ with pgvector extension
- `vector` extension installed

## Installation

### macOS (Homebrew)

```bash
# Install PostgreSQL with pgvector
brew install postgresql@17
brew services start postgresql@17

# Create database
createdb mirrorbuddy

# Enable vector extension
psql -d mirrorbuddy -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Docker

```bash
# Use pgvector-enabled image
docker run -d \
  --name mirrorbuddy-db \
  -e POSTGRES_DB=mirrorbuddy \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  pgvector/pgvector:pg17
```

## HNSW Index Setup

After running Prisma migrations, apply the HNSW index:

```bash
psql -d mirrorbuddy -f prisma/migrations/pgvector/001_hnsw_index.sql
```

This creates:
- HNSW index on `vectorNative` column for O(log n) similarity search
- SQL function `search_similar_embeddings()` for native queries
- Supporting indexes for filtered queries

## Verification

```bash
# Check pgvector is installed
psql -d mirrorbuddy -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';"

# Check HNSW index exists
psql -d mirrorbuddy -c "SELECT indexname FROM pg_indexes WHERE indexname LIKE '%hnsw%';"

# Test search function
psql -d mirrorbuddy -c "SELECT proname FROM pg_proc WHERE proname = 'search_similar_embeddings';"
```

## Performance

| Method | Complexity | Use Case |
|--------|------------|----------|
| HNSW index | O(log n) | Production with >1000 embeddings |
| JavaScript fallback | O(n) | Development/testing |

## Configuration

The RAG system automatically detects pgvector availability:

```typescript
// Automatically uses native search when available
const results = await searchSimilar({
  userId: 'user-123',
  vector: queryEmbedding,
  limit: 10,
});
```

## Troubleshooting

### Extension not found

```bash
# Install pgvector from source if not available
git clone --branch v0.7.0 https://github.com/pgvector/pgvector.git
cd pgvector
make && sudo make install
psql -d mirrorbuddy -c "CREATE EXTENSION vector;"
```

### Index not being used

Check that `vectorNative` column has data:

```sql
SELECT COUNT(*) FROM "ContentEmbedding" WHERE "vectorNative" IS NOT NULL;
```

If 0, run the backfill:

```sql
UPDATE "ContentEmbedding"
SET "vectorNative" = vector::vector(1536)
WHERE "vectorNative" IS NULL AND vector IS NOT NULL;
```
