# MirrorBuddy

> AI-powered educational platform for students with learning differences

## Quick Reference

| Key        | Value                                                       |
| ---------- | ----------------------------------------------------------- |
| Stack      | Next.js 16 + Zustand + Azure OpenAI + PostgreSQL + pgvector |
| Characters | 26 Maestri + 6 Coaches + 6 Buddies (38 total)               |
| Compliance | EU AI Act, Italian Law 132/2025, GDPR, COPPA                |
| ADRs       | 0015 (State), 0028 (DB), 0033 (RAG), 0064 (Formality)       |

## Triangle of Support

Every student has access to three types of AI support:

| Role        | Count | Relationship              | Purpose                             | Data Path                    |
| ----------- | ----- | ------------------------- | ----------------------------------- | ---------------------------- |
| **Maestri** | 26    | Mentor (vertical)         | Teach subjects with passion         | `src/data/maestri/`          |
| **Coaches** | 6     | Learning coach (vertical) | Develop METHOD and autonomy         | `src/data/support-teachers/` |
| **Buddies** | 6     | Peer friend (horizontal)  | Emotional support, shared struggles | `src/data/buddy-profiles/`   |

**Maestri**: Historical/modern figures teaching specific subjects (Euclid for Math, Darwin for Biology, Curie for Chemistry, etc.)

**Coaches**: Melissa, Roberto, Chiara, Andrea, Favij, Laura — focus on learning strategies, study methods, and autonomy

**Buddies**: Mario, Noemi, Enea, Bruno, Sofia, Marta — peer support, emotional connection, shared experiences

## Character Routing

Characters are selected via `src/lib/ai/character-routing.ts`:

```typescript
// Character selection flow
1. User selects character from UI (Maestro/Coach/Buddy)
2. Router validates tier access (Trial: 3 Maestri, Base: 25, Pro: 26)
3. Character metadata loaded from data files
4. Greeting generated via character's getGreeting() function
5. Conversation context built with character's knowledge
```

## Session Flow

```
User Login → Character Selection → Conversation Start → Tool Proposals → Summary Generation
     ↓              ↓                      ↓                    ↓                ↓
  validateAuth  tierService.check    AI streaming SSE    Tool execution    Session metrics
```

## Key Files

| File                                  | Purpose                               |
| ------------------------------------- | ------------------------------------- |
| `src/data/maestri/index.ts`           | 26 Maestri definitions + knowledge    |
| `src/data/support-teachers/index.ts`  | 6 Coaches with learning methods       |
| `src/data/buddy-profiles/index.ts`    | 6 Buddies for peer support            |
| `src/lib/ai/character-routing.ts`     | Character selection logic             |
| `src/lib/greeting/templates/index.ts` | Formal vs informal address (ADR 0064) |
| `src/lib/tier/tier-service.ts`        | Character access by tier              |

## Formal Address (ADR 0064)

Pre-1900 historical figures use formal address (Lei/Sie/Vous). Modern figures use informal (tu).

Set in `FORMAL_PROFESSORS` array in `src/lib/greeting/templates/index.ts`.

## Code Patterns

### Add New Maestro (7 steps)

```typescript
// 1. Create knowledge file
src/data/maestri/new-maestro-knowledge.ts

// 2. Create maestro file with getGreeting()
src/data/maestri/new-maestro.ts

// 3. Export from index
export { newMaestro } from './new-maestro';

// 4. Add avatar
public/maestri/new-maestro.png

// 5. Update subject mapping (if new subject)
SUBJECT_NAMES in src/data/maestri/index.ts

// 6. Set formality (historical only)
FORMAL_PROFESSORS array (if pre-1900)

// 7. Test
npm run test:unit -- formality && npm run test
```

## See Also

- `.claude/rules/maestri.md` | `.claude/rules/coaches-buddies.md`
- ADR 0064 (Formality) | ADR 0031 (Character intensity dial)
