# Conversation Memory System

Maestros remember previous conversations through memory injection into system prompts and automatic session summaries. See ADR 0019 and ADR 0021 for architectural decisions.

## Overview

The system consists of three flows:

1. **Memory Injection Flow**: Previous context is loaded and injected into Maestro system prompts when starting a conversation
2. **Summary Generation Flow**: When a session ends (explicit close or 15-min timeout), conversation summaries are generated and stored
3. **Parent Notes Flow**: Parent-friendly summaries are auto-generated after each session (with GDPR consent)

## Architecture

### Memory Injection Flow

```
Start Conversation
  ↓
loadPreviousContext(userId, maestroId)
  └─ Fetch last 3 closed conversations from DB
  └─ Extract: summary, keyFacts, topics, lastSessionDate
  ↓
enhanceSystemPrompt(basePrompt, memory)
  └─ Append memory section to system prompt
  └─ Add instructions to use context
  ↓
Send enhanced prompt to Maestro
  └─ Maestro responds with context awareness
```

### Summary Generation Flow

```
User sends message
  ↓
inactivityMonitor.trackActivity() (resets 15-min timer)
  ↓
Explicit close OR 15-min timeout triggers
  ↓
endConversationWithSummary(conversationId)
  └─ Fetch all messages
  └─ Parallel generation:
     ├─ generateConversationSummary()
     ├─ extractKeyFacts() → { decisions, preferences, learned }
     ├─ extractTopics()
     └─ extractLearnings() → save to Learning table
  ↓
Update Conversation record with summary, keyFacts, topics
  └─ Set isActive = false
```

### Parent Notes Flow

```
Session ends (summary generated)
  ↓
generateAndSaveParentNote(session, evaluation)
  └─ Check hasParentConsent() (ADR 0008 - GDPR)
  └─ Generate AI parent note (brief, positive, practical)
  ↓
Save to ParentNote table
  └─ summary, highlights[], concerns?, suggestions?
  └─ Track viewedAt timestamp
```

## Key Files

| Component | Files | Purpose |
|-----------|-------|---------|
| Memory Loading | `src/lib/conversation/memory-loader.ts` | Load last 3 conversations, merge context |
| Prompt Enhancement | `src/lib/conversation/prompt-enhancer.ts` | Inject memory into system prompt |
| Summary Generation | `src/lib/conversation/summary-generator.ts` | Generate & save summaries, learnings |
| Activity Monitoring | `src/lib/conversation/inactivity-monitor.ts` | Track 15-min timeout |
| Contextual Greetings | `src/lib/conversation/contextual-greeting.ts` | Personalized greeting with context |
| Parent Notes | `src/lib/session/parent-note-generator.ts` | Generate parent-friendly notes (GDPR consent) |
| Maestro Evaluation | `src/lib/session/maestro-evaluation.ts` | AI evaluation of session |

## API Endpoints

### Get Conversation Memory
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

### List Conversations
```
GET /api/conversations?page=1&limit=20&maestroId=xxx&active=true

Response: { items: [...], pagination: {...} }
```

### Create Conversation
```
POST /api/conversations
Body: { maestroId: string, title?: string }
```

### Get Contextual Greeting
```
GET /api/conversations/greeting?maestroId=xxx&name=StudentName

Response: { greeting: string, topics: [...] }
```

## Database Models

### Conversation
```prisma
id           String    // CUID
userId       String    // Foreign key
maestroId    String    // Character ID
title        String?

// Summary system
summary      String?   // Generated summary
keyFacts     String?   // JSON: { decisions, preferences, learned }
topics       String    // JSON array

// Status
isActive     Boolean   // true = ongoing, false = ended
lastMessageAt DateTime?
isParentMode Boolean   // true = parent conversation

messages     Message[]  // Related messages

createdAt    DateTime
updatedAt    DateTime
```

### Message
```prisma
id             String
conversationId String  // Foreign key
role           String  // 'user' | 'assistant'
content        String

toolCalls      String?  // JSON
tokenCount     Int?

createdAt      DateTime
```

### ParentNote
```prisma
id          String
userId      String
sessionId   String
maestroId   String
subject     String
duration    Int        // minutes

summary     String     // Parent-friendly summary
highlights  String     // JSON array
concerns    String?    // JSON array (optional)
suggestions String?    // JSON array (optional)

generatedAt DateTime
viewedAt    DateTime?  // Null if unread
```

## Token Budget

| Component | Max Tokens |
|-----------|------------|
| Base System Prompt | ~800 |
| Recent Summary | ~200 |
| Key Facts (max 5) | ~100 |
| Topics (max 10) | ~50 |
| **Total Enhanced** | **~1150** |

## Safety Integration

Memory injection respects safety guardrails:
- Safety rules are injected BEFORE memory context
- Memory cannot override safety rules
- Crisis keywords detected regardless of memory

## Configuration

```typescript
// In memory-loader.ts
const MAX_KEY_FACTS = 5;      // Max facts to inject
const MAX_TOPICS = 10;         // Max topics to inject
const MAX_CONVERSATIONS = 3;   // Conversations to merge

// In inactivity-monitor.ts
const INACTIVITY_TIMEOUT = 15 * 60 * 1000;  // 15 minutes
```

## Testing

- **Unit**: `src/lib/conversation/__tests__/memory-*.test.ts` (27 tests)
- **Integration**: `src/lib/conversation/__tests__/memory-integration.test.ts` (15 tests)
- **Safety**: `src/lib/safety/__tests__/memory-safety.test.ts` (27 tests)

## Usage Examples

### In Components
```typescript
const memory = await loadPreviousContext(userId, maestroId);
const enhancedPrompt = enhanceSystemPrompt({
  basePrompt: maestro.systemPrompt,
  memory,
  safetyOptions: { role: 'maestro' },
});
```

### In API Routes
```typescript
// End conversation with summary
await endConversationWithSummary(conversationId);

// Generate parent note (with GDPR check)
await generateAndSaveParentNote(session, evaluation);
```

## References

- ADR 0019: Session Summaries & Unified Archive
- ADR 0021: Conversational Memory Injection
- ADR 0008: Parent Dashboard & GDPR
- ADR 0015: Database-First Architecture
