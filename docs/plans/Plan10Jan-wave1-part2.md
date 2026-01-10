# Wave 1: Stabilizzazione Base (Parte 2)

**Branch**: `feature/wave1-stabilization`

> Vedi anche: [Wave 1 Parte 1](./Plan10Jan-wave1-part1.md)

---

## T1-04: Dedup auto-save con debounce

**File**: `src/components/tools/tool-result-display.tsx`
**Priorità**: P2
**Effort**: 3h

**Problema attuale**:
```typescript
// useRef guard insufficiente per rapid re-renders
const savedRef = useRef(false);
useEffect(() => {
  if (!savedRef.current && toolResult.status === 'completed') {
    savedRef.current = true;
    saveMaterial(toolResult); // Può essere chiamato multiplo
  }
}, [toolResult]);
```

**Soluzione**:
```typescript
import { useDebouncedCallback } from 'use-debounce';

// Debounce + dedup key
const savedMaterialsRef = useRef<Set<string>>(new Set());

const debouncedSave = useDebouncedCallback(
  async (result: ToolResult) => {
    const dedupKey = `${result.toolId}-${result.toolType}`;
    if (savedMaterialsRef.current.has(dedupKey)) {
      return;
    }
    savedMaterialsRef.current.add(dedupKey);

    try {
      await saveMaterial(result);
    } catch (error) {
      // Rimuovi dalla cache se fallisce per permettere retry
      savedMaterialsRef.current.delete(dedupKey);
      throw error;
    }
  },
  500, // 500ms debounce
  { leading: true, trailing: false }
);

useEffect(() => {
  if (toolResult.status === 'completed') {
    debouncedSave(toolResult);
  }
}, [toolResult.status, toolResult.toolId]);
```

**Dipendenza**: Aggiungere `use-debounce` (già in uso nel progetto? verificare)

**Acceptance Criteria**:
- [ ] Max 1 save per toolId
- [ ] Debounce 500ms su rapid updates
- [ ] Retry possibile se save fallisce
- [ ] No materiali duplicati in DB

**Thor Verification**:
```bash
npm run typecheck
# Query DB per duplicati
sqlite3 prisma/dev.db "SELECT toolId, COUNT(*) as cnt FROM Material GROUP BY toolId HAVING cnt > 1"
```

---

## T1-05: Input validation per tool handlers

**File**: `src/lib/tools/tool-executor.ts`
**Priorità**: P2
**Effort**: 3h

**Problema attuale**:
```typescript
// Nessuna validazione - crash su bad AI output
async executeToolCall(
  functionName: string,
  args: Record<string, unknown>, // Non validato!
  context: ToolContext
): Promise<ToolExecutionResult>
```

**Soluzione**:
```typescript
import { z } from 'zod';

// Schema per ogni tool
const TOOL_SCHEMAS = {
  create_mindmap: z.object({
    title: z.string().min(1).max(200),
    nodes: z.array(z.object({
      id: z.string(),
      label: z.string(),
      parentId: z.string().optional(),
    })).min(1),
  }),
  create_quiz: z.object({
    topic: z.string().min(1),
    questions: z.array(z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correctIndex: z.number().min(0).max(3),
      explanation: z.string().optional(),
    })).min(1),
  }),
  // ... altri tool
};

async executeToolCall(
  functionName: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolExecutionResult> {
  // Validazione
  const schema = TOOL_SCHEMAS[functionName];
  if (schema) {
    const result = schema.safeParse(args);
    if (!result.success) {
      logger.warn('Tool args validation failed', {
        functionName,
        errors: result.error.flatten(),
      });
      return {
        success: false,
        toolId: context.toolId ?? nanoid(),
        toolType: functionName,
        error: `Invalid arguments: ${result.error.message}`,
      };
    }
    args = result.data;
  }

  // Esecuzione normale
  const handler = this.handlers.get(functionName);
  // ...
}
```

**Acceptance Criteria**:
- [ ] Schema Zod per tutti i tool principali (mindmap, quiz, flashcard, demo, summary)
- [ ] Validation error restituito (non crash)
- [ ] Log warning su validation failure
- [ ] AI può re-tentare con args corretti

**Thor Verification**:
```bash
npm run typecheck
npm run test:unit -- --grep "tool-executor"
```
