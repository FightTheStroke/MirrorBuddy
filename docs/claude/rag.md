# RAG (Retrieval-Augmented Generation)

> Semantic search using Azure OpenAI embeddings and pgvector for context-aware AI responses

## Quick Reference

| Key              | Value                                       |
| ---------------- | ------------------------------------------- |
| Path             | `src/lib/rag/`                              |
| ADR              | 0033 (RAG Semantic Search), 0028 (pgvector) |
| Model            | `text-embedding-ada-002` (1536 dimensions)  |
| DB Table         | `ContentEmbedding`                          |
| Extension        | pgvector (PostgreSQL)                       |
| Chat Integration | `/api/chat` route                           |

## Architecture

RAG enables AI conversations to reference user's own study materials through semantic similarity. When a user asks a question, the system: (1) generates embedding for the query using Azure OpenAI, (2) searches vector store using pgvector cosine similarity (`<=>` operator), (3) injects top matches (similarity > 0.6) into the AI's system prompt, (4) AI responds with context from student's own materials.

The system **gracefully degrades** when embedding service is not configured - all retrieval functions return empty arrays without errors.

## Components

| Component                    | Purpose                                     |
| ---------------------------- | ------------------------------------------- |
| `embedding-service.ts`       | Azure OpenAI embedding generation           |
| `retrieval-service.ts`       | High-level semantic search API              |
| `vector-store.ts`            | pgvector storage and similarity search      |
| `semantic-chunker.ts`        | Split long content into embeddable chunks   |
| `hybrid-retrieval.ts`        | Combine vector + text search                |
| `reranker.ts`                | Improve precision with multi-signal scoring |
| `privacy-aware-embedding.ts` | Anonymize before embedding (GDPR)           |

## Code Patterns

```typescript
// Check if configured
import { isEmbeddingConfigured } from "@/lib/rag";
if (!isEmbeddingConfigured()) {
  console.log("RAG disabled, skipping semantic search");
}

// Generate embedding
import { generateEmbedding } from "@/lib/rag";
const result = await generateEmbedding("What is photosynthesis?");
// result.embedding: number[] (1536 floats)
// result.tokensUsed: number (~8 tokens)

// Find similar materials
import { findSimilarMaterials } from "@/lib/rag";
const materials = await findSimilarMaterials({
  userId: "user-id",
  query: "Explain fractions",
  limit: 3,
  minSimilarity: 0.6,
});

// Index new material
import { indexMaterial } from "@/lib/rag";
await indexMaterial({
  userId: "user-id",
  sourceType: "material",
  sourceId: "material-id",
  content: "Photosynthesis is the process...",
  subject: "biology",
});
```

## Chat API Integration

```typescript
// In /api/chat route
const relevantMaterials = await findSimilarMaterials({
  userId,
  query: lastUserMessage.content,
  limit: 3,
  minSimilarity: 0.6,
});

if (relevantMaterials.length > 0) {
  const ragContext = relevantMaterials.map((m) => `- ${m.content}`).join("\n");
  enhancedSystemPrompt += `\n\n[Materiali rilevanti]\n${ragContext}`;
}
```

## Environment Variables

```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
```

## See Also

ADR 0033 (RAG Semantic Search), ADR 0028 (pgvector), [Azure OpenAI Embeddings](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/embeddings)
