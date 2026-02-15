# Unified Chat Integration

Wave: W4-ConversationUnification (T4-04, T4-05, T4-06)
Feature Flag: `chat_unified_view`

## Overview

This document describes the unified conversation architecture that provides a consistent interface across all character types (Maestro, Coach, Buddy).

## Components

### 1. Type Contract (T4-01 - DONE)

**File**: `src/types/unified-chat-view.ts`

Defines `UnifiedChatViewContract`:

```typescript
interface UnifiedChatViewContract {
  characterType: 'maestro' | 'coach' | 'buddy';
  characterId: string;
  voiceEnabled: boolean; // Trial=false, Base/Pro=true
  handoffEnabled: boolean; // Maestro=false, Coach/Buddy=true
  featureToggles: ChatFeatureToggles;
  messageRenderer: MessageRenderStrategy;
}
```

### 2. Shared Primitives (T4-02 - DONE)

**File**: `src/components/chat/shared/ConversationShell.tsx`

Provides common structure:

- Scrollable message list with auto-scroll
- Input area slot
- Header slot (optional)
- Loading state overlay

### 3. Configuration Factory (T4-04, T4-05)

**File**: `src/types/unified-chat-config-factory.ts`

Factory function that creates `UnifiedChatViewContract` from character info and tier:

```typescript
createUnifiedChatConfig({
  characterType: 'maestro',
  characterId: 'newton',
  tierName: 'pro',
});
```

#### Feature Toggle Matrix

| Feature      | Maestro (subject) | Coach (methods) | Buddy (support) |
| ------------ | ----------------- | --------------- | --------------- |
| tools        | base+             | base+           | false           |
| rag          | base+             | false           | false           |
| learningPath | false             | base+           | false           |
| webcam       | false             | false           | pro only        |

### 4. Adapters (T4-04, T4-05)

Thin wrappers that adapt existing components to the unified contract.

#### Maestro Adapter

**File**: `src/components/chat/adapters/maestro-conversation-adapter.tsx`

Wraps:

- `useMaestroSessionLogic` hook
- `MaestroSessionMessages` component
- `MaestroSessionInput` component

With `ConversationShell` container.

#### Coach/Buddy Adapter

**File**: `src/components/chat/adapters/character-conversation-adapter.tsx`

Wraps:

- `useCharacterChat` hook
- `MessagesList` component
- `ChatInput` component

With `ConversationShell` container.

## Handoff Integration (T4-06)

Handoff behavior is **already fully integrated** via the conversation flow store.

### Store Architecture

**File**: `src/lib/stores/conversation-flow-store/store.ts`

Combines four slices:

1. **SessionSlice**: Session lifecycle (start, end, reset)
2. **MessageSlice**: Message management (add, clear)
3. **CharacterSlice**: Character routing and switching
4. **HandoffSlice**: Handoff suggestions and acceptance

### Handoff Flow

```typescript
// 1. AI suggests handoff (from any character to coach/buddy)
useConversationFlowStore().suggestHandoff({
  reason: 'Student needs emotional support',
  toCharacter: { character: buddyProfile, type: 'buddy' },
});

// 2. User accepts
useConversationFlowStore().acceptHandoff(profile);

// 3. Store handles:
// - Save current conversation with summary (if >5 messages)
// - Switch to new character
// - Load contextual greeting based on conversation history
// - Update character history stack
```

### Handoff Methods

**File**: `src/lib/stores/conversation-flow-store/slices/character-slice.ts`

```typescript
// Generic character switch (used by handoff)
switchToCharacter(character, type, profile, reason?)

// Specific switches
switchToCoach(profile)
switchToMaestro(maestro, profile)
switchToBuddy(profile)

// Navigate back through history
goBack(profile)
```

### Character-Specific Handoff Rules

| From    | To      | Allowed | Reason                            |
| ------- | ------- | ------- | --------------------------------- |
| Maestro | Coach   | Yes     | Student needs study method help   |
| Maestro | Buddy   | Yes     | Student needs emotional support   |
| Coach   | Maestro | Yes     | Student ready for subject work    |
| Coach   | Buddy   | Yes     | Student needs emotional support   |
| Buddy   | Coach   | Yes     | Student ready for structured work |
| Buddy   | Maestro | Yes     | Student ready for subject work    |

**Note**: While all handoffs are technically allowed, `handoffEnabled` flag in `UnifiedChatViewContract` controls UI visibility:

- `maestro`: `handoffEnabled: false` (hides handoff UI)
- `coach`: `handoffEnabled: true`
- `buddy`: `handoffEnabled: true`

This follows the business rule that maestri are subject-specific experts, while coaches and buddies work across domains.

### Persistent WebRTC During Handoff

**File**: `src/lib/hooks/voice-session/switch-character.ts`

During voice calls, handoff can occur WITHOUT tearing down the WebRTC connection:

```typescript
useSwitchCharacter(maestro); // Sends session.update with new instructions
```

This keeps the audio context alive while updating the character's personality and knowledge base.

## Feature Flag Usage

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

const result = isFeatureEnabled('chat_unified_view', userId);

if (result.enabled) {
  // Use unified adapters
  return <MaestroConversationAdapter ... />;
} else {
  // Use legacy components
  return <MaestroSession ... />;
}
```

## Migration Path

1. **Phase 1 (Current)**: Flag disabled, adapters ready
   - Both systems coexist
   - No user-visible changes

2. **Phase 2**: Gradual rollout
   - Enable for Pro tier (100% of Pro users)
   - Monitor metrics (conversation length, handoff acceptance rate)

3. **Phase 3**: Full migration
   - Enable for all tiers
   - Deprecate legacy components

## Testing

### Unit Tests

- Factory function creates correct configs for each character type
- Adapters render without crashing
- Handoff flow completes successfully

### Integration Tests

- Conversation persists across character switches
- Greeting is contextual after handoff
- Voice session survives character change

### E2E Tests

- User can switch from coach to buddy and back
- Conversation history is preserved
- UI reflects correct character after handoff

## Related Files

- `src/types/unified-chat-view.ts` - Type contract
- `src/types/unified-chat-config-factory.ts` - Config factory
- `src/components/chat/shared/ConversationShell.tsx` - Shared shell
- `src/components/chat/adapters/*` - Character adapters
- `src/lib/stores/conversation-flow-store/*` - State management
- `src/lib/feature-flags/*` - Feature flag system

## ADRs

- None yet - this is foundational work for future ADR on conversation unification

## Metrics

Track via `src/lib/observability/telemetry-metrics-collector.ts`:

- `conversation.handoff.suggested` - How often AI suggests handoff
- `conversation.handoff.accepted` - User acceptance rate
- `conversation.character_switch.duration` - Time to switch characters
- `conversation.unified_view.enabled` - Flag status per user

## Future Work

- Shared MessageBubble component (T4-03, in progress)
- Voice handoff announcements (TTS says "Switching to [character]")
- Handoff suggestions based on sentiment analysis
- Multi-character conversations (group chat with maestro + coach)
