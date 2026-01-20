# Database

PostgreSQL with pgvector at `prisma/schema.prisma`. See ADR 0028 for migration details.

## Setup

```bash
# macOS
brew install postgresql@17
brew services start postgresql@17
createdb mirrorbuddy
psql -d mirrorbuddy -c "CREATE EXTENSION vector;"

# .env
DATABASE_URL=postgresql://user@localhost:5432/mirrorbuddy
```

## Key Models

| Model                       | Purpose                              |
| --------------------------- | ------------------------------------ |
| **User**                    | Profile, Settings, Progress (1:1)    |
| **StudySession**            | Learning sessions with XP            |
| **FlashcardProgress**       | FSRS spaced repetition state         |
| **Conversation** → Messages | Chat history per maestro             |
| **ContentEmbedding**        | Vector embeddings for RAG (pgvector) |
| **MaterialEdge**            | Knowledge graph relationships        |
| **Concept**                 | Extracted concepts from materials    |

## Vector Storage (pgvector)

```prisma
model ContentEmbedding {
  id           String   @id @default(cuid())
  userId       String
  sourceType   String   // "material" | "flashcard" | "message"
  sourceId     String
  content      String
  vectorNative Unsupported("vector(1536)")?  // pgvector native
  model        String   @default("text-embedding-3-small")
  dimensions   Int      @default(1536)
}
```

Similarity search:

```sql
SELECT *, 1 - (vector <=> $1) as similarity
FROM "ContentEmbedding"
WHERE "userId" = $2
ORDER BY vector <=> $1
LIMIT 10;
```

## Data Persistence

| Data Type     | Storage                         |
| ------------- | ------------------------------- |
| User settings | `/api/user/settings`            |
| Progress      | `/api/progress`                 |
| Materials     | `/api/materials`                |
| Conversations | `/api/conversations`            |
| Embeddings    | `/api/materials` (auto-indexed) |
| Session ID    | `sessionStorage`                |
| Device cache  | `localStorage` (OK)             |

## Commands

```bash
npx prisma generate       # Generate client (after schema changes)
npx prisma migrate dev    # Create + apply migration (LOCAL ONLY)
npx prisma migrate deploy # Apply migrations (CI/Production)
npx prisma studio         # GUI browser
```

**CRITICAL**: Never use `db push` on tracked databases. See ADR 0052.

## References

- ADR 0028: PostgreSQL with pgvector Migration
- ADR 0033: RAG Semantic Search Architecture
- `src/lib/rag/` - RAG implementation
