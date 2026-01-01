# ADR 0021: Conversational Memory Injection

## Status
Proposed

## Date
2026-01-01

## Context

ADR 0019 introduced session summaries that are generated when conversations end. These summaries include:
- `summary`: Brief session recap
- `keyFacts`: JSON with decisions, preferences, learned concepts
- `topics`: JSON array of discussed topics

**Problem**: The summaries are being stored correctly in the database, but they are **never injected** into the Maestro's system prompt when a new conversation starts. This means:

1. Maestros cannot remember previous conversations
2. Students experience "amnesia" every session
3. The contextual greeting feature (ADR 0019 Section 2) works, but only for the greeting text
4. The actual conversation context is lost

### Current Flow (Broken)

```
1. User opens conversation with Melissa
2. System loads Melissa's default systemPrompt from maestri-full.ts
3. Messages sent to /api/chat with NO context about previous sessions
4. Melissa says "Non ho la possibilit di ricordare conversazioni passate"
```

### Evidence

In `conversation-flow-store.ts`, the `CharacterConversation` interface defines fields:
```typescript
previousSummary?: string;
previousKeyFacts?: string[];
previousTopics?: string[];
```

These fields are **defined but never populated**.

The `createActiveCharacter()` function (lines 309-346) sets:
```typescript
systemPrompt = maestro.systemPrompt;  // No summary injection
```

The `getLastConversationSummary()` function in `summary-generator.ts` exists but is **never called** during conversation initialization.

## Decision

Implement a complete memory injection system with three layers:

### 1. Summary Loading Layer

When starting/resuming a conversation with a Maestro:

```typescript
async function loadPreviousContext(userId: string, maestroId: string) {
  // Get last 3 conversations with this maestro
  const conversations = await prisma.conversation.findMany({
    where: { userId, characterId: maestroId, isActive: false },
    orderBy: { updatedAt: 'desc' },
    take: 3,
    select: { summary: true, keyFacts: true, topics: true, updatedAt: true }
  });

  return {
    recentSummary: conversations[0]?.summary || null,
    keyFacts: mergeKeyFacts(conversations),
    topics: mergeTopics(conversations),
    lastSessionDate: conversations[0]?.updatedAt
  };
}
```

### 2. System Prompt Enhancement Layer

Inject memory context into the Maestro's system prompt:

```typescript
function enhanceSystemPrompt(basePrompt: string, memory: ConversationMemory): string {
  if (!memory.recentSummary) return basePrompt;

  return `${basePrompt}

## Memoria delle Sessioni Precedenti

### Ultimo Incontro (${formatRelativeDate(memory.lastSessionDate)})
${memory.recentSummary}

### Fatti Chiave dello Studente
${memory.keyFacts.map(f => `- ${f}`).join('\n')}

### Argomenti Trattati
${memory.topics.join(', ')}

ISTRUZIONI: Usa queste informazioni per personalizzare l'interazione. Fai riferimento a conversazioni passate quando rilevante. Non ripetere concetti gi acquisiti.`;
}
```

### 3. API Integration Layer

Update `/api/chat` to accept and use conversation memory:

```typescript
// In chat API route
const memory = await loadPreviousContext(userId, maestroId);
const enhancedSystemPrompt = enhanceSystemPrompt(
  messages[0].content, // Original system prompt
  memory
);
messages[0].content = enhancedSystemPrompt;
```

### Token Budget Considerations

To avoid excessive token usage:

| Component | Max Tokens |
|-----------|------------|
| Base System Prompt | ~800 |
| Recent Summary | ~200 |
| Key Facts (max 5) | ~100 |
| Topics (max 10) | ~50 |
| **Total Enhanced** | **~1150** |

This is a modest increase (~350 tokens) for significant personalization gains.

## Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/lib/conversation/memory-loader.ts` | Load previous context from DB |
| `src/lib/conversation/prompt-enhancer.ts` | Inject memory into system prompt |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/stores/conversation-flow-store.ts` | Call memory loader in `createActiveCharacter()` |
| `src/components/conversation/conversation-flow.tsx` | Pass enhanced prompt to chat API |
| `src/app/api/chat/route.ts` | Accept `conversationMemory` parameter |
| `src/app/api/conversations/route.ts` | Add endpoint to get last summary |

### Database Changes

None required - existing schema supports this.

### Store Updates

```typescript
// In conversation-flow-store.ts
createActiveCharacter: async (character, type) => {
  // ... existing code ...

  // NEW: Load previous context
  const memory = await loadPreviousContext(userId, character.id);

  // NEW: Enhance system prompt with memory
  const enhancedPrompt = enhanceSystemPrompt(baseSystemPrompt, memory);

  const newChar: ActiveCharacter = {
    // ...
    systemPrompt: enhancedPrompt,
    previousSummary: memory.recentSummary,
    previousKeyFacts: memory.keyFacts,
    previousTopics: memory.topics,
  };
}
```

## Consequences

### Positive

- **Continuity**: Students feel remembered across sessions
- **Personalization**: Maestros can reference past learning
- **Efficiency**: No need to re-establish context every session
- **Educational Value**: Building on previous knowledge
- **Completion of ADR 0019**: Fulfills the original intent

### Negative

- **Token Cost**: ~350 extra tokens per conversation start
- **Cold Start**: First conversation has no context
- **Privacy**: Summary data is sent to LLM provider

### Mitigations

- Token cost is minimal compared to conversation length
- Cold start is expected behavior for new students
- Summaries contain no PII beyond learning preferences
- Parent can request data deletion per GDPR

## Testing

### Unit Tests

```typescript
describe('memory-loader', () => {
  it('returns null for user with no previous conversations');
  it('loads summary from most recent closed conversation');
  it('merges key facts from multiple conversations');
  it('limits topics to most recent 10');
  it('excludes active conversations');
});

describe('prompt-enhancer', () => {
  it('returns base prompt if no memory');
  it('appends memory section to base prompt');
  it('formats relative dates correctly');
  it('escapes special characters in summaries');
});
```

### Integration Tests

```typescript
describe('conversation memory flow', () => {
  it('injects memory when starting new conversation with known maestro');
  it('maestro references previous topics in response');
  it('memory updates after conversation ends');
});
```

### E2E Verification

1. Start conversation with Melissa, discuss "frazioni"
2. End conversation (summary generated)
3. Start NEW conversation with Melissa
4. Verify Melissa mentions frazioni without being prompted

## References

- ADR 0019: Session Summaries & Unified Archive
- ADR 0015: Database-First Architecture
- Plan: `docs/plans/in-progress/ConversationalMemoryInjection-2026-01-01.md`
