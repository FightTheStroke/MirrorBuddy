# Conversation Store Consolidation Analysis

**Wave**: W4-ConversationUnification
**Task**: T4-10
**Status**: DOCUMENTED - Dual-write risk identified, consolidation path defined

## Summary

MirrorBuddy currently has **two conversation stores** with overlapping responsibilities:

1. `conversation-store.ts` - Legacy chat history management
2. `conversation-flow-store/` - New unified flow with character routing

This creates **dual-write risk** where the same conversation state might be managed by both stores, leading to inconsistencies.

## Current Architecture

### Store 1: conversation-store.ts

**Purpose**: Chat history and message persistence
**Scope**: Maestro conversations (legacy)
**Key Responsibilities**:

- Create conversations
- Add messages
- Sync to `/api/conversations` endpoint
- Load conversation history from server
- Optimistic updates with server sync

**State Shape**:

```typescript
interface ConversationState {
  conversations: Conversation[];
  currentConversationId: string | null;
  lastSyncedAt: Date | null;
  pendingSync: boolean;
}
```

**API Endpoints**:

- `POST /api/conversations` - Create conversation
- `POST /api/conversations/:id/messages` - Add message
- `GET /api/conversations` - List conversations
- `DELETE /api/conversations/:id` - Delete conversation

### Store 2: conversation-flow-store/

**Purpose**: Unified conversation flow with character routing
**Scope**: All character types (maestro, coach, buddy)
**Key Responsibilities** (4 slices):

1. **Session Slice** (`session-slice.ts`)
   - Start/end sessions
   - Mode management (chat/voice)
   - Session reset and loading

2. **Message Slice** (`message-slice.ts`)
   - Add messages to active conversation
   - Clear messages
   - Stream message updates

3. **Character Slice** (`character-slice.ts`)
   - Character routing (maestro/coach/buddy)
   - Character switching
   - Navigation history

4. **Handoff Slice** (`handoff-slice.ts`)
   - Suggest character handoffs
   - Accept/dismiss handoff suggestions
   - Confidence scoring

**State Shape**:

```typescript
interface ConversationFlowState {
  // Session
  isActive: boolean;
  mode: FlowMode;
  // Messages
  messages: FlowMessage[];
  currentConversation: CharacterConversation | null;
  // Character
  activeCharacter: ActiveCharacter | null;
  characterHistory: ActiveCharacter[];
  // Handoff
  handoffSuggestion: HandoffSuggestion | null;
}
```

**Persistence** (`persistence.ts`):

- `createConversationInDB()` - Creates via API
- `saveMessageToDB()` - Persists messages
- `loadConversationSummariesFromDB()` - Loads summaries
- Uses same `/api/conversations` endpoints

## Dual-Write Risk Analysis

### Risk Scenario 1: Concurrent Message Creation

**Scenario**: Maestro chat adds message

- `conversation-store` calls `addMessage()` → `POST /api/conversations/:id/messages`
- `conversation-flow-store` (if active) might also call `saveMessageToDB()` → same endpoint
- **Result**: Duplicate messages or inconsistent state

### Risk Scenario 2: Conversation ID Mismatch

**Scenario**: Conversation created in one store but not synced to the other

- `conversation-store` creates conversation with temp ID → server ID
- `conversation-flow-store` doesn't know about the mapping
- **Result**: Messages sent to wrong conversation or lost

### Risk Scenario 3: State Divergence

**Scenario**: Both stores loaded from server at different times

- `conversation-store` loads conversations on mount
- `conversation-flow-store` loads independently
- One gets updated, the other stale
- **Result**: UI shows different data depending on which store component uses

## Source of Truth Decision

**Recommended**: `conversation-flow-store` should be the single source of truth.

**Rationale**:

1. **Broader scope**: Handles all character types (maestro, coach, buddy)
2. **Modern architecture**: Slice-based composition, better separation of concerns
3. **Handoff support**: Required for coach/buddy flows, not in legacy store
4. **Character routing**: Future-proof for multi-character conversations
5. **Active development**: Part of W4-ConversationUnification wave

## Consolidation Path

### Phase 1: Audit Current Usage (DONE in this task)

**Files using conversation-store.ts**:

- `src/components/chat/hooks.ts` - `useChatSession()` hook
- Any maestro session components

**Files using conversation-flow-store/**:

- `src/components/conversation/` - Coach/buddy flows
- Character handoff components
- Unified chat adapters

### Phase 2: Deprecation Strategy (Future Task)

1. **Mark legacy store as deprecated**
   - Add deprecation notice in `conversation-store.ts`
   - Log warnings when used

2. **Create migration adapter**

   ```typescript
   // Legacy compatibility layer
   export function useLegacyConversationStore() {
     const flowStore = useConversationFlowStore();
     return {
       conversations: flowStore.conversationSummaries,
       createConversation: (maestroId) => flowStore.startSession('maestro', maestroId),
       addMessage: flowStore.addMessage,
       // Map all legacy APIs to flow store
     };
   }
   ```

3. **Migrate consumers incrementally**
   - Start with low-risk components
   - A/B test with `chat_unified_view` flag
   - Monitor for regressions

### Phase 3: Remove Dual-Write (Future Task)

1. **Ensure all message writes go through flow store**
   - Audit all `POST /api/conversations/:id/messages` calls
   - Route through single store action

2. **Unified server sync**
   - Single sync mechanism in `conversation-flow-store/persistence.ts`
   - Optimistic updates with rollback

3. **State hydration**
   - Load initial state from server once
   - All subsequent updates through store actions

### Phase 4: Remove Legacy Store (Future Task)

1. **Verify zero usage**

   ```bash
   grep -r "useConversationStore" src/
   # Should only find deprecation notices
   ```

2. **Delete `conversation-store.ts`**

3. **Update imports**
   - Remove from `src/lib/stores/index.ts`
   - Update any barrel exports

## Safe Current State

### What's Safe Today

The dual-write risk is **mitigated** by current usage patterns:

1. **Maestro sessions** use `conversation-store.ts` exclusively
2. **Coach/buddy sessions** use `conversation-flow-store/` exclusively
3. **No overlap** in character type routing (yet)

### When Risk Becomes Real

Risk will materialize when:

- Unified chat view (`chat_unified_view` flag) enables maestro sessions in flow store
- Education conversations (T4-09) adopt unified shell
- Any component tries to use both stores simultaneously

## Recommendations

### Immediate (This Wave)

1. ✅ **Document the dual-write risk** (This task - DONE)
2. ✅ **Define source of truth** (`conversation-flow-store` - DONE)
3. 🔲 **Add runtime check** (Future task)
   ```typescript
   // In conversation-store.ts
   if (process.env.NODE_ENV === 'development') {
     console.warn('conversation-store is deprecated. Use conversation-flow-store.');
   }
   ```

### Next Wave (W5 or later)

1. Create migration adapter for backward compatibility
2. Gradually migrate maestro sessions to flow store
3. Remove dual-write points
4. Delete legacy store

### Engineering Hygiene

- **Never write to both stores** in the same component
- **Route all new features** through `conversation-flow-store`
- **Test with both stores disabled** to catch dependencies
- **Monitor API calls** to `/api/conversations` for duplicates

## Testing Dual-Write Risk

### Unit Test (Future)

```typescript
describe('Conversation Store Dual-Write Protection', () => {
  it('should prevent concurrent message creation in both stores', async () => {
    const legacyStore = useConversationStore.getState();
    const flowStore = useConversationFlowStore.getState();

    // Simulate concurrent message adds
    const [legacy, flow] = await Promise.all([
      legacyStore.addMessage('conv-1', { role: 'user', content: 'test' }),
      flowStore.addMessage({ role: 'user', content: 'test' }),
    ]);

    // Verify only one message was persisted
    const messages = await fetchMessagesFromAPI('conv-1');
    expect(messages).toHaveLength(1);
  });
});
```

### Integration Test (Future)

Monitor API logs for duplicate `POST /api/conversations/:id/messages` calls with same content within small time window.

## Related Files

- `src/lib/stores/conversation-store.ts` - Legacy store (IDENTIFIED)
- `src/lib/stores/conversation-flow-store/` - Unified store (SOURCE OF TRUTH)
- `src/lib/stores/conversation-flow-store/persistence.ts` - DB sync layer
- `src/components/chat/hooks.ts` - Uses legacy store
- `src/components/conversation/hooks/` - Uses flow store

## References

- Wave W4-ConversationUnification (Plan 148)
- ADR: Conversation Flow Architecture (if exists)
- Related tasks: T4-09 (Education alignment), T4-11 (Parity tests)

---

**Status**: Documentation complete. Dual-write risk is **identified and understood**. Full consolidation is **deferred to future wave** due to risk and scope. Current mitigation: strict character-type separation between stores.
