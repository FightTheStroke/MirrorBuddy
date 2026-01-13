# ADR 0028: PostgreSQL with pgvector Migration

## Status
Accepted

## Date
2026-01-10

## Context

MirrorBuddy initially used SQLite for local development simplicity. However, Wave 4 introduced semantic search capabilities (RAG) requiring vector similarity search. SQLite has limited vector search support and no native embedding type.

Requirements driving this decision:
1. **Semantic search**: Find similar materials by meaning, not just keywords
2. **RAG integration**: Retrieve relevant context for AI conversations
3. **Knowledge graph**: Store relationships between materials and concepts
4. **Production parity**: Same database in dev and production

## Decision

**Migrate from SQLite to PostgreSQL with pgvector extension.**

### Database Configuration

```
# .env
DATABASE_URL=postgresql://user@localhost:5432/mirrorbuddy
```

### Prisma Schema Changes

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
  engineType      = "binary"
}

datasource db {
  provider   = "postgresql"
  extensions = [pgvector(map: "vector")]
}
```

### Vector Storage

The `ContentEmbedding` model stores embeddings with dual-column approach:

```prisma
model ContentEmbedding {
  id           String   @id @default(cuid())
  userId       String
  sourceType   String   // "material" | "flashcard" | "studykit" | "message"
  sourceId     String
  chunkIndex   Int      @default(0)
  content      String   // Original text

  // Dual storage for migration flexibility
  vector       String?                          // Legacy: JSON array
  vectorNative Unsupported("vector(1536)")?     // Native pgvector

  model        String   @default("text-embedding-3-small")
  dimensions   Int      @default(1536)
  // ...
}
```

### Similarity Search

Using pgvector's cosine distance operator:

```sql
SELECT *, 1 - (vector <=> $1) as similarity
FROM "ContentEmbedding"
WHERE "userId" = $2
ORDER BY vector <=> $1
LIMIT 10;
```

### Knowledge Graph Models

New models for material relationships:

```prisma
model MaterialEdge {
  id           String   @id
  fromId       String
  toId         String
  relationType String   // "derived_from" | "related_to" | "prerequisite"
  weight       Float    @default(1.0)
}

model Concept {
  id          String   @id
  userId      String
  name        String
  subject     String?
}

model MaterialConcept {
  materialId String
  conceptId  String
  relevance  Float    @default(1.0)
}
```

## Local Setup

```bash
# Install PostgreSQL (macOS)
brew install postgresql@17
brew services start postgresql@17

# Create database with pgvector
createdb mirrorbuddy
psql -d mirrorbuddy -c "CREATE EXTENSION vector;"

# Run migrations
npx prisma migrate deploy
```

## Consequences

### Positive
- **Native vector search**: pgvector provides efficient similarity search with IVFFlat indexes
- **Scalability**: PostgreSQL handles larger datasets than SQLite
- **Production ready**: Same stack in dev/staging/production
- **Rich queries**: Full SQL capabilities for complex knowledge graph traversal
- **Ecosystem**: Well-supported by Prisma, Vercel, Supabase, etc.

### Negative
- **Local setup**: Developers need PostgreSQL installed (vs zero-config SQLite)
- **Resource usage**: PostgreSQL uses more memory than SQLite
- **Complexity**: Additional extension management (pgvector)

### Mitigations
- Clear setup instructions in `.env.example` and README
- Docker Compose option for developers who prefer containers
- Prisma handles most PostgreSQL complexity

## Files Changed

- `prisma/schema.prisma` - PostgreSQL provider, pgvector extension
- `prisma/migrations/20260110181126_init/` - Initial PostgreSQL migration
- `prisma.config.ts` - PostgreSQL connection configuration
- `src/lib/db.ts` - PrismaPg adapter
- `.env.example` - PostgreSQL connection string template
- `.env` - Local PostgreSQL connection

## References

- [pgvector](https://github.com/pgvector/pgvector) - Vector similarity search for PostgreSQL
- [Prisma PostgreSQL Extensions](https://www.prisma.io/docs/concepts/components/prisma-schema/postgresql-extensions)
- ADR 0015: Database-First Architecture
- ADR 0033: RAG Semantic Search Architecture (embedding service, retrieval API)
- Wave 4: Knowledge Graph implementation
