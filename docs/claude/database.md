# Database

> PostgreSQL 17 + pgvector extension via Prisma ORM

## Quick Reference

| Key        | Value                                       |
| ---------- | ------------------------------------------- |
| Database   | PostgreSQL 17 + pgvector                    |
| ORM        | Prisma (client v5+)                         |
| Schema     | Split: `prisma/schema/*.prisma` (19 files)  |
| Connection | `src/lib/db.ts` (PrismaPg adapter)          |
| ADRs       | 0028 (PostgreSQL), 0015 (State), 0033 (RAG) |

## Architecture

Migrated from SQLite to PostgreSQL (ADR 0028) for semantic search via pgvector.

- **Vector storage**: 1536-dimensional embeddings for RAG
- **Cosine similarity**: `vector <=> $1` operator
- **Connection pooling**: Optimized for Vercel serverless (5 max, 0 idle)
- **SSL**: Supabase certificate chain with TLS (ADR 0067)

## Schema Organization (19 Files)

| Domain         | Files                                         |
| -------------- | --------------------------------------------- |
| Core           | `user`, `conversations`, `content`, `locale`  |
| Education      | `education`, `learning-path`, `insights`      |
| AI/RAG         | `rag` (ContentEmbedding with vector storage)  |
| Gamification   | `gamification` (XP, levels, badges, streaks)  |
| Tiers/Trial    | `tier`, `trial`, `invite`                     |
| Analytics      | `analytics` (SessionMetrics, UserActivity)    |
| Compliance     | `privacy`, `compliance`, `scheduling`         |
| Infrastructure | `vault` (AES-256-GCM tokens), `b2b`, `schema` |

## Vector Search (pgvector)

```sql
SELECT *, 1 - (vector <=> $1) as similarity
FROM "ContentEmbedding"
WHERE "userId" = $2
ORDER BY vector <=> $1
LIMIT 10;
```

**Embedding Model**: Azure OpenAI `text-embedding-3-small` (1536 dimensions)

## Code Patterns

### Query Database

```typescript
import { prisma } from "@/lib/db";

const user = await prisma.user.findUnique({ where: { id: userId } });

// Semantic search
const results = await prisma.$queryRaw`
  SELECT *, 1 - (vector <=> ${embedding}) as similarity
  FROM "ContentEmbedding"
  WHERE "userId" = ${userId}
  ORDER BY vector <=> ${embedding}
  LIMIT 3
`;
```

### Migrations

```bash
npx prisma migrate dev --name add_new_field  # Local only
./scripts/sync-databases.sh                   # Sync test DB after
npx prisma generate                           # After schema changes
```

## SSL Configuration (ADR 0067)

- **Production**: Supabase certificate chain (`config/supabase-chain.pem`)
- **Fallback**: `SUPABASE_CA_CERT` env var (pipe-separated)
- **Local/E2E**: No SSL required

## See Also

- `docs/adr/0028-postgresql-pgvector-migration.md` — Migration rationale
- `docs/adr/0033-rag-semantic-search.md` — RAG architecture
- `docs/setup/database.md` — Setup guide
