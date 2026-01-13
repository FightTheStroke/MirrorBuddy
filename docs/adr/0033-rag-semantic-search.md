# ADR 0033: RAG Semantic Search Architecture

## Status
Accepted

## Date
2026-01-11

## Context

MirrorBuddy needs to retrieve relevant context from user materials during AI conversations. Simple keyword search is insufficient for educational content where concepts can be expressed in many ways.

Requirements:
1. **Semantic similarity**: Find related materials by meaning, not just keywords
2. **Context injection**: Provide relevant user materials to AI conversations
3. **Graceful degradation**: System works without embeddings (just no RAG)
4. **Cost efficiency**: Embedding generation is cheap but should be cached

## Decision

**Implement RAG (Retrieval-Augmented Generation) using Azure OpenAI embeddings and pgvector.**

### Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   User      │────▶│  Chat API        │────▶│   Azure     │
│   Message   │     │  /api/chat       │     │   OpenAI    │
└─────────────┘     └────────┬─────────┘     └─────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ RAG Retrieval  │
                    │ Service        │
                    └────────┬───────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌────────────┐ ┌────────────┐ ┌────────────┐
       │ Embedding  │ │  Vector    │ │  Content   │
       │ Service    │ │  Store     │ │  Chunker   │
       │ (Azure)    │ │  (pgvector)│ │            │
       └────────────┘ └────────────┘ └────────────┘
```

### Components

#### 1. Embedding Service (`src/lib/rag/embedding-service.ts`)

Generates text embeddings using Azure OpenAI:

```typescript
// Check if service is configured
export function isEmbeddingConfigured(): boolean {
  return !!(
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
  );
}

// Generate embedding vector (1536 dimensions)
export async function generateEmbedding(text: string): Promise<EmbeddingResult>;
```

**Environment Variables:**
```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
```

**Azure Deployment:**
```bash
az cognitiveservices account deployment create \
  --name your-resource --resource-group your-rg \
  --deployment-name text-embedding-ada-002 \
  --model-name text-embedding-ada-002 \
  --model-version 2 --model-format OpenAI \
  --sku-capacity 10 --sku-name Standard
```

#### 2. Retrieval Service (`src/lib/rag/retrieval-service.ts`)

High-level API for semantic search:

```typescript
// Find similar materials
const materials = await findSimilarMaterials({
  userId: 'user-id',
  query: 'What is photosynthesis?',
  limit: 3,
  minSimilarity: 0.6,
});

// Index new material
await indexMaterial({
  userId: 'user-id',
  sourceType: 'material',
  sourceId: 'material-id',
  content: 'Photosynthesis is...',
  subject: 'biology',
});
```

**Graceful Degradation:**
When embedding service is not configured, retrieval functions return empty arrays without errors:

```typescript
if (!embedding && !isEmbeddingConfigured()) {
  logger.debug('[Retrieval] Embedding service not configured, skipping RAG');
  return [];
}
```

#### 3. Vector Store (`src/lib/rag/vector-store.ts`)

pgvector-backed storage using `ContentEmbedding` model:

```sql
-- Cosine similarity search
SELECT *, 1 - (vector <=> $1) as similarity
FROM "ContentEmbedding"
WHERE "userId" = $2
ORDER BY vector <=> $1
LIMIT 10;
```

#### 4. Semantic Chunker (`src/lib/rag/semantic-chunker.ts`)

Splits long content into embeddable chunks:

```typescript
const chunks = chunkText(content, {
  maxChunkSize: 500,  // tokens
  overlap: 50,        // overlap between chunks
});
```

### Chat API Integration

RAG context is injected in `/api/chat` when:
1. User is authenticated (`userId` exists)
2. Embedding service is configured
3. Similar materials are found (similarity > 0.6)

```typescript
// In /api/chat route.ts
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

## Consequences

### Positive
- **Better answers**: AI can reference user's own materials
- **Personalized learning**: Context from student's study history
- **Cost efficient**: Embeddings are cheap (~$0.0001 per 1K tokens)
- **Graceful degradation**: Works without Azure embedding deployment

### Negative
- **Additional Azure resource**: Requires embedding deployment
- **Storage overhead**: Embeddings use ~6KB per chunk (1536 floats)
- **Latency**: Embedding generation adds ~100-200ms per query

### Mitigations
- Embedding results are cached in `ContentEmbedding` table
- Early exit when not configured avoids unnecessary API calls
- Async indexing doesn't block user operations

## Files

- `src/lib/rag/embedding-service.ts` - Azure embedding API client
- `src/lib/rag/retrieval-service.ts` - High-level RAG API
- `src/lib/rag/vector-store.ts` - pgvector storage
- `src/lib/rag/semantic-chunker.ts` - Content chunking
- `src/app/api/chat/route.ts` - RAG injection point
- `.env.example` - Embedding deployment configuration

## References

- ADR 0028: PostgreSQL with pgvector Migration
- [Azure OpenAI Embeddings](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/embeddings)
- [pgvector](https://github.com/pgvector/pgvector)
