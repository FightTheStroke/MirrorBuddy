# Piano: Conversational Memory Injection

**Data**: 2026-01-01
**Branch**: `feature/conversational-memory`
**Worktree**: `/Users/roberdan/GitHub/ConvergioEdu-Memory`
**ADR**: 0020
**Status**: Pending

---

## Problema

I Maestri non ricordano le conversazioni precedenti. Quando lo studente chiede "ti ricordi cosa abbiamo fatto l'ultima volta?", il Maestro risponde "Non ho la possibilit di ricordare conversazioni passate".

Il sistema di session summaries (ADR 0019) stato implementato per:
- Generare riassunti a fine conversazione
- Salvare keyFacts e topics nel database

**MA** la parte di iniezione nel system prompt del Maestro NON stata implementata.

---

## Obiettivo

Implementare l'iniezione della memoria conversazionale nel system prompt del Maestro, in modo che possa ricordare le sessioni precedenti.

---

## Checkpoints

| Fase | Task | Status |
|------|------|--------|
| 0 | Setup worktree | |
| 1.1 | Create memory-loader.ts | |
| 1.2 | Create prompt-enhancer.ts | |
| 1.3 | Unit tests memory-loader | |
| 1.4 | Unit tests prompt-enhancer | |
| 2.1 | Add API endpoint /api/conversations/memory | |
| 2.2 | Modify conversation-flow-store | |
| 2.3 | Modify conversation-flow.tsx | |
| 3.1 | Integration test | |
| 3.2 | E2E manual test | |
| 4.1 | Thor quality review | |
| 4.2 | PR creation | |
| 4.3 | Merge to main | |
| 5 | Update docs and CHANGELOG | |

---

## Fase 0: Setup

### 0.1 Crea worktree dedicato

```bash
cd /Users/roberdan/GitHub/ConvergioEdu
git fetch origin
git checkout main
git pull origin main

# Crea branch
git branch feature/conversational-memory

# Crea worktree
git worktree add ../ConvergioEdu-Memory feature/conversational-memory

# Verifica
git worktree list
```

### 0.2 Installa dipendenze

```bash
cd ../ConvergioEdu-Memory
npm install
npx prisma generate
```

---

## Fase 1: Core Implementation

### 1.1 Create memory-loader.ts

**File**: `src/lib/conversation/memory-loader.ts`

```typescript
import { prisma } from '@/lib/db';

export interface ConversationMemory {
  recentSummary: string | null;
  keyFacts: string[];
  topics: string[];
  lastSessionDate: Date | null;
}

/**
 * Load conversation memory for a user-maestro pair.
 * Returns summaries, key facts, and topics from last 3 conversations.
 */
export async function loadConversationMemory(
  userId: string,
  maestroId: string
): Promise<ConversationMemory> {
  const conversations = await prisma.conversation.findMany({
    where: {
      userId,
      characterId: maestroId,
      isActive: false,
      summary: { not: null },
    },
    orderBy: { updatedAt: 'desc' },
    take: 3,
    select: {
      summary: true,
      keyFacts: true,
      topics: true,
      updatedAt: true,
    },
  });

  if (conversations.length === 0) {
    return {
      recentSummary: null,
      keyFacts: [],
      topics: [],
      lastSessionDate: null,
    };
  }

  // Merge key facts from all conversations (deduplicated)
  const allKeyFacts = conversations
    .flatMap((c) => {
      try {
        return JSON.parse(c.keyFacts || '[]');
      } catch {
        return [];
      }
    })
    .slice(0, 5); // Max 5 key facts

  // Merge topics from all conversations (deduplicated)
  const allTopics = [...new Set(
    conversations.flatMap((c) => {
      try {
        return JSON.parse(c.topics || '[]');
      } catch {
        return [];
      }
    })
  )].slice(0, 10); // Max 10 topics

  return {
    recentSummary: conversations[0].summary,
    keyFacts: allKeyFacts,
    topics: allTopics,
    lastSessionDate: conversations[0].updatedAt,
  };
}
```

### 1.2 Create prompt-enhancer.ts

**File**: `src/lib/conversation/prompt-enhancer.ts`

```typescript
import { ConversationMemory } from './memory-loader';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Enhance a Maestro's system prompt with conversation memory.
 * Returns the enhanced prompt, or the original if no memory exists.
 */
export function enhanceSystemPromptWithMemory(
  basePrompt: string,
  memory: ConversationMemory
): string {
  if (!memory.recentSummary) {
    return basePrompt;
  }

  const timeAgo = memory.lastSessionDate
    ? formatDistanceToNow(memory.lastSessionDate, { addSuffix: true, locale: it })
    : 'tempo fa';

  const memorySection = `

## Memoria delle Sessioni Precedenti

### Ultimo Incontro (${timeAgo})
${memory.recentSummary}

${memory.keyFacts.length > 0 ? `### Fatti Chiave dello Studente
${memory.keyFacts.map((f) => `- ${f}`).join('\n')}` : ''}

${memory.topics.length > 0 ? `### Argomenti Gi Trattati
${memory.topics.join(', ')}` : ''}

---
**ISTRUZIONI MEMORIA**: Usa queste informazioni per personalizzare l'interazione. Fai riferimento naturalmente alle conversazioni passate quando rilevante. Non ripetere concetti gi acquisiti dallo studente. Se lo studente chiede "ti ricordi...?", rispondi facendo riferimento alle informazioni sopra.
`;

  return basePrompt + memorySection;
}
```

### 1.3 Unit tests memory-loader

**File**: `src/lib/conversation/__tests__/memory-loader.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConversationMemory } from '../memory-loader';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
    },
  },
}));

describe('loadConversationMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty memory for user with no conversations', async () => {
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

    const memory = await loadConversationMemory('user-1', 'melissa');

    expect(memory).toEqual({
      recentSummary: null,
      keyFacts: [],
      topics: [],
      lastSessionDate: null,
    });
  });

  it('loads summary from most recent closed conversation', async () => {
    const mockDate = new Date('2026-01-01');
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      {
        summary: 'Abbiamo parlato di frazioni',
        keyFacts: '["preferisce esempi visivi"]',
        topics: '["frazioni", "matematica"]',
        updatedAt: mockDate,
      },
    ]);

    const memory = await loadConversationMemory('user-1', 'melissa');

    expect(memory.recentSummary).toBe('Abbiamo parlato di frazioni');
    expect(memory.lastSessionDate).toEqual(mockDate);
  });

  it('merges key facts from multiple conversations', async () => {
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      { summary: 'S1', keyFacts: '["fatto1"]', topics: '[]', updatedAt: new Date() },
      { summary: 'S2', keyFacts: '["fatto2"]', topics: '[]', updatedAt: new Date() },
    ]);

    const memory = await loadConversationMemory('user-1', 'melissa');

    expect(memory.keyFacts).toContain('fatto1');
    expect(memory.keyFacts).toContain('fatto2');
  });

  it('limits key facts to 5', async () => {
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      { summary: 'S1', keyFacts: '["f1","f2","f3","f4","f5","f6","f7"]', topics: '[]', updatedAt: new Date() },
    ]);

    const memory = await loadConversationMemory('user-1', 'melissa');

    expect(memory.keyFacts.length).toBeLessThanOrEqual(5);
  });

  it('deduplicates topics across conversations', async () => {
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      { summary: 'S1', keyFacts: '[]', topics: '["frazioni", "algebra"]', updatedAt: new Date() },
      { summary: 'S2', keyFacts: '[]', topics: '["frazioni", "geometria"]', updatedAt: new Date() },
    ]);

    const memory = await loadConversationMemory('user-1', 'melissa');

    const frazioniCount = memory.topics.filter((t) => t === 'frazioni').length;
    expect(frazioniCount).toBe(1);
  });

  it('handles malformed JSON gracefully', async () => {
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      { summary: 'S1', keyFacts: 'invalid json', topics: '["ok"]', updatedAt: new Date() },
    ]);

    const memory = await loadConversationMemory('user-1', 'melissa');

    expect(memory.keyFacts).toEqual([]);
    expect(memory.topics).toContain('ok');
  });
});
```

### 1.4 Unit tests prompt-enhancer

**File**: `src/lib/conversation/__tests__/prompt-enhancer.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { enhanceSystemPromptWithMemory } from '../prompt-enhancer';
import { ConversationMemory } from '../memory-loader';

describe('enhanceSystemPromptWithMemory', () => {
  const basePrompt = 'Sei Melissa, coach di apprendimento.';

  it('returns base prompt if no memory', () => {
    const memory: ConversationMemory = {
      recentSummary: null,
      keyFacts: [],
      topics: [],
      lastSessionDate: null,
    };

    const result = enhanceSystemPromptWithMemory(basePrompt, memory);

    expect(result).toBe(basePrompt);
  });

  it('appends memory section when summary exists', () => {
    const memory: ConversationMemory = {
      recentSummary: 'Abbiamo studiato le frazioni.',
      keyFacts: ['preferisce esempi visivi'],
      topics: ['frazioni', 'matematica'],
      lastSessionDate: new Date(),
    };

    const result = enhanceSystemPromptWithMemory(basePrompt, memory);

    expect(result).toContain(basePrompt);
    expect(result).toContain('Memoria delle Sessioni Precedenti');
    expect(result).toContain('Abbiamo studiato le frazioni');
    expect(result).toContain('preferisce esempi visivi');
    expect(result).toContain('frazioni');
  });

  it('excludes key facts section if empty', () => {
    const memory: ConversationMemory = {
      recentSummary: 'Summary',
      keyFacts: [],
      topics: ['topic1'],
      lastSessionDate: new Date(),
    };

    const result = enhanceSystemPromptWithMemory(basePrompt, memory);

    expect(result).not.toContain('Fatti Chiave');
    expect(result).toContain('Argomenti');
  });

  it('excludes topics section if empty', () => {
    const memory: ConversationMemory = {
      recentSummary: 'Summary',
      keyFacts: ['fact1'],
      topics: [],
      lastSessionDate: new Date(),
    };

    const result = enhanceSystemPromptWithMemory(basePrompt, memory);

    expect(result).toContain('Fatti Chiave');
    expect(result).not.toContain('Argomenti Gi');
  });

  it('includes instructions for memory usage', () => {
    const memory: ConversationMemory = {
      recentSummary: 'Summary',
      keyFacts: [],
      topics: [],
      lastSessionDate: new Date(),
    };

    const result = enhanceSystemPromptWithMemory(basePrompt, memory);

    expect(result).toContain('ISTRUZIONI MEMORIA');
    expect(result).toContain('ti ricordi');
  });
});
```

---

## Fase 2: Integration

### 2.1 API endpoint for conversation memory

**File**: `src/app/api/conversations/memory/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { loadConversationMemory } from '@/lib/conversation/memory-loader';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('convergio-user-id')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const maestroId = searchParams.get('maestroId');

  if (!maestroId) {
    return NextResponse.json({ error: 'maestroId required' }, { status: 400 });
  }

  const memory = await loadConversationMemory(userId, maestroId);

  return NextResponse.json(memory);
}
```

### 2.2 Modify conversation-flow-store.ts

**File**: `src/lib/stores/conversation-flow-store.ts`

Changes to `createActiveCharacter()`:

```typescript
// Add import at top
import { loadConversationMemory } from '@/lib/conversation/memory-loader';
import { enhanceSystemPromptWithMemory } from '@/lib/conversation/prompt-enhancer';

// Inside createActiveCharacter function, after getting base system prompt:

// Load previous conversation memory
const memory = await loadConversationMemory(userId, character.id);

// Enhance system prompt with memory
const enhancedSystemPrompt = enhanceSystemPromptWithMemory(systemPrompt, memory);

// Update the ActiveCharacter creation:
const newChar: ActiveCharacter = {
  // ... existing fields ...
  systemPrompt: enhancedSystemPrompt,  // Use enhanced prompt
  previousSummary: memory.recentSummary,
  previousKeyFacts: memory.keyFacts,
  previousTopics: memory.topics,
};
```

### 2.3 Ensure conversation-flow.tsx uses enhanced prompt

**File**: `src/components/conversation/conversation-flow.tsx`

The chat API call should already use `activeCharacter.systemPrompt`. Verify this is the case:

```typescript
// Around line 432-448
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: activeCharacter.systemPrompt }, // This now includes memory
      ...messages,
      { role: 'user', content: userMessage },
    ],
    maestroId: activeCharacter.id,
  }),
});
```

---

## Fase 3: Testing

### 3.1 Integration tests

**File**: `src/lib/conversation/__tests__/memory-integration.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { loadConversationMemory } from '../memory-loader';
import { enhanceSystemPromptWithMemory } from '../prompt-enhancer';
import { prisma } from '@/lib/db';

describe('Memory Integration', () => {
  // These tests require a test database
  const testUserId = 'test-user-memory';
  const testMaestroId = 'melissa';

  beforeEach(async () => {
    // Clean up test data
    await prisma.conversation.deleteMany({
      where: { userId: testUserId },
    });
  });

  it('full flow: store summary then load it', async () => {
    // Create a closed conversation with summary
    await prisma.conversation.create({
      data: {
        userId: testUserId,
        characterId: testMaestroId,
        characterType: 'maestro',
        isActive: false,
        summary: 'Abbiamo studiato le equazioni di primo grado.',
        keyFacts: '["studente preferisce metodo grafico"]',
        topics: '["equazioni", "algebra"]',
      },
    });

    // Load memory
    const memory = await loadConversationMemory(testUserId, testMaestroId);

    expect(memory.recentSummary).toBe('Abbiamo studiato le equazioni di primo grado.');
    expect(memory.keyFacts).toContain('studente preferisce metodo grafico');
    expect(memory.topics).toContain('equazioni');

    // Enhance prompt
    const basePrompt = 'Sei Melissa.';
    const enhanced = enhanceSystemPromptWithMemory(basePrompt, memory);

    expect(enhanced).toContain('Sei Melissa');
    expect(enhanced).toContain('equazioni di primo grado');
    expect(enhanced).toContain('ISTRUZIONI MEMORIA');
  });
});
```

### 3.2 Manual E2E Test Checklist

```
### Test Scenario: Memory Persistence

SETUP:
1. [ ] Clear browser data / reset test user
2. [ ] Start dev server: npm run dev

TEST STEPS:
1. [ ] Open app, start conversation with Melissa
2. [ ] Discuss a specific topic (e.g., "parliamo di frazioni")
3. [ ] Have a meaningful exchange (3-4 messages)
4. [ ] Click "End Session" or wait for inactivity timeout
5. [ ] Verify summary was generated (check DB or API)
6. [ ] Start NEW conversation with Melissa
7. [ ] Ask "ti ricordi cosa abbiamo fatto l'ultima volta?"

EXPECTED RESULT:
- [ ] Melissa references fractions in her response
- [ ] Melissa does NOT say "non ho memoria delle conversazioni"
- [ ] Response feels personalized and continuous

VERIFICATION:
- [ ] Check console for memory loading logs
- [ ] Check Network tab for /api/conversations/memory call
- [ ] Verify system prompt includes memory section
```

---

## Fase 4: Quality Assurance

### 4.1 Thor Quality Review

Before creating PR, run Thor quality guardian:

```bash
# In the worktree
npm run lint && npm run typecheck && npm run build

# Then ask Thor to review
```

Thor checklist:
- [ ] All new files have proper TypeScript types
- [ ] No console.log left in production code
- [ ] Error handling is comprehensive
- [ ] Tests cover edge cases
- [ ] No security vulnerabilities (e.g., SQL injection)
- [ ] Memory injection doesn't expose sensitive data
- [ ] Token budget is respected (~350 extra tokens)

### 4.2 Pre-PR Verification

```bash
# MUST ALL PASS
npm run lint        # 0 errors
npm run typecheck   # 0 errors
npm run build       # success
npm run test        # all tests pass
```

### 4.3 PR Creation

```bash
git add .
git commit -m "feat(memory): inject conversation summaries into Maestro context

Implements ADR 0020 to complete the session memory feature from ADR 0019.
When starting a conversation, the Maestro now receives context about
previous sessions including summaries, key facts, and topics discussed.

- Add memory-loader.ts for fetching conversation history
- Add prompt-enhancer.ts for system prompt injection
- Add /api/conversations/memory endpoint
- Update conversation-flow-store to use enhanced prompts
- Add unit and integration tests

Closes #XX (if issue exists)

Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push -u origin feature/conversational-memory

gh pr create --title "feat(memory): Conversational Memory Injection (ADR 0020)" \
  --body "## Summary
- Injects previous conversation summaries into Maestro system prompts
- Enables Maestros to remember past sessions and reference them naturally
- Completes the memory feature partially implemented in ADR 0019

## Changes
- \`src/lib/conversation/memory-loader.ts\` - Load conversation memory from DB
- \`src/lib/conversation/prompt-enhancer.ts\` - Inject memory into system prompt
- \`src/app/api/conversations/memory/route.ts\` - API endpoint for memory
- \`src/lib/stores/conversation-flow-store.ts\` - Use enhanced prompts
- Tests for all new functionality

## Test Plan
- [x] Unit tests for memory-loader
- [x] Unit tests for prompt-enhancer
- [x] Integration test for full flow
- [x] Manual E2E: verify Melissa remembers previous session

## ADR
docs/adr/0020-conversational-memory-injection.md

Generated with Claude Code"
```

---

## Fase 5: Finalization

### 5.1 Post-Merge Tasks

After PR is merged:

```bash
# Update docs
echo "- Add ADR 0020 link to plan" >> docs/plans/README.md

# Move plan to completed
mv docs/plans/in-progress/ConversationalMemoryInjection-2026-01-01.md docs/plans/completed/

# Cleanup worktree
cd /Users/roberdan/GitHub/ConvergioEdu
git worktree remove ../ConvergioEdu-Memory
git branch -d feature/conversational-memory
```

### 5.2 Update CHANGELOG

Add to CHANGELOG.md:

```markdown
## [Unreleased]

### Added
- Conversational memory injection - Maestros now remember previous sessions (ADR 0020)
- Memory loader for fetching conversation history
- System prompt enhancement with session context
- API endpoint `/api/conversations/memory`
```

### 5.3 Update Claude docs

**File**: `docs/claude/summary-tool.md` (or create new `docs/claude/conversation-memory.md`)

Document how the memory system works for future reference.

---

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/conversation/memory-loader.ts` | CREATE | Load conversation memory |
| `src/lib/conversation/prompt-enhancer.ts` | CREATE | Enhance system prompt |
| `src/lib/conversation/__tests__/memory-loader.test.ts` | CREATE | Unit tests |
| `src/lib/conversation/__tests__/prompt-enhancer.test.ts` | CREATE | Unit tests |
| `src/lib/conversation/__tests__/memory-integration.test.ts` | CREATE | Integration tests |
| `src/app/api/conversations/memory/route.ts` | CREATE | API endpoint |
| `src/lib/stores/conversation-flow-store.ts` | MODIFY | Use memory loader |
| `docs/adr/0020-conversational-memory-injection.md` | CREATE | Architecture decision |
| `CHANGELOG.md` | MODIFY | Document feature |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Token budget exceeded | Low | Medium | Limit summary length, max 5 facts |
| Memory loading slow | Low | Low | DB queries are indexed |
| Privacy concern | Medium | High | Summaries contain no PII |
| LLM ignores memory | Medium | Medium | Strong prompt instructions |

---

## Success Criteria

1. **Functional**: Melissa responds to "ti ricordi?" with actual past context
2. **Performance**: Memory loading < 100ms
3. **Quality**: All tests pass, no lint errors
4. **Documentation**: ADR 0020 accepted, CHANGELOG updated
5. **Review**: Thor quality check passed

---

**Versione**: 1.0
**Creato**: 2026-01-01
**Autore**: Claude Opus 4.5
