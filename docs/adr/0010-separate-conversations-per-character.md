# ADR 0010: Separate Conversations Per Character

## Status
Accepted

## Date
2025-12-30

## Context

In the Triangle of Support architecture (ADR 0003), students interact with multiple AI characters:
- **Maestri**: Subject experts (17 historical figures)
- **Coaches**: Learning method coaches (Melissa, Davide)
- **Buddies**: Peer support companions (Mario, Maria)

### The Problem

The initial implementation used a single `messages: FlowMessage[]` array for all conversations. When a student switched characters:

1. Messages from Coach Melissa appeared in Buddy Mario's chat
2. Context was confusing - "Why is my math question showing in my emotional support chat?"
3. The AI received mixed context from different conversations
4. No clear conversation history per relationship

### User Feedback

> "secondo me ognuno deve avere la sua chat separata sennò che cazzo di senso ha?"

Translation: Each character MUST have its own separate chat, otherwise what's the point?

### Options Considered

#### Option 1: Unified Flow with Handoffs
Keep single message array, show conversation as a continuous flow where handoffs are marked with system messages like "Now talking to Mario".

**Pros:**
- Simpler state management
- Shows full conversation history
- Natural flow for users who think of it as "one session"

**Cons:**
- Confusing when revisiting - user doesn't know who said what
- AI context is polluted with irrelevant messages
- "Chat room" feel instead of "relationship" feel

#### Option 2: Separate Conversations Per Character (CHOSEN)
Store conversations in `Record<characterId, CharacterConversation>` with separate message arrays.

**Pros:**
- Clear relationship per character
- Each AI gets only relevant context
- Natural "back to where we left off" experience
- Database-friendly structure (already have Conversation.maestroId)
- WhatsApp/iMessage-like UX (one chat per contact)

**Cons:**
- More complex state management
- Need to handle persistence across switches
- User might need to "catch up" when switching back

## Decision

Implement separate conversations per character using a `conversationsByCharacter` map in the Zustand store.

### Implementation Details

```typescript
interface ConversationFlowState {
  // Current display
  activeCharacter: ActiveCharacter | null;
  messages: FlowMessage[]; // Current character's messages (displayed)

  // SEPARATE CONVERSATIONS PER CHARACTER (#33)
  conversationsByCharacter: Record<string, CharacterConversation>;
}

interface CharacterConversation {
  characterId: string;
  characterType: CharacterType;
  characterName: string;
  messages: FlowMessage[];
  lastMessageAt: Date | null;
  conversationId?: string; // DB conversation ID if synced
}
```

### Key Functions

1. **`saveCurrentConversation()`**: Before switching, save current messages to `conversationsByCharacter[currentCharacterId]`

2. **`loadConversationMessages()`**: When switching, load from `conversationsByCharacter[targetCharacterId]`

3. **`addMessage()`**: Updates both `messages` and `conversationsByCharacter[currentCharacterId]` in real-time

4. **`switchToCharacter()`**:
   - Saves current conversation
   - Loads target character's conversation
   - Creates greeting if first interaction

### Persistence

Uses Zustand persist middleware:
```typescript
partialize: (state) => ({
  conversationsByCharacter: state.conversationsByCharacter,
  sessionId: state.sessionId,
  sessionStartedAt: state.sessionStartedAt,
}),
```

## Consequences

### Positive
- Clear mental model: "Mario is my friend, Melissa is my coach, Archimede is my math teacher"
- Each AI conversation has clean context
- Database sync is straightforward (one Conversation per character per session)
- Users can see "last message" preview per character (future feature)
- WhatsApp-like familiarity

### Negative
- More localStorage usage (but messages are small)
- Complexity in state management (mitigated by helper functions)
- Need to handle migration from old single-array format

## Related

- ADR 0003: Triangle of Support Architecture
- Issue #33: Conversation UX - Separate Conversations
- `src/lib/stores/conversation-flow-store.ts`: Implementation
- `e2e/mirrorbuddy.spec.ts`: E2E tests for this feature

## References

- ManifestoEdu.md: The educational vision driving character separation
- WhatsApp UX patterns: One chat per contact mental model
