# RAG System

Retrieval-Augmented Generation for AI conversations. See ADR 0033.

## Architecture

```
User Message → /api/chat → RAG Retrieval → Enhanced Prompt → Azure OpenAI
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
              Embedding Service    Vector Store
              (Azure OpenAI)       (pgvector)
```

## Components

| File | Purpose |
|------|---------|
| `src/lib/rag/embedding-service.ts` | Azure OpenAI embedding generation |
| `src/lib/rag/retrieval-service.ts` | High-level semantic search API |
| `src/lib/rag/vector-store.ts` | pgvector storage operations |
| `src/lib/rag/semantic-chunker.ts` | Content chunking for embeddings |
| `src/lib/rag/hybrid-retrieval.ts` | Combined keyword + semantic search |

## Environment Variables

```bash
# Required for RAG
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
```

## Usage

### Check if configured

```typescript
import { isEmbeddingConfigured } from '@/lib/rag/embedding-service';

if (isEmbeddingConfigured()) {
  // RAG available
}
```

### Find similar materials

```typescript
import { findSimilarMaterials } from '@/lib/rag/retrieval-service';

const materials = await findSimilarMaterials({
  userId: 'user-id',
  query: 'What is photosynthesis?',
  limit: 3,
  minSimilarity: 0.6,
});
```

### Index new content

```typescript
import { indexMaterial } from '@/lib/rag/retrieval-service';

await indexMaterial({
  userId: 'user-id',
  sourceType: 'material',
  sourceId: 'material-id',
  content: 'Photosynthesis is the process...',
  subject: 'biology',
});
```

## Graceful Degradation

RAG is optional. When not configured:
- `isEmbeddingConfigured()` returns `false`
- `findSimilarMaterials()` returns empty array
- No errors thrown, chat works without context injection

## Chat Integration

In `/api/chat/route.ts`:

```typescript
const relevantMaterials = await findSimilarMaterials({
  userId,
  query: lastUserMessage.content,
  limit: 3,
  minSimilarity: 0.6,
});

if (relevantMaterials.length > 0) {
  const ragContext = relevantMaterials
    .map((m) => `- ${m.content}`)
    .join('\n');
  enhancedSystemPrompt += `\n\n[Materiali rilevanti]\n${ragContext}`;
}
```

## Cost

- Embedding: ~$0.0001 per 1K tokens (text-embedding-ada-002)
- Storage: ~6KB per chunk (1536 floats)
- Latency: ~100-200ms per query

## References

- ADR 0028: PostgreSQL with pgvector
- ADR 0033: RAG Semantic Search Architecture
- `prisma/schema.prisma` - ContentEmbedding model
