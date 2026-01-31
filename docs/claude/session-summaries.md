# Session Summaries

> Auto-generated conversation summaries with unified archive and dual rating system

## Quick Reference

| Key        | Value                                                                              |
| ---------- | ---------------------------------------------------------------------------------- |
| Path       | `src/lib/ai/summarize.ts`, `src/lib/conversation/`                                 |
| ADR        | 0019 (Session Summaries & Unified Archive)                                         |
| DB Tables  | `Conversation` (summary/keyFacts/topics), `StudySession`, `Material`, `ParentNote` |
| Triggers   | Explicit close ("End Session") or 15-min inactivity timeout                        |
| AI Feature | `summary` (tier-based model via ADR 0073)                                          |

## Architecture

When a conversation ends, the system generates three types of data using LLM: a **brief summary** (max 200 words), **key facts** (decisions, preferences, learned concepts), and **topics** (max 5). These are stored on the `Conversation` model. On next visit, the system fetches the last conversation's summary to generate a **contextual greeting** that references previous topics.

The **dual rating system** captures both student self-evaluation (1-5 stars + feedback) and AI Maestro evaluation (1-10 score + strengths/areas to improve). After each session, an automatic **parent note** is generated with parent-friendly language.

**Unified Material table** consolidates the deprecated `CreatedTool` table. All tools (summaries, mindmaps, flashcards) are stored in `Material` with `sessionId` and `conversationId` relations.

## Key Files

| File                                        | Purpose                             |
| ------------------------------------------- | ----------------------------------- |
| `src/lib/ai/summarize.ts`                   | LLM summarization + fact extraction |
| `src/lib/conversation/`                     | Memory loading, context building    |
| `src/lib/stores/conversation-flow-store.ts` | Zustand state for session end flow  |
| `src/app/api/conversations/[id]/end/`       | End session endpoint (planned)      |
| `src/app/api/parent-notes/`                 | Parent notes CRUD (planned)         |

## Summarization Functions

| Function                        | Output                                      |
| ------------------------------- | ------------------------------------------- |
| `generateConversationSummary()` | Brief text summary (max 200 words)          |
| `extractKeyFacts()`             | `{ decisions[], preferences[], learned[] }` |
| `extractTopics()`               | String array of discussed topics (max 5)    |
| `extractLearnings()`            | Student insights with category + confidence |
| `generateConversationTitle()`   | Short title from first user message         |

## Code Patterns

```typescript
// Generate summary when conversation ends
import {
  generateConversationSummary,
  extractKeyFacts,
  extractTopics,
} from "@/lib/ai/summarize";

const summary = await generateConversationSummary(messages, userId);
const keyFacts = await extractKeyFacts(messages, userId);
const topics = await extractTopics(messages, userId);

// Store on conversation record
await prisma.conversation.update({
  where: { id: conversationId },
  data: {
    summary,
    keyFacts: JSON.stringify(keyFacts),
    topics: JSON.stringify(topics),
  },
});

// Contextual greeting on next visit
const lastConv = await prisma.conversation.findFirst({
  where: { userId, maestroId },
  orderBy: { updatedAt: "desc" },
});
// Use lastConv.summary to personalize greeting
```

## Session End Flow

1. User clicks "End Session" or 15-min inactivity timeout fires
2. LLM generates summary, key facts, topics
3. Student rating modal shown (1-5 stars)
4. AI Maestro evaluation generated async
5. Parent note generated async
6. Conversation record updated with all data

## See Also

- `docs/adr/0019-session-summaries-unified-archive.md` -- Full design with schema changes
- `docs/claude/conversation-memory.md` -- How summaries feed into memory system
- `docs/claude/parent-dashboard.md` -- Parent notes consumption
