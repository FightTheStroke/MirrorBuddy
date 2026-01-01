# Session Summaries System

Documentation for Claude on the session summary and contextual greeting system.

## Overview

After each conversation session, the system:
1. Generates a summary of the discussion
2. Extracts key topics and learnings
3. Creates a parent-friendly note
4. Enables contextual greetings on next session

## Key Files

```
src/lib/conversation/
├── inactivity-monitor.ts    # 15-min timeout tracking
├── summary-generator.ts     # Summary generation
└── contextual-greeting.ts   # Personalized greetings

src/lib/session/
├── maestro-evaluation.ts    # AI evaluation
└── parent-note-generator.ts # Parent notes

src/components/session/
└── session-rating-modal.tsx # Student self-rating UI
```

## API Endpoints

### End Conversation
```
POST /api/conversations/[id]/end
Body: { userId: string, reason?: 'explicit' | 'timeout' }
Returns: { summary, topics, learningsCount }
```

### Get Summary
```
GET /api/conversations/[id]/end?userId=xxx
Returns: { summary, keyFacts, topics, closedAt }
```

### Parent Notes
```
GET /api/parent-notes?userId=xxx&limit=10
GET /api/parent-notes?userId=xxx&countOnly=true
PATCH /api/parent-notes { noteId, action: 'markViewed' }
DELETE /api/parent-notes { noteId, userId }
```

## Store Integration

The `conversation-flow-store.ts` exposes:

```typescript
// End conversation with summary
await endConversationWithSummary(conversationId, userId);

// Load contextual greeting
const greeting = await loadContextualGreeting(
  userId, characterId, studentName, maestroName
);

// State for rating modal
showRatingModal: boolean
sessionSummary: { topics, summary, duration } | null
setShowRatingModal(show: boolean)
```

## Inactivity Monitoring

The `inactivityMonitor` singleton tracks active conversations:

```typescript
import { inactivityMonitor } from '@/lib/conversation/inactivity-monitor';

// Track activity (resets 15-min timer)
inactivityMonitor.trackActivity(conversationId, userId, characterId);

// Stop tracking
inactivityMonitor.stopTracking(conversationId);

// Set timeout callback
inactivityMonitor.setTimeoutCallback(async (conversationId) => {
  await endConversationWithSummary(conversationId);
});
```

## Summary Generation Flow

1. User sends message → `trackActivity()` resets timer
2. Either explicit close OR 15-min timeout triggers
3. `endConversationWithSummary()` called
4. Parallel generation of:
   - Summary text
   - Key facts extraction
   - Topics extraction
   - Student learnings
5. Data saved to `Conversation` table
6. Rating modal shown to student
7. After rating, maestro evaluation generated
8. Parent note generated and saved

## Database Models

### StudySession (updated)
```prisma
studentRating    Int?       // 1-5 stars
studentFeedback  String?
maestroScore     Int?       // 1-10
maestroFeedback  String?
strengths        String?    // JSON array
areasToImprove   String?    // JSON array
topics           String     // JSON array
conversationId   String?
materials        Material[]
```

### Material (updated)
```prisma
sessionId      String?      // Links to StudySession
session        StudySession?
topic          String?      // From CreatedTool migration
conversationId String?      // From CreatedTool migration
```

### ParentNote (new)
```prisma
summary     String    // Parent-friendly summary
highlights  String    // JSON array of achievements
concerns    String?   // JSON array (may be empty)
suggestions String?   // JSON array of home activities
viewedAt    DateTime? // Track if parent saw it
```

## Usage Examples

### Contextual Greeting
```typescript
// In switchToCharacter or startConversation:
const greeting = await store.loadContextualGreeting(
  userId,
  characterId,
  profile.name || 'Studente',
  character.name
);

if (greeting) {
  // Use contextual greeting
  addMessage({ role: 'assistant', content: greeting });
} else {
  // Use default greeting
  addMessage({ role: 'assistant', content: character.greeting });
}
```

### End Session Flow
```typescript
// In end session button handler:
const conversationId = conversationsByCharacter[characterId]?.conversationId;
if (conversationId) {
  await endConversationWithSummary(conversationId, userId);
  // Rating modal will show automatically
}
```

### Rating Submission
```typescript
// In rating modal:
await saveStudentRating(sessionId, rating, feedback);

// Then generate maestro evaluation
const evaluation = await generateMaestroEvaluation(messages, studentProfile);
await saveSessionEvaluation(sessionId, evaluation);

// Then generate parent note
const note = await generateParentNote(sessionInfo, evaluation);
await saveParentNote(sessionInfo, note);
```
