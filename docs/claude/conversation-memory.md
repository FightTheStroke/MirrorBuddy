# Conversational Memory

Maestros remember previous conversations through memory injection into system prompts.

## Key Files

| Area | Files |
|------|-------|
| ADR | `docs/adr/0021-conversational-memory-injection.md` |
| Memory Loader | `src/lib/conversation/memory-loader.ts` |
| Prompt Enhancer | `src/lib/conversation/prompt-enhancer.ts` |
| API | `src/app/api/conversations/memory/route.ts` |
| Integration | `src/components/conversation/conversation-flow.tsx` |

## Architecture

### Memory Flow

```
1. User starts conversation with Maestro
2. System loads previous context (last 3 conversations)
3. Memory injected into system prompt
4. AI responds with context awareness
5. On session end, new summary generated
```

### Memory Context Structure

```typescript
interface ConversationMemory {
  recentSummary: string | null;   // Last session recap
  keyFacts: string[];              // Max 5 key facts
  topics: string[];                // Max 10 topics
  lastSessionDate: Date | null;    // For relative dating
}
```

## Components

### Memory Loader (`memory-loader.ts`)

```typescript
// Load previous context from database
export async function loadPreviousContext(
  userId: string,
  maestroId: string
): Promise<ConversationMemory>

// Merge key facts from multiple conversations
export function mergeKeyFacts(conversations: Conversation[]): string[]

// Format relative dates (oggi, ieri, X giorni fa)
export function formatRelativeDate(date: Date | null): string
```

### Prompt Enhancer (`prompt-enhancer.ts`)

```typescript
// Inject memory into system prompt
export function enhanceSystemPrompt(options: {
  basePrompt: string;
  memory: ConversationMemory;
  safetyOptions?: SafetyOptions;
}): string

// Check if prompt has memory context
export function hasMemoryContext(prompt: string): boolean

// Extract base prompt without memory
export function extractBasePrompt(enhanced: string): string
```

## System Prompt Enhancement

Memory is appended to the base system prompt:

```
[Base Maestro System Prompt]

## Memoria delle Sessioni Precedenti

### Ultimo Incontro (ieri)
Lo studente ha lavorato su frazioni e ha mostrato difficolta con i denominatori.

### Fatti Chiave dello Studente
- Preferisce esempi visivi
- Ha difficolta con frazioni
- Apprende meglio con esercizi pratici

### Argomenti Trattati
frazioni, denominatori, matematica

ISTRUZIONI: Usa queste informazioni per personalizzare l'interazione.
```

## Token Budget

| Component | Max Tokens |
|-----------|------------|
| Base System Prompt | ~800 |
| Recent Summary | ~200 |
| Key Facts (max 5) | ~100 |
| Topics (max 10) | ~50 |
| **Total Enhanced** | **~1150** |

## API Endpoint

```
GET /api/conversations/memory?maestroId=xxx

Response:
{
  "recentSummary": "...",
  "keyFacts": ["...", "..."],
  "topics": ["...", "..."],
  "lastSessionDate": "2026-01-01T10:00:00Z"
}
```

## Safety Integration

Memory injection uses `injectSafetyGuardrails()` to ensure:
- Safety rules come BEFORE memory context
- Memory cannot override safety rules
- Crisis keywords are still detected

```typescript
const enhancedPrompt = enhanceSystemPrompt({
  basePrompt,
  memory,
  safetyOptions: { role: 'maestro' }, // Injects safety guardrails
});
```

## Test Coverage

- **Unit Tests**: `src/lib/conversation/__tests__/memory-loader.test.ts` (16 tests)
- **Unit Tests**: `src/lib/conversation/__tests__/prompt-enhancer.test.ts` (12 tests)
- **Integration**: `src/lib/conversation/__tests__/memory-integration.test.ts` (15 tests)
- **Safety**: `src/lib/safety/__tests__/memory-safety.test.ts` (27 tests)

## Usage in Components

```typescript
// In conversation-flow.tsx
const memory = await loadPreviousContext(userId, maestroId);
const enhancedPrompt = enhanceSystemPrompt({
  basePrompt: maestro.systemPrompt,
  memory,
  safetyOptions: { role: 'maestro' },
});
```
