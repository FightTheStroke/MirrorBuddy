# ADR 0035: Voice Session Context Continuity

## Status

Accepted

## Date

2026-01-11

## Context

When users load a previous conversation from history and then start a voice call, the AI had no context of the previous chat messages. This broke the user experience because:

1. Users expected to continue where they left off
2. The AI would greet them again as if it was a new conversation
3. References to previous topics were lost

This was inconsistent with how chat mode worked, where loaded messages were sent to the API and the AI had full context.

## Decision

We implemented conversation context injection for voice sessions:

### Technical Approach

1. **Extended `ConnectionInfo` type** with optional `initialMessages` array
2. **Added `initialMessagesRef`** to voice session refs for storing messages during connection
3. **Modified `useSendSessionConfig`** to inject messages after `session.update` is sent
4. **Updated UI hooks** to pass current messages when activating voice

### Implementation Details

When voice is activated:
1. Current chat messages are converted to `{ role, content }` format
2. Messages are passed via `connectionInfo.initialMessages`
3. After Azure `session.update`, messages are injected as `conversation.item.create`
4. Greeting is skipped if there are initial messages (greetingSentRef = true)

### Files Modified

- `src/lib/hooks/voice-session/types.ts` - Added `initialMessages` to ConnectionInfo
- `src/lib/hooks/voice-session/connection-types.ts` - Added `initialMessagesRef`
- `src/lib/hooks/voice-session/use-voice-session-refs.ts` - Added ref implementation
- `src/lib/hooks/voice-session/connection.ts` - Store messages in ref on connect
- `src/lib/hooks/voice-session/session-config.ts` - Inject messages after session.update
- `src/lib/hooks/voice-session/use-voice-session.ts` - Pass refs to config
- `src/components/maestros/use-maestro-voice-connection.ts` - Accept and pass messages
- `src/components/maestros/use-maestro-session-logic.ts` - Pass messages to voice
- `src/components/conversation/character-chat-view/hooks/use-character-chat/index.ts` - Same

## Consequences

### Positive

- Voice sessions now have full conversation context like chat
- Users can seamlessly switch between chat and voice within same conversation
- Loading old conversations and starting voice works as expected
- Consistent experience with ChatGPT/Claude-like conversation continuity

### Negative

- Slightly larger payload when starting voice with many messages
- Need to filter/truncate messages if conversation is very long (future optimization)

### Neutral

- Azure Realtime API supports this via `conversation.item.create` messages
- No changes to database schema required
- Works with both WebSocket and WebRTC transports

## Related

- ADR 0034: WebRTC Migration (voice infrastructure)
- ADR 0033: RAG Semantic Search (conversation memory)
- Per-character conversation history sidebar (parallel feature)
