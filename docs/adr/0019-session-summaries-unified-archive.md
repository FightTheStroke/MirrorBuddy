# ADR 0019: Session Summaries & Unified Archive

## Status
Accepted

## Date
2026-01-01

## Context

The application needed improvements in three areas:

1. **Session Continuity**: When students return to a conversation, they start fresh with no context about previous sessions. This creates disconnected learning experiences.

2. **Duplicate Storage**: Tools were stored in two tables:
   - `CreatedTool`: Original table for Maestro-generated tools
   - `Material`: Newer table with enhanced features

   This duplication caused confusion and maintenance overhead.

3. **Parent Visibility**: Parents had no insight into session quality beyond basic duration metrics.

## Decision

### 1. Conversation Summaries

Generate summaries when conversations end, triggered by:
- **Explicit close**: User clicks "End Session" button
- **Inactivity timeout**: 15 minutes without messages

Summaries are generated using LLM and stored in `Conversation` table:
- `summary`: Brief session summary
- `keyFacts`: JSON with decisions, preferences, learned concepts
- `topics`: JSON array of discussed topics

### 2. Contextual Greetings

When a student reopens conversation with a character:
1. Fetch last conversation's summary for that character
2. Generate contextual greeting referencing previous topics
3. Use as first message instead of generic greeting

Example: "Ciao Marco! L'ultima volta parlavamo di frazioni... come è andata la verifica?"

### 3. Unified Material Table

Consolidate `CreatedTool` → `Material`:

| CreatedTool Field | Material Field |
|-------------------|----------------|
| `id` | `toolId` (prefixed with `migrated-`) |
| `type` | `toolType` |
| `title` | `title` |
| `content` | `content` |
| `topic` | `topic` (new field) |
| `conversationId` | `conversationId` (new field) |
| `sessionId` | `sessionId` (relation to StudySession) |
| `maestroId` | `maestroId` |
| `userRating` | `userRating` |
| `isBookmarked` | `isBookmarked` |
| `viewCount` | `viewCount` |

`CreatedTool` marked as deprecated but kept for 30-day buffer.

### 4. Dual Rating System

Each session receives two ratings:
- **Student self-evaluation**: 1-5 stars + optional feedback
- **AI Maestro evaluation**: 1-10 score + feedback + strengths/areas

Stored in `StudySession`:
```prisma
studentRating    Int?
studentFeedback  String?
maestroScore     Int?
maestroFeedback  String?
strengths        String?   // JSON array
areasToImprove   String?   // JSON array
```

### 5. Automatic Parent Notes

After EVERY session, generate a parent note containing:
- Brief summary (parent-friendly language)
- Highlights (achievements, participation)
- Concerns (if any, framed constructively)
- Suggestions (practical activities for home)

Stored in new `ParentNote` model with `viewedAt` tracking.

## Implementation

### New Files

| File | Purpose |
|------|---------|
| `src/lib/conversation/inactivity-monitor.ts` | 15-min timeout tracking |
| `src/lib/conversation/summary-generator.ts` | Generate & save summaries |
| `src/lib/conversation/contextual-greeting.ts` | Personalized greetings |
| `src/lib/session/maestro-evaluation.ts` | AI evaluation generation |
| `src/lib/session/parent-note-generator.ts` | Parent note generation |
| `src/components/session/session-rating-modal.tsx` | Student rating UI |
| `src/app/api/conversations/[id]/end/route.ts` | End session endpoint |
| `src/app/api/parent-notes/route.ts` | Parent notes CRUD |
| `scripts/migrate-created-tools.ts` | Data migration script |

### Schema Changes

**StudySession** (updated):
- Added rating fields, topics, conversationId, materials relation

**Material** (updated):
- Added sessionId relation, topic, conversationId

**ParentNote** (new):
- Parent-friendly session summaries with read tracking

**CreatedTool** (deprecated):
- Marked deprecated, kept for migration buffer

### Store Integration

`conversation-flow-store.ts` updated with:
- `endConversationWithSummary()`: Trigger summary generation
- `loadContextualGreeting()`: Fetch personalized greeting
- `showRatingModal` / `sessionSummary`: State for rating flow
- Integration with `inactivityMonitor`

## Consequences

### Positive
- **Better continuity**: Students feel remembered across sessions
- **Parent engagement**: Clear visibility into child's learning
- **Simplified storage**: Single source of truth for materials
- **Self-reflection**: Students evaluate their own learning
- **AI feedback**: Constructive evaluation from Maestro perspective

### Negative
- **LLM costs**: Additional API calls for summaries/greetings/evaluations
- **Latency**: End-of-session flow takes 2-3 seconds for generation
- **Migration complexity**: Existing CreatedTool data needs migration

### Mitigations
- Use cached summaries for greetings (no new LLM call if recent)
- Generate parent notes async after user dismisses rating modal
- 30-day buffer before removing CreatedTool table

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/conversations/[id]/end` | POST | End conversation with summary |
| `/api/conversations/[id]/end` | GET | Get conversation summary |
| `/api/parent-notes` | GET | List parent notes |
| `/api/parent-notes` | PATCH | Mark note as viewed |
| `/api/parent-notes` | DELETE | Delete note |

## References

- Plan: `docs/plans/SessionSummaryUnifiedArchive-2026-01-01.md`
- Existing summarization: `src/lib/ai/summarize.ts`
- Material API: `src/app/api/materials/route.ts`
- Progress API: `src/app/api/progress/sessions/route.ts`
