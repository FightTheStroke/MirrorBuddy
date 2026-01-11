# Wave 4: Semantic Integration

**Obiettivo**: Attivare RAG e ricerca semantica
**Effort**: 2-3 giorni
**Branch**: `feature/wave4-semantic`
**Dipende da**: Wave 2 e Wave 3 completate

---

## T4-01: Embedding on Material save

**File**: `src/lib/tools/tool-persistence.ts`, `src/lib/rag/embedding-service.ts`
**Priorità**: P1
**Effort**: 3h

```typescript
// In saveMaterial() - dopo save
async function saveMaterial(material: MaterialInput): Promise<Material> {
  const saved = await prisma.material.create({ data: material });

  // Generate embedding async (non blocca)
  generateEmbeddingAsync(saved.id, saved.content, saved.toolType);

  return saved;
}

async function generateEmbeddingAsync(
  materialId: string,
  content: string,
  toolType: string
) {
  try {
    const text = extractTextForEmbedding(content, toolType);
    const vector = await embeddingService.embed(text);

    await prisma.contentEmbedding.upsert({
      where: { sourceId: materialId },
      create: {
        sourceType: 'material',
        sourceId: materialId,
        content: text.substring(0, 1000),
        vector,
        model: 'text-embedding-3-small',
      },
      update: { vector, content: text.substring(0, 1000) },
    });
  } catch (error) {
    logger.error('Failed to generate embedding', { materialId, error });
    // Non blocca - riproverà al prossimo accesso
  }
}
```

**Acceptance Criteria**:
- [ ] Ogni nuovo Material ha embedding
- [ ] Embedding generato async (non blocca UI)
- [ ] Retry su failure
- [ ] Log errori per debug

**Thor Verification**:
```sql
-- Verifica coverage
SELECT
  (SELECT COUNT(*) FROM "ContentEmbedding" WHERE "sourceType" = 'material') as with_embedding,
  (SELECT COUNT(*) FROM "Material") as total_materials;
-- Ratio dovrebbe essere > 0.9
```

---

## T4-02: Similarity search API

**File**: `src/app/api/materials/similar/route.ts`
**Priorità**: P1
**Effort**: 2h

```typescript
// GET /api/materials/similar?id=xxx&limit=5
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const materialId = searchParams.get('id');
  const limit = parseInt(searchParams.get('limit') ?? '5');

  // Get source embedding
  const source = await prisma.contentEmbedding.findUnique({
    where: { sourceId: materialId },
  });

  if (!source) {
    return Response.json({ similar: [] });
  }

  // Vector similarity search
  const similar = await prisma.$queryRaw`
    SELECT
      m.id, m.title, m."toolType",
      1 - (ce.vector <=> ${source.vector}::vector) as similarity
    FROM "ContentEmbedding" ce
    JOIN "Material" m ON ce."sourceId" = m.id
    WHERE ce."sourceId" != ${materialId}
      AND m.status = 'active'
    ORDER BY ce.vector <=> ${source.vector}::vector
    LIMIT ${limit}
  `;

  return Response.json({ similar });
}
```

**Acceptance Criteria**:
- [ ] Ritorna top-N materiali simili
- [ ] Similarity score 0-1
- [ ] Esclude materiale sorgente
- [ ] Performance < 100ms

**Thor Verification**:
```bash
# Test API
curl "http://localhost:3000/api/materials/similar?id=xxx&limit=5"
# Deve ritornare array con similarity scores
```

---

## T4-03: "Trova simili" in UI

**File**: `src/components/education/knowledge-hub/components/material-card.tsx`
**Priorità**: P2
**Effort**: 2h

Aggiungi bottone "Trova simili" che apre panel con risultati similarity search.

**Acceptance Criteria**:
- [ ] Bottone visibile su ogni card
- [ ] Click apre panel/modal con risultati
- [ ] Risultati cliccabili per navigare
- [ ] Loading state durante ricerca

**Thor Verification**:
```bash
npm run build
# Test manuale: click "trova simili", verifica risultati
```

---

## T4-04: RAG in chat context

**File**: `src/app/api/chat/route.ts`, `src/lib/rag/retrieval-service.ts`
**Priorità**: P2
**Effort**: 4h

Quando l'utente fa una domanda, cerca materiali rilevanti e iniettali nel context.

```typescript
// In chat route
async function buildContext(
  message: string,
  userId: string
): Promise<string> {
  // Cerca materiali rilevanti
  const relevant = await retrievalService.findRelevant(message, userId, 3);

  if (relevant.length === 0) return '';

  return `
Lo studente ha questi materiali rilevanti:
${relevant.map(m => `- ${m.title} (${m.toolType}): ${m.summary}`).join('\n')}

Usa queste informazioni per personalizzare la risposta.
`;
}
```

**Acceptance Criteria**:
- [ ] Materiali rilevanti iniettati in system prompt
- [ ] Max 3 materiali per non gonfiare context
- [ ] Solo materiali dell'utente corrente
- [ ] Maestro può riferirsi a "la tua mappa su X"

**Thor Verification**:
```bash
# Test: fare domanda su argomento con materiali esistenti
# Verificare che risposta menzioni i materiali
```
