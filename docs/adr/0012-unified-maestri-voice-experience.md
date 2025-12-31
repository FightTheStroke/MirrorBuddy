# ADR 0012: Unified Maestri Voice Experience

## Status
Accepted

## Date
2025-12-31

## Context

The original Maestri implementation had **separate modes** for voice and chat:
- Voice mode: Full-screen video-conference style with Maestro avatar
- Chat mode: Text-based conversation similar to Coach/Buddy

### The Problem

1. **Mode switching was jarring**: Users had to explicitly choose "voice" or "chat" before starting
2. **No hybrid interaction**: Couldn't type a quick question during a voice call
3. **Inconsistent with Coach/Buddy**: CharacterChatView already had side-by-side layout
4. **Lost context on switch**: Starting voice would reset the conversation

### User Feedback

> "vorrei poter scrivere mentre parlo, tipo se devo mandare un link o fare una domanda precisa"

Translation: Users want to write while talking, like sending links or asking precise questions.

### Options Considered

#### Option 1: Keep Separate Modes
Maintain distinct voice and chat experiences.

**Pros:**
- Simpler implementation
- Full-screen voice is more immersive

**Cons:**
- Mode switching is confusing
- Can't mix voice and text
- Inconsistent with Coach/Buddy UI

#### Option 2: Unified Side-by-Side Layout (CHOSEN)
Single component with voice panel on right, chat on left.

**Pros:**
- Seamless voice/text mixing
- Voice transcripts appear in chat stream
- Consistent with Coach/Buddy pattern
- Natural "call while chatting" metaphor (like WhatsApp call overlay)

**Cons:**
- Voice panel takes screen space
- More complex component (835 lines)
- Need to handle voice transcript deduplication

## Decision

Create `MaestroSession` component with unified voice+chat experience:

```
┌─────────────────────────────────┬────────────┐
│         Chat Area               │   Voice    │
│   (flex-1, scrollable)          │   Panel    │
│                                 │  (w-64)    │
│   💬 Text message               │  [Avatar]  │
│   🔊 Voice transcript           │  [Status]  │
│   📊 Evaluation card            │  [Mute]    │
│                                 │  [Hangup]  │
├─────────────────────────────────┤            │
│   [Input] [Send] [Call]         │            │
└─────────────────────────────────┴────────────┘
```

### Key Implementation Details

#### 1. Shared VoicePanel Component
Extracted from `CharacterChatView` to `src/components/voice/voice-panel.tsx`:
- Reusable across Maestri, Coach, and Buddy
- Supports hex colors and Tailwind gradient classes
- Includes avatar, audio visualizer, mute/hangup controls

#### 2. Voice Transcript Integration
```typescript
// Voice transcripts appear in chat with indicator
if (isVoice) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <Volume2 className="w-3 h-3" />
      <span>Trascrizione vocale</span>
    </div>
  );
}
```

#### 3. Session Evaluation
Auto-generated when session ends (5+ messages OR 2+ minutes):
```typescript
const calculateScore = (messages, duration, xpEarned) => {
  const baseScore = 5;
  const messageBonus = Math.min(messages.length / 10, 2);
  const durationBonus = Math.min(duration / 600, 2);
  const xpBonus = Math.min(xpEarned / 100, 0.5);
  return Math.min(10, baseScore + messageBonus + durationBonus + xpBonus);
};
```

#### 4. XP Rewards
```typescript
const xpEarned = Math.min(100, sessionDuration * 5 + questionCount * 10);
```

### Component Structure

| File | Lines | Purpose |
|------|-------|---------|
| `maestro-session.tsx` | 835 | Main unified component |
| `voice-panel.tsx` | 197 | Shared voice controls |
| `evaluation-card.tsx` | 194 | Session evaluation display |
| `lazy.tsx` | 13 | Code-split wrapper |

## Consequences

### Positive
- Seamless voice/text hybrid experience
- Consistent UI pattern across all characters
- Voice transcripts preserved in conversation history
- Session evaluation encourages engagement
- Code reuse via shared VoicePanel

### Negative
- 835-line component (could be split further)
- Voice panel always visible during calls (no full-screen option)
- Duplicate detection for voice transcripts can miss edge cases

### Migration
- `MaestriGrid` updated to use `LazyMaestroSession` instead of separate voice/chat sessions
- Mode selection now happens WITHIN the session, not before starting

## Related

- ADR 0003: Triangle of Support Architecture
- ADR 0010: Separate Conversations Per Character
- PR #43: Unified Maestri Voice Experience
- `src/components/maestros/maestro-session.tsx`: Implementation
- `src/components/voice/voice-panel.tsx`: Shared component

## References

- CharacterChatView: Original side-by-side pattern for Coach/Buddy
- WhatsApp call overlay: Inspiration for "call while chatting" UX
- Azure OpenAI Realtime API: Voice infrastructure
